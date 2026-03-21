from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class ShoppingItem(BaseModel):
    name: str
    quantity: int = 1
    unit: Optional[str] = None
    notes: Optional[str] = None

class ShoppingListCreate(BaseModel):
    name: str
    items: List[ShoppingItem]

class ShoppingListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    items: List[ShoppingItem]
    created_at: str
    updated_at: str

class StoreURL(BaseModel):
    name: str
    url: str
    search_path: Optional[str] = "/search?q={query}"

class ScrapeJobCreate(BaseModel):
    list_id: str
    stores: List[StoreURL]

class ProductMatch(BaseModel):
    store: str
    product_name: str
    price: float
    size: Optional[str] = None
    unit_price: Optional[str] = None
    available: bool = True
    url: Optional[str] = None

class ItemBreakdown(BaseModel):
    item: str
    matches: List[ProductMatch]
    best_option: Optional[ProductMatch] = None

class StoreTotal(BaseModel):
    store: str
    total: float
    items_found: int
    items_missing: int

class HybridStrategy(BaseModel):
    enabled: bool
    total_cost: float
    savings: float
    note: str
    purchases: List[Dict[str, Any]]

class ComparisonSummary(BaseModel):
    cheapest_store: Optional[str] = None
    total_cost: float
    savings_vs_next: float

class ScrapeJobResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    list_id: str
    status: str
    progress: int
    logs: List[str]
    stores: List[Dict[str, str]]
    created_at: str
    results: Optional[Dict[str, Any]] = None

class ComparisonResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    job_id: str
    list_id: str
    summary: ComparisonSummary
    store_comparison: List[StoreTotal]
    item_breakdown: List[ItemBreakdown]
    hybrid_strategy: Optional[HybridStrategy] = None
    created_at: str

# ==================== SHOPPING LISTS ====================

@api_router.post("/lists", response_model=ShoppingListResponse)
async def create_shopping_list(data: ShoppingListCreate):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "items": [item.model_dump() for item in data.items],
        "created_at": now,
        "updated_at": now
    }
    await db.shopping_lists.insert_one(doc)
    return ShoppingListResponse(**doc)

@api_router.get("/lists", response_model=List[ShoppingListResponse])
async def get_shopping_lists():
    lists = await db.shopping_lists.find({}, {"_id": 0}).to_list(100)
    return [ShoppingListResponse(**lst) for lst in lists]

@api_router.get("/lists/{list_id}", response_model=ShoppingListResponse)
async def get_shopping_list(list_id: str):
    lst = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    if not lst:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return ShoppingListResponse(**lst)

@api_router.put("/lists/{list_id}", response_model=ShoppingListResponse)
async def update_shopping_list(list_id: str, data: ShoppingListCreate):
    now = datetime.now(timezone.utc).isoformat()
    update = {
        "name": data.name,
        "items": [item.model_dump() for item in data.items],
        "updated_at": now
    }
    result = await db.shopping_lists.update_one({"id": list_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    lst = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    return ShoppingListResponse(**lst)

@api_router.delete("/lists/{list_id}")
async def delete_shopping_list(list_id: str):
    result = await db.shopping_lists.delete_one({"id": list_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return {"message": "Shopping list deleted"}

# ==================== SCRAPING SERVICE ====================

from services.scraper import ScraperService
from services.ai_analyzer import AIAnalyzerService

scraper_service = ScraperService()
ai_service = AIAnalyzerService()

async def run_scrape_job(job_id: str, list_id: str, stores: List[Dict[str, str]]):
    """Background task to run the scraping job"""
    try:
        # Get shopping list
        shopping_list = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
        if not shopping_list:
            await update_job_status(job_id, "failed", 0, ["Shopping list not found"])
            return
        
        items = [item["name"] for item in shopping_list["items"]]
        await update_job_log(job_id, f"Starting scrape for {len(items)} items across {len(stores)} stores")
        
        # Step 1: Query Expansion
        await update_job_log(job_id, "Step 1: Expanding queries with AI...")
        expanded_queries = await ai_service.expand_queries(items)
        await update_job_log(job_id, f"Generated {sum(len(v) for v in expanded_queries.values())} search variants")
        await update_job_status(job_id, "running", 10)
        
        all_results = {}
        store_count = len(stores)
        
        # Step 2: Multi-Retailer Search
        await update_job_log(job_id, "Step 2: Searching retailers...")
        for idx, store in enumerate(stores):
            store_name = store["name"]
            store_url = store["url"]
            search_path = store.get("search_path", "/search?q={query}")
            
            await update_job_log(job_id, f"Scraping {store_name}...")
            
            try:
                store_results = await scraper_service.scrape_store(
                    store_name, store_url, search_path, expanded_queries, job_id
                )
                all_results[store_name] = store_results
                await update_job_log(job_id, f"Found {len(store_results)} products from {store_name}")
            except Exception as e:
                await update_job_log(job_id, f"Error scraping {store_name}: {str(e)}")
                all_results[store_name] = []
            
            progress = 10 + int((idx + 1) / store_count * 40)
            await update_job_status(job_id, "running", progress)
        
        # Step 3: Product Matching with AI
        await update_job_log(job_id, "Step 3: Matching products across stores with AI...")
        await update_job_status(job_id, "running", 60)
        
        matched_products = await ai_service.match_products(items, all_results)
        await update_job_log(job_id, f"Matched {len(matched_products)} items")
        await update_job_status(job_id, "running", 75)
        
        # Step 4: Optimization
        await update_job_log(job_id, "Step 4: Computing optimal shopping strategy...")
        comparison_result = await ai_service.compute_optimization(matched_products, stores)
        await update_job_status(job_id, "running", 90)
        
        # Step 5: Save results
        await update_job_log(job_id, "Step 5: Saving results...")
        result_doc = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "list_id": list_id,
            "summary": comparison_result["summary"],
            "store_comparison": comparison_result["store_comparison"],
            "item_breakdown": comparison_result["item_breakdown"],
            "hybrid_strategy": comparison_result.get("hybrid_strategy"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.comparison_results.insert_one(result_doc)
        
        # Update job with results
        await db.scrape_jobs.update_one(
            {"id": job_id},
            {"$set": {"results": result_doc, "status": "completed", "progress": 100}}
        )
        await update_job_log(job_id, "Scraping completed successfully!")
        
    except Exception as e:
        logger.error(f"Scrape job failed: {str(e)}")
        await update_job_status(job_id, "failed", 0)
        await update_job_log(job_id, f"Job failed: {str(e)}")

async def update_job_status(job_id: str, status: str, progress: int, logs: List[str] = None):
    update = {"status": status, "progress": progress}
    if logs:
        update["logs"] = logs
    await db.scrape_jobs.update_one({"id": job_id}, {"$set": update})

async def update_job_log(job_id: str, log: str):
    timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {log}"
    await db.scrape_jobs.update_one({"id": job_id}, {"$push": {"logs": log_entry}})

@api_router.post("/scrape", response_model=ScrapeJobResponse)
async def start_scrape_job(data: ScrapeJobCreate, background_tasks: BackgroundTasks):
    # Verify list exists
    shopping_list = await db.shopping_lists.find_one({"id": data.list_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    job_doc = {
        "id": job_id,
        "list_id": data.list_id,
        "status": "pending",
        "progress": 0,
        "logs": [f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Job created"],
        "stores": [s.model_dump() for s in data.stores],
        "created_at": now,
        "results": None
    }
    await db.scrape_jobs.insert_one(job_doc)
    
    # Start background task
    stores_dict = [{"name": s.name, "url": s.url, "search_path": s.search_path} for s in data.stores]
    background_tasks.add_task(run_scrape_job, job_id, data.list_id, stores_dict)
    
    return ScrapeJobResponse(**job_doc)

@api_router.get("/scrape/{job_id}", response_model=ScrapeJobResponse)
async def get_scrape_job(job_id: str):
    job = await db.scrape_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Scrape job not found")
    return ScrapeJobResponse(**job)

@api_router.get("/scrape", response_model=List[ScrapeJobResponse])
async def get_scrape_jobs():
    jobs = await db.scrape_jobs.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [ScrapeJobResponse(**job) for job in jobs]

# ==================== COMPARISON RESULTS ====================

@api_router.get("/compare/{job_id}", response_model=ComparisonResult)
async def get_comparison_result(job_id: str):
    result = await db.comparison_results.find_one({"job_id": job_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Comparison result not found")
    return ComparisonResult(**result)

@api_router.get("/compare", response_model=List[ComparisonResult])
async def get_all_comparisons():
    results = await db.comparison_results.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [ComparisonResult(**r) for r in results]

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Grocery Hunt AI API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "capsolver_configured": bool(os.environ.get("CAPSOLVER_API_KEY"))}

# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
