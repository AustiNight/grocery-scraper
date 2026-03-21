import os
import asyncio
import aiohttp
import logging
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, quote_plus
import re
import json

logger = logging.getLogger(__name__)

class CaptchaSolver:
    """CapSolver integration for solving CAPTCHAs"""
    
    def __init__(self):
        self.api_key = os.environ.get("CAPSOLVER_API_KEY", "")
        self.base_url = "https://api.capsolver.com"
    
    async def solve_recaptcha_v2(self, site_url: str, site_key: str) -> Optional[str]:
        """Solve reCAPTCHA v2"""
        if not self.api_key:
            logger.warning("CapSolver API key not configured")
            return None
        
        async with aiohttp.ClientSession() as session:
            # Create task
            payload = {
                "clientKey": self.api_key,
                "task": {
                    "type": "ReCaptchaV2TaskProxyless",
                    "websiteURL": site_url,
                    "websiteKey": site_key
                }
            }
            
            async with session.post(f"{self.base_url}/createTask", json=payload) as resp:
                result = await resp.json()
                if result.get("errorId", 0) != 0:
                    logger.error(f"CapSolver error: {result.get('errorDescription')}")
                    return None
                task_id = result.get("taskId")
            
            # Poll for result
            for _ in range(60):
                await asyncio.sleep(3)
                async with session.post(f"{self.base_url}/getTaskResult", json={
                    "clientKey": self.api_key,
                    "taskId": task_id
                }) as resp:
                    result = await resp.json()
                    if result.get("status") == "ready":
                        return result.get("solution", {}).get("gRecaptchaResponse")
                    elif result.get("errorId", 0) != 0:
                        logger.error(f"CapSolver error: {result.get('errorDescription')}")
                        return None
            
            return None
    
    async def solve_turnstile(self, site_url: str, site_key: str) -> Optional[str]:
        """Solve Cloudflare Turnstile"""
        if not self.api_key:
            logger.warning("CapSolver API key not configured")
            return None
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "clientKey": self.api_key,
                "task": {
                    "type": "AntiTurnstileTaskProxyLess",
                    "websiteURL": site_url,
                    "websiteKey": site_key
                }
            }
            
            async with session.post(f"{self.base_url}/createTask", json=payload) as resp:
                result = await resp.json()
                if result.get("errorId", 0) != 0:
                    logger.error(f"CapSolver error: {result.get('errorDescription')}")
                    return None
                task_id = result.get("taskId")
            
            for _ in range(60):
                await asyncio.sleep(3)
                async with session.post(f"{self.base_url}/getTaskResult", json={
                    "clientKey": self.api_key,
                    "taskId": task_id
                }) as resp:
                    result = await resp.json()
                    if result.get("status") == "ready":
                        return result.get("solution", {}).get("token")
                    elif result.get("errorId", 0) != 0:
                        return None
            
            return None


class ScraperService:
    """Web scraper for grocery store websites"""
    
    def __init__(self):
        self.captcha_solver = CaptchaSolver()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
        # Price patterns
        self.price_patterns = [
            r'\$\s*(\d+(?:\.\d{2})?)',
            r'(\d+(?:\.\d{2})?)\s*(?:USD|usd)',
            r'Price[:\s]*\$?\s*(\d+(?:\.\d{2})?)',
            r'(\d+)\.(\d{2})',
        ]
        # Unit price patterns
        self.unit_price_patterns = [
            r'\$?\s*(\d+(?:\.\d+)?)\s*/\s*(?:oz|lb|ea|ct|kg|g|ml|l|unit)',
            r'(\d+(?:\.\d+)?)\s*(?:¢|cents?)\s*/\s*(?:oz|lb|ea)',
        ]
    
    async def scrape_store(
        self, 
        store_name: str, 
        base_url: str, 
        search_path: str,
        queries: Dict[str, List[str]],
        job_id: str
    ) -> List[Dict[str, Any]]:
        """Scrape a store for all items in the query list"""
        results = []
        
        async with aiohttp.ClientSession(headers=self.headers) as session:
            for item_name, variants in queries.items():
                # Try each variant until we find results
                for variant in variants[:3]:  # Limit to 3 variants per item
                    try:
                        search_url = base_url.rstrip('/') + search_path.replace("{query}", quote_plus(variant))
                        products = await self._scrape_search_page(session, search_url, item_name, store_name, base_url)
                        if products:
                            results.extend(products)
                            break  # Found products, move to next item
                    except Exception as e:
                        logger.error(f"Error scraping {store_name} for {variant}: {str(e)}")
                        continue
                
                # Small delay between items to avoid rate limiting
                await asyncio.sleep(0.5)
        
        return results
    
    async def _scrape_search_page(
        self, 
        session: aiohttp.ClientSession, 
        url: str,
        item_name: str,
        store_name: str,
        base_url: str
    ) -> List[Dict[str, Any]]:
        """Scrape a search results page"""
        products = []
        
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 403:
                    # Might need captcha solving
                    logger.info(f"Got 403 for {url}, attempting captcha solve...")
                    # For now, we'll skip - real captcha solving requires page interaction
                    return products
                
                if response.status != 200:
                    logger.warning(f"Got status {response.status} for {url}")
                    return products
                
                html = await response.text()
                
                # Check for captcha challenges
                if self._detect_captcha(html):
                    logger.info(f"Captcha detected on {url}")
                    # Real implementation would solve captcha here
                    return products
                
                # Parse the page
                soup = BeautifulSoup(html, 'lxml')
                
                # Try to extract JSON-LD data first
                products = self._extract_json_ld(soup, item_name, store_name, base_url)
                
                # If no JSON-LD, try DOM extraction
                if not products:
                    products = self._extract_from_dom(soup, item_name, store_name, base_url)
                
        except asyncio.TimeoutError:
            logger.warning(f"Timeout scraping {url}")
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
        
        return products
    
    def _detect_captcha(self, html: str) -> bool:
        """Detect if page has a captcha challenge"""
        captcha_indicators = [
            'g-recaptcha',
            'cf-turnstile',
            'hcaptcha',
            'captcha-container',
            'challenge-running',
            'Just a moment...',
            'Checking your browser',
        ]
        return any(indicator.lower() in html.lower() for indicator in captcha_indicators)
    
    def _extract_json_ld(self, soup: BeautifulSoup, item_name: str, store_name: str, base_url: str) -> List[Dict[str, Any]]:
        """Extract product data from JSON-LD scripts"""
        products = []
        
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                products.extend(self._parse_json_ld_products(data, item_name, store_name, base_url))
            except (json.JSONDecodeError, TypeError):
                continue
        
        return products
    
    def _parse_json_ld_products(self, data: Any, item_name: str, store_name: str, base_url: str) -> List[Dict[str, Any]]:
        """Parse JSON-LD data for products"""
        products = []
        
        if isinstance(data, list):
            for item in data:
                products.extend(self._parse_json_ld_products(item, item_name, store_name, base_url))
        elif isinstance(data, dict):
            if data.get('@type') == 'Product':
                product = self._extract_product_from_json(data, item_name, store_name, base_url)
                if product:
                    products.append(product)
            elif 'itemListElement' in data:
                for item in data.get('itemListElement', []):
                    if 'item' in item:
                        product = self._extract_product_from_json(item['item'], item_name, store_name, base_url)
                        if product:
                            products.append(product)
        
        return products
    
    def _extract_product_from_json(self, data: Dict, item_name: str, store_name: str, base_url: str) -> Optional[Dict[str, Any]]:
        """Extract product info from JSON-LD product data"""
        name = data.get('name') or data.get('title', '')
        if not name:
            return None
        
        price = None
        if 'offers' in data:
            offers = data['offers']
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            price = offers.get('price') or offers.get('lowPrice')
        
        if not price:
            price = data.get('price')
        
        url = data.get('url', '')
        if url and not url.startswith('http'):
            url = urljoin(base_url, url)
        
        return {
            "search_term": item_name,
            "store": store_name,
            "product_name": name,
            "price": float(price) if price else None,
            "size": data.get('size') or self._extract_size(name),
            "unit_price": None,
            "available": True,
            "url": url
        }
    
    def _extract_from_dom(self, soup: BeautifulSoup, item_name: str, store_name: str, base_url: str) -> List[Dict[str, Any]]:
        """Extract products from DOM using heuristics"""
        products = []
        
        # Common product container patterns
        selectors = [
            'div[class*="product"]',
            'li[class*="product"]',
            'article[class*="product"]',
            'div[class*="item"]',
            'div[data-product]',
            '[class*="search-result"]',
            '[class*="productCard"]',
        ]
        
        for selector in selectors:
            try:
                for container in soup.select(selector)[:10]:  # Limit to 10 products
                    product = self._extract_product_from_element(container, item_name, store_name, base_url)
                    if product and product.get('price'):
                        products.append(product)
            except Exception:
                continue
        
        return products
    
    def _extract_product_from_element(self, element, item_name: str, store_name: str, base_url: str) -> Optional[Dict[str, Any]]:
        """Extract product data from a DOM element"""
        text = element.get_text(' ', strip=True)
        
        # Extract name
        name = None
        for tag in ['h2', 'h3', 'h4', 'a', 'span[class*="name"]', 'span[class*="title"]']:
            elem = element.select_one(tag)
            if elem:
                name = elem.get_text(strip=True)
                if name and len(name) > 3:
                    break
        
        if not name:
            return None
        
        # Extract price
        price = None
        for pattern in self.price_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    if len(match.groups()) == 2:
                        price = float(f"{match.group(1)}.{match.group(2)}")
                    else:
                        price = float(match.group(1))
                    break
                except ValueError:
                    continue
        
        # Extract URL
        url = None
        link = element.find('a', href=True)
        if link:
            url = link['href']
            if not url.startswith('http'):
                url = urljoin(base_url, url)
        
        # Extract unit price
        unit_price = None
        for pattern in self.unit_price_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                unit_price = match.group(0)
                break
        
        return {
            "search_term": item_name,
            "store": store_name,
            "product_name": name[:200],  # Truncate long names
            "price": price,
            "size": self._extract_size(name + ' ' + text),
            "unit_price": unit_price,
            "available": True,
            "url": url
        }
    
    def _extract_size(self, text: str) -> Optional[str]:
        """Extract product size from text"""
        size_patterns = [
            r'(\d+(?:\.\d+)?\s*(?:oz|fl\s*oz|lb|lbs|kg|g|ml|l|ct|count|pack|pk))',
            r'(\d+\s*x\s*\d+(?:\.\d+)?\s*(?:oz|ml|ct))',
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
