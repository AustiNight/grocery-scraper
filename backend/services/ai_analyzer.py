import os
import logging
import re
from typing import Dict, List, Any, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

class AIAnalyzerService:
    """AI-powered analysis using Claude Opus 4.5"""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    
    def _get_chat(self, session_id: str, system_message: str) -> LlmChat:
        """Create a new chat instance"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        )
        chat.with_model("anthropic", "claude-opus-4-5-20251101")
        return chat
    
    async def expand_queries(self, items: List[str]) -> Dict[str, List[str]]:
        """Step 1: Query Expansion - Generate search variants for each item"""
        expanded = {}
        
        try:
            chat = self._get_chat(
                "query-expansion",
                """You are a grocery shopping assistant. For each grocery item, generate search variants including:
                - Common brand names
                - Size variations (whole, 2%, skim for milk etc.)
                - Store brand vs name brand options
                - Common synonyms
                
                Return ONLY a JSON object with item names as keys and arrays of search variants as values.
                Keep variants concise (2-4 words max each).
                Generate 3-5 variants per item."""
            )
            
            message = UserMessage(text=f"Generate search variants for these grocery items: {', '.join(items)}")
            response = await chat.send_message(message)
            
            # Parse JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                import json
                expanded = json.loads(json_match.group())
            else:
                # Fallback: use original items
                expanded = {item: [item] for item in items}
                
        except Exception as e:
            logger.error(f"Error expanding queries: {str(e)}")
            # Fallback to original items
            expanded = {item: [item] for item in items}
        
        # Ensure all original items are included
        for item in items:
            if item not in expanded:
                expanded[item] = [item]
            elif item not in expanded[item]:
                expanded[item].insert(0, item)
        
        return expanded
    
    async def match_products(
        self, 
        original_items: List[str], 
        store_results: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Step 3: Product Matching - Match products across stores"""
        matched = []
        
        try:
            # Prepare data for AI matching
            stores_summary = {}
            for store, products in store_results.items():
                stores_summary[store] = [
                    {
                        "name": p.get("product_name", ""),
                        "price": p.get("price"),
                        "size": p.get("size"),
                        "search_term": p.get("search_term")
                    }
                    for p in products[:20]  # Limit products per store for context
                ]
            
            chat = self._get_chat(
                "product-matching",
                """You are a grocery price comparison expert. Match products across different stores.
                For each original shopping list item, find the best matching product from each store.
                Consider:
                - Product name similarity
                - Size/quantity (normalize to unit pricing when possible)
                - Whether it's the same type of product
                
                Return ONLY a JSON array with this structure:
                [
                    {
                        "item": "original item name",
                        "matches": [
                            {
                                "store": "store name",
                                "product_name": "matched product name",
                                "price": 0.00,
                                "size": "size if available",
                                "unit_price": "$/oz or similar",
                                "confidence": "high/medium/low"
                            }
                        ]
                    }
                ]"""
            )
            
            import json
            message = UserMessage(
                text=f"""Match these shopping items: {original_items}
                
                Available products by store:
                {json.dumps(stores_summary, indent=2)}
                
                Return the matching JSON."""
            )
            
            response = await chat.send_message(message)
            
            # Parse JSON from response
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                matched = json.loads(json_match.group())
            
        except Exception as e:
            logger.error(f"Error matching products: {str(e)}")
            # Fallback: basic matching by search term
            matched = self._basic_matching(original_items, store_results)
        
        return matched
    
    def _basic_matching(
        self, 
        items: List[str], 
        store_results: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Basic matching fallback without AI"""
        matched = []
        
        for item in items:
            item_matches = {"item": item, "matches": []}
            
            for store, products in store_results.items():
                # Find products that match the search term
                matching = [p for p in products if p.get("search_term", "").lower() == item.lower()]
                if matching:
                    # Pick the first (or cheapest) match
                    best = min(matching, key=lambda x: x.get("price") or float('inf'))
                    item_matches["matches"].append({
                        "store": store,
                        "product_name": best.get("product_name", ""),
                        "price": best.get("price"),
                        "size": best.get("size"),
                        "unit_price": best.get("unit_price"),
                        "url": best.get("url")
                    })
            
            matched.append(item_matches)
        
        return matched
    
    async def compute_optimization(
        self, 
        matched_products: List[Dict[str, Any]],
        stores: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Step 4: Optimization - Compute optimal shopping strategy"""
        store_names = [s["name"] for s in stores]
        
        # Initialize store totals
        store_totals = {name: {"total": 0.0, "items_found": 0, "items_missing": 0} for name in store_names}
        item_breakdown = []
        hybrid_purchases = []
        
        for item_data in matched_products:
            item_name = item_data.get("item", "")
            matches = item_data.get("matches", [])
            
            breakdown = {
                "item": item_name,
                "matches": [],
                "best_option": None
            }
            
            best_price = float('inf')
            best_match = None
            
            for match in matches:
                store = match.get("store", "")
                price = match.get("price")
                
                if price is not None:
                    match_data = {
                        "store": store,
                        "product_name": match.get("product_name", ""),
                        "price": price,
                        "size": match.get("size"),
                        "unit_price": match.get("unit_price"),
                        "available": True,
                        "url": match.get("url")
                    }
                    breakdown["matches"].append(match_data)
                    
                    if store in store_totals:
                        store_totals[store]["total"] += price
                        store_totals[store]["items_found"] += 1
                    
                    if price < best_price:
                        best_price = price
                        best_match = match_data
            
            if best_match:
                breakdown["best_option"] = best_match
                hybrid_purchases.append({
                    "item": item_name,
                    "store": best_match["store"],
                    "price": best_match["price"]
                })
            
            # Track missing items per store
            found_stores = {m.get("store") for m in matches if m.get("price") is not None}
            for store in store_names:
                if store not in found_stores:
                    store_totals[store]["items_missing"] += 1
            
            item_breakdown.append(breakdown)
        
        # Build store comparison list
        store_comparison = [
            {
                "store": name,
                "total": round(data["total"], 2),
                "items_found": data["items_found"],
                "items_missing": data["items_missing"]
            }
            for name, data in store_totals.items()
        ]
        
        # Sort by total (cheapest first)
        store_comparison.sort(key=lambda x: (x["items_missing"], x["total"]))
        
        # Find cheapest store (with most items found)
        valid_stores = [s for s in store_comparison if s["items_found"] > 0]
        cheapest_store = valid_stores[0]["store"] if valid_stores else None
        cheapest_total = valid_stores[0]["total"] if valid_stores else 0.0
        
        # Calculate savings vs next best
        savings_vs_next = 0.0
        if len(valid_stores) > 1:
            savings_vs_next = round(valid_stores[1]["total"] - cheapest_total, 2)
        
        # Calculate hybrid strategy
        hybrid_total = sum(p["price"] for p in hybrid_purchases)
        hybrid_savings = round(cheapest_total - hybrid_total, 2) if cheapest_total > hybrid_total else 0.0
        
        # Group hybrid purchases by store
        hybrid_by_store = {}
        for p in hybrid_purchases:
            store = p["store"]
            if store not in hybrid_by_store:
                hybrid_by_store[store] = []
            hybrid_by_store[store].append(p["item"])
        
        hybrid_strategy = None
        if len(hybrid_by_store) > 1 and hybrid_savings > 0:
            hybrid_strategy = {
                "enabled": True,
                "total_cost": round(hybrid_total, 2),
                "savings": hybrid_savings,
                "note": f"Buy items across {len(hybrid_by_store)} stores for maximum savings",
                "purchases": [
                    {"store": store, "items": items}
                    for store, items in hybrid_by_store.items()
                ]
            }
        
        return {
            "summary": {
                "cheapest_store": cheapest_store,
                "total_cost": cheapest_total,
                "savings_vs_next": savings_vs_next
            },
            "store_comparison": store_comparison,
            "item_breakdown": item_breakdown,
            "hybrid_strategy": hybrid_strategy
        }
