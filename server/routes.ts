import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { searchResultSchema } from "@shared/schema";
import { z } from "zod";
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';

// Configure Puppeteer with stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// Smart bypass strategies without external API keys

// Strategy 1: Google Translate Proxy - Routes through Google's servers
async function fetchViaGoogleTranslate(targetUrl: string): Promise<{ html: string; status: number }> {
  console.log(`[GoogleTranslate] Fetching ${targetUrl} via translation proxy...`);
  
  // Google Translate can fetch and display foreign pages - we use a fake language pair
  const translateUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}`;
  
  const response = await fetch(translateUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(30000),
  });
  
  let html = await response.text();
  
  // Clean up Google Translate wrapper - extract the actual content
  // The content is inside an iframe, but we get the translated page wrapper
  console.log(`[GoogleTranslate] Got ${html.length} bytes`);
  
  return { html, status: response.status };
}

// Strategy 2: Archive.org Wayback Machine - Gets cached versions
async function fetchViaWayback(targetUrl: string): Promise<{ html: string; status: number }> {
  console.log(`[Wayback] Fetching latest snapshot of ${targetUrl}...`);
  
  // First check if there's a recent snapshot
  const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;
  const checkResponse = await fetch(availabilityUrl, {
    signal: AbortSignal.timeout(10000),
  });
  const availability = await checkResponse.json();
  
  if (availability?.archived_snapshots?.closest?.url) {
    const snapshotUrl = availability.archived_snapshots.closest.url;
    console.log(`[Wayback] Found snapshot: ${snapshotUrl}`);
    
    const response = await fetch(snapshotUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(30000),
    });
    
    const html = await response.text();
    console.log(`[Wayback] Got ${html.length} bytes from archive`);
    return { html, status: response.status };
  }
  
  throw new Error('No Wayback snapshot available');
}

// Strategy 3: Mobile User Agent - Some sites have lighter protection on mobile
async function fetchAsMobile(targetUrl: string): Promise<{ html: string; status: number }> {
  console.log(`[Mobile] Fetching ${targetUrl} with mobile user agent...`);
  
  const mobileUserAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ];
  
  const ua = mobileUserAgents[Math.floor(Math.random() * mobileUserAgents.length)];
  
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  
  const html = await response.text();
  console.log(`[Mobile] Got ${html.length} bytes, status ${response.status}`);
  
  return { html, status: response.status };
}

// Strategy 4: Google Web Cache - Gets Google's cached version
async function fetchViaGoogleCache(targetUrl: string): Promise<{ html: string; status: number }> {
  console.log(`[GoogleCache] Fetching cached version of ${targetUrl}...`);
  
  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(targetUrl)}&strip=1`;
  
  const response = await fetch(cacheUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });
  
  if (response.status === 404) {
    throw new Error('No Google cache available');
  }
  
  const html = await response.text();
  console.log(`[GoogleCache] Got ${html.length} bytes`);
  
  return { html, status: response.status };
}

// Master bypass function - tries multiple strategies in sequence
async function smartBypass(targetUrl: string): Promise<{ html: string; status: number; method: string }> {
  const strategies = [
    { name: 'Mobile', fn: () => fetchAsMobile(targetUrl) },
    { name: 'GoogleCache', fn: () => fetchViaGoogleCache(targetUrl) },
    { name: 'Wayback', fn: () => fetchViaWayback(targetUrl) },
    { name: 'GoogleTranslate', fn: () => fetchViaGoogleTranslate(targetUrl) },
  ];
  
  for (const strategy of strategies) {
    try {
      console.log(`[SmartBypass] Trying ${strategy.name} strategy...`);
      const result = await strategy.fn();
      
      // Check if we got actual content (not a block page)
      if (result.html.length > 500 && 
          !result.html.includes('cf-chl-widget') &&
          !result.html.includes('Just a moment...') &&
          !result.html.includes('challenge-running')) {
        console.log(`[SmartBypass] ${strategy.name} succeeded!`);
        return { ...result, method: strategy.name };
      }
    } catch (error) {
      console.log(`[SmartBypass] ${strategy.name} failed:`, error instanceof Error ? error.message : error);
    }
  }
  
  throw new Error('All bypass strategies failed');
}

// Shared browser instance for efficiency
let browserInstance: any = null;
let browserLastUsed = 0;
const BROWSER_TIMEOUT = 5 * 60 * 1000; // Close browser after 5 min of inactivity

async function getBrowser() {
  const now = Date.now();
  if (browserInstance && now - browserLastUsed < BROWSER_TIMEOUT) {
    browserLastUsed = now;
    return browserInstance;
  }
  
  if (browserInstance) {
    try { await browserInstance.close(); } catch (e) {}
  }
  
  console.log('Launching stealth browser...');
  
  // Find system chromium - use the Nix store path
  let chromiumPath = 'chromium';
  try {
    chromiumPath = execSync('which chromium').toString().trim();
  } catch (e) {
    // fallback to search
    try {
      const found = execSync('find /nix/store -name "chromium" -type f -path "*/bin/*" 2>/dev/null | head -1').toString().trim();
      if (found) chromiumPath = found;
    } catch (e2) {}
  }
  console.log('Using chromium at:', chromiumPath);
  
  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--single-process', // Required for some environments
      '--no-zygote',
    ]
  });
  browserLastUsed = now;
  return browserInstance;
}

// Enhanced Puppeteer with better fingerprint randomization
async function fetchWithPuppeteer(targetUrl: string): Promise<{ html: string; status: number }> {
  console.log(`[Puppeteer] Fetching ${targetUrl} with enhanced stealth browser...`);
  
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Randomize viewport to look more natural
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
    ];
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(viewport);
    
    // Randomize user agent from realistic options
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(ua);
    
    // Set realistic headers with some randomization
    const languages = ['en-US,en;q=0.9', 'en-GB,en;q=0.9,en-US;q=0.8', 'en-US,en;q=0.9,es;q=0.8'];
    await page.setExtraHTTPHeaders({
      'Accept-Language': languages[Math.floor(Math.random() * languages.length)],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
    });
    
    // Override navigator properties to avoid detection
    await page.evaluateOnNewDocument(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      
      // Add realistic plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => 
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);
    });
    
    // Add random delay before navigation (human-like)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Navigate with networkidle2 for better JS-heavy page handling
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 20000 // 20 second timeout
    });
    
    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
    
    // Check for Cloudflare challenge and wait for it to complete
    let attempts = 0;
    const maxAttempts = 4; // Max 4 attempts (about 12-16 seconds)
    
    while (attempts < maxAttempts) {
      const content = await page.content();
      
      const hasChallenge = content.includes('challenge-running') || 
                          content.includes('cf-chl-widget') ||
                          content.includes('Verifying you are human') ||
                          content.includes('Just a moment...') ||
                          content.includes('Checking your browser');
      
      if (!hasChallenge) {
        console.log('[Puppeteer] No challenge detected or challenge passed');
        break;
      }
      
      console.log(`[Puppeteer] Challenge in progress (attempt ${attempts + 1}/${maxAttempts})`);
      
      // Human-like mouse movements
      try {
        const centerX = viewport.width / 2;
        const centerY = viewport.height / 2;
        
        // Move mouse in natural curve
        for (let i = 0; i < 3; i++) {
          await page.mouse.move(
            centerX + (Math.random() - 0.5) * 200,
            centerY + (Math.random() - 0.5) * 200,
            { steps: 10 }
          );
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        }
        
        // Try to find and click Turnstile checkbox
        const frames = page.frames();
        for (const frame of frames) {
          try {
            const checkbox = await frame.$('input[type="checkbox"], .cf-turnstile');
            if (checkbox) {
              const box = await checkbox.boundingBox();
              if (box) {
                // Move to checkbox naturally
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                console.log('[Puppeteer] Clicked Turnstile checkbox');
              }
            }
          } catch (e) {}
        }
        
        // Also try main page checkbox
        const mainCheckbox = await page.$('input[type="checkbox"]');
        if (mainCheckbox) {
          const box = await mainCheckbox.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          }
        }
      } catch (e) {}
      
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      attempts++;
    }
    
    // Final wait
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const html = await page.content();
    const status = response?.status() || 200;
    
    console.log(`[Puppeteer] Got ${html.length} bytes, status ${status}`);
    return { html, status };
  } finally {
    await page.close();
  }
}

// URL obfuscation to bypass content filters
// Uses a simple XOR + base64 encoding to hide domain names from DPI
const OBFUSCATION_KEY = 0x5A; // XOR key

function obfuscateUrl(url: string): string {
  // XOR each character then base64 encode
  const xored = url.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY)).join('');
  return Buffer.from(xored).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function deobfuscateUrl(encoded: string): string {
  try {
    // Restore base64 padding and decode
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const xored = Buffer.from(b64, 'base64').toString();
    // XOR to get original
    return xored.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY)).join('');
  } catch (e) {
    return '';
  }
}

// In-memory asset cache for faster repeat loads
const assetCache = new Map<string, { data: Buffer; contentType: string; etag: string; timestamp: number }>();
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 100; // Max cached items

function cleanCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  assetCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_MAX_AGE) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => assetCache.delete(key));
  
  // Evict oldest if over size limit
  if (assetCache.size > CACHE_MAX_SIZE) {
    const entries: Array<[string, { timestamp: number }]> = [];
    assetCache.forEach((value, key) => entries.push([key, value]));
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < entries.length - CACHE_MAX_SIZE; i++) {
      assetCache.delete(entries[i][0]);
    }
  }
}

const UNIVERSAL_PASSWORD = "Unblocked123";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints
  app.get("/api/auth/status", (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const isAuthenticated = storage.isIpAuthenticated(clientIp);
    res.json({ authenticated: isAuthenticated });
  });
  
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    if (password === UNIVERSAL_PASSWORD) {
      storage.authenticateIp(clientIp);
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.query as string;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
      const serpApiKey = process.env.SERPAPI_KEY;
      let results;

      if (braveApiKey) {
        try {
          results = await fetchBraveSearchResults(query, braveApiKey);
        } catch (error) {
          console.warn("Brave search failed, falling back to demo:", error);
          results = getDemoSearchResults(query);
        }
      } else if (serpApiKey) {
        try {
          results = await fetchSerpApiResults(query, serpApiKey);
        } catch (error) {
          console.warn("SerpAPI search failed, falling back to demo:", error);
          results = getDemoSearchResults(query);
        }
      } else {
        results = getDemoSearchResults(query);
      }
      
      const validatedResults = results.map(result => {
        try {
          return searchResultSchema.parse(result);
        } catch (error) {
          console.error("Invalid result:", result, error);
          return null;
        }
      }).filter(Boolean);
      
      res.json(validatedResults);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  const proxyRateLimit = new Map<string, number[]>();
  const RATE_LIMIT_WINDOW = 60000;
  const MAX_REQUESTS_PER_WINDOW = 300; // Increased for resource-intensive SPAs

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  function isBlockPage(html: string): boolean {
    const blockIndicators = [
      'lightspeed', 'blocked', 'access denied', 'web filter', 'content filter',
      'securly', 'goguardian', 'bark', 'net nanny', 'k9 web protection',
      'this site has been blocked', 'access to this website', 'restricted content',
      'network administrator', 'has been blocked by'
    ];
    const lowerHtml = html.toLowerCase();
    const matchCount = blockIndicators.filter(indicator => lowerHtml.includes(indicator)).length;
    return matchCount >= 2 || (lowerHtml.includes('blocked') && lowerHtml.includes('filter'));
  }

  async function fetchWithRetry(targetUrl: string, attempt: number = 0): Promise<Response> {
    const ua = userAgents[attempt % userAgents.length];
    const parsedUrl = new URL(targetUrl);
    
    const headers: Record<string, string> = {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    // Add referrer for some sites
    if (attempt > 0) {
      headers['Referer'] = `https://www.google.com/`;
    }

    console.log(`Fetching ${targetUrl} with UA: ${ua.substring(0, 30)}...`);
    
    const response = await fetch(targetUrl, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    return response;
  }

  function decodeUrl(encoded: string): string {
    try {
      let cleaned = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padding = (4 - (cleaned.length % 4)) % 4;
      cleaned += '='.repeat(padding);
      const decoded = Buffer.from(cleaned, 'base64').toString('utf-8');
      return decoded.split('').reverse().join('');
    } catch (e) {
      console.error('Decode error:', e);
      return '';
    }
  }

  function encodeUrlServer(url: string): string {
    const reversed = url.split('').reverse().join('');
    const encoded = Buffer.from(reversed).toString('base64');
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function encodeForHiding(str: string): string {
    return Buffer.from(str).toString('base64');
  }
  
  function obfuscateAllDomains(html: string, domain: string): string {
    const parts = domain.split('.');
    const mainWord = parts[0]; // e.g., "reddit" from "reddit.com"
    
    if (mainWord.length < 4) return html;
    
    // Replace domain references with hidden spans that JS will decode
    // But only in text content, not in URLs (which are already proxied)
    let result = html;
    
    // Replace in title tags
    result = result.replace(/<title>([^<]*)<\/title>/gi, (match, content) => {
      const hidden = content.replace(new RegExp(mainWord, 'gi'), '');
      return `<title>${hidden}</title>`;
    });
    
    // Replace in meta tags
    result = result.replace(/(<meta[^>]*content=["'])([^"']*)(["'])/gi, (match, prefix, content, suffix) => {
      const hidden = content.replace(new RegExp(mainWord, 'gi'), '');
      return prefix + hidden + suffix;
    });
    
    return result;
  }

  // OBFUSCATED proxy endpoint - hides domain names from content filters
  // Format: /b/{obfuscated_url} where the URL is XOR+base64 encoded
  app.get("/b/:encoded", async (req, res) => {
    try {
      const clientIp = req.ip || 'unknown';
      const now = Date.now();
      const requests = proxyRateLimit.get(clientIp) || [];
      const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
      
      if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).send("Rate limit exceeded");
      }
      
      recentRequests.push(now);
      proxyRateLimit.set(clientIp, recentRequests);
      
      // Decode the obfuscated URL
      const targetUrl = deobfuscateUrl(req.params.encoded);
      if (!targetUrl) {
        return res.status(400).send("Invalid request");
      }
      
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid request");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Not allowed");
      }

      let response: Response | null = null;
      let html = '';
      let contentType = 'text/html';
      let usedPuppeteer = false;
      
      // Check for force mode - skip regular fetch and use advanced methods
      const forceMode = req.query.force === '1';
      
      if (forceMode) {
        console.log(`[Proxy] Force mode enabled for ${targetUrl}`);
        
        // Try smart bypass strategies first (Mobile, Google Cache, Wayback, etc.)
        try {
          console.log(`[Proxy] Trying smart bypass strategies...`);
          const bypassResult = await smartBypass(targetUrl);
          if (bypassResult.html.length > 500) {
            html = bypassResult.html;
            usedPuppeteer = true;
            contentType = 'text/html';
            console.log(`[Proxy] Smart bypass (${bypassResult.method}) succeeded for ${targetUrl}`);
          }
        } catch (bypassError) {
          console.log(`[Proxy] Smart bypass failed, trying enhanced Puppeteer:`, bypassError);
        }
        
        // Try enhanced Puppeteer if smart bypass didn't work
        if (!html || html.length < 500) {
          try {
            const puppeteerResult = await fetchWithPuppeteer(targetUrl);
            // Check if we actually got content (not a challenge page)
            if (puppeteerResult.html.length > 1000 &&
                !puppeteerResult.html.includes('cf-chl-widget') &&
                !puppeteerResult.html.includes('Just a moment...')) {
              html = puppeteerResult.html;
              usedPuppeteer = true;
              contentType = 'text/html';
              console.log(`[Proxy] Enhanced Puppeteer succeeded for ${targetUrl}`);
            } else {
              console.log(`[Proxy] Puppeteer got challenge page, returning what we have`);
              html = puppeteerResult.html;
              usedPuppeteer = true;
              contentType = 'text/html';
            }
          } catch (puppeteerError) {
            console.error(`[Proxy] Enhanced Puppeteer failed:`, puppeteerError);
            if (!html) {
              return res.status(500).send("Bypass failed - site has advanced protection. Try Wayback Machine or Google Cache buttons.");
            }
          }
        }
      } else {
        // First try regular fetch
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await fetchWithRetry(targetUrl, attempt);
            const buffer = await response.arrayBuffer();
            html = new TextDecoder('utf-8').decode(buffer);
            contentType = response.headers.get('content-type') || 'text/html';
            
            // Check if we got blocked (403) or Cloudflare challenge
            if (response.status === 403 || 
                html.includes('cf-chl-widget') || 
                html.includes('challenge-running') ||
                html.includes('Just a moment...') ||
                html.includes('Checking your browser')) {
              console.log(`[Proxy] Cloudflare detected on ${targetUrl}, trying Puppeteer fallback...`);
              break; // Exit loop to try Puppeteer
            }
            
            if (!isBlockPage(html)) {
              break; // Success, exit loop
            }
          } catch (error) {
            if (attempt === 1) {
              console.log(`[Proxy] Regular fetch failed, trying Puppeteer...`);
            }
          }
        }
        
        // If blocked or failed, try Puppeteer stealth browser
        if (!response || response.status === 403 || 
            html.includes('cf-chl-widget') || 
            html.includes('challenge-running') ||
            html.includes('Just a moment...')) {
          try {
            const puppeteerResult = await fetchWithPuppeteer(targetUrl);
            html = puppeteerResult.html;
            usedPuppeteer = true;
            contentType = 'text/html';
            console.log(`[Proxy] Puppeteer succeeded for ${targetUrl}`);
          } catch (puppeteerError) {
            console.error(`[Proxy] Puppeteer also failed:`, puppeteerError);
            if (!response) {
              return res.status(500).send("Failed to fetch - site may be blocking proxy access");
            }
          }
        }
      }

      if (!response && !usedPuppeteer) {
        return res.status(500).send("Failed to fetch");
      }
      
      if (!contentType.includes('text/html')) {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(Buffer.from(html));
      }

      const domain = parsedUrl.hostname;
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const currentPath = parsedUrl.pathname;

      // Helper functions for URL handling
      const decodeHtmlEntities = (str: string): string => {
        return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      };
      
      const resolveUrl = (url: string): string => {
        url = decodeHtmlEntities(url);
        if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('blob:')) return url;
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/')) return baseUrl + url;
        const pathParts = currentPath.split('/');
        pathParts.pop();
        return baseUrl + pathParts.join('/') + '/' + url;
      };

      // Create obfuscated URL for proxy
      const toObfuscatedProxy = (url: string): string => {
        const abs = resolveUrl(url);
        return '/b/' + obfuscateUrl(abs);
      };

      // Inject script to handle navigation
      const navScript = `<script>
(function() {
  var B = "${baseUrl}";
  var KEY = ${OBFUSCATION_KEY};
  
  // Disable Service Workers to prevent offline detection issues
  if ('serviceWorker' in navigator) {
    // Prevent new service worker registrations
    navigator.serviceWorker.register = function() {
      return Promise.reject(new Error('Service Workers disabled by proxy'));
    };
    // Unregister existing service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister();
      }
    }).catch(function() {});
  }
  
  // Disable cache API to prevent offline caching
  if ('caches' in window) {
    window.caches.open = function() {
      return Promise.reject(new Error('Cache disabled by proxy'));
    };
    window.caches.delete = function() { return Promise.resolve(true); };
    window.caches.keys = function() { return Promise.resolve([]); };
  }
  
  // Force online status
  Object.defineProperty(navigator, 'onLine', {
    get: function() { return true; },
    configurable: false
  });
  
  function toProxy(url) {
    if (!url) return url;
    if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('blob:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
    if (url.startsWith('/b/') || url.startsWith('/api/')) return url;
    
    var abs = url;
    if (url.startsWith('//')) abs = 'https:' + url;
    else if (url.startsWith('/')) abs = B + url;
    else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
    
    var xored = '';
    for (var i = 0; i < abs.length; i++) {
      xored += String.fromCharCode(abs.charCodeAt(i) ^ KEY);
    }
    var b64 = btoa(xored).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
    return '/b/' + b64;
  }
  
  function decodeProxy(url) {
    if (!url || !url.startsWith('/b/')) return url;
    try {
      var enc = url.substring(3);
      var b64 = enc.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var xored = atob(b64);
      var result = '';
      for (var i = 0; i < xored.length; i++) {
        result += String.fromCharCode(xored.charCodeAt(i) ^ KEY);
      }
      return result;
    } catch(e) { return url; }
  }
  
  function notifyParent(url) {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'navigation', url: decodeProxy(url) }, '*');
      } catch(e) {}
    }
  }
  
  // Override window.open to stay in proxy
  var _open = window.open;
  window.open = function(url, target, features) {
    if (url && !url.startsWith('/b/') && !url.startsWith('javascript:') && !url.startsWith('data:')) {
      var proxyUrl = toProxy(url);
      notifyParent(proxyUrl);
      location.href = proxyUrl;
      return null;
    }
    return _open.apply(this, arguments);
  };
  
  // Override location assignment
  var locDesc = Object.getOwnPropertyDescriptor(window, 'location');
  if (locDesc && locDesc.configurable !== false) {
    try {
      var realLoc = window.location;
      Object.defineProperty(window, 'location', {
        get: function() { return realLoc; },
        set: function(url) {
          if (url && typeof url === 'string' && !url.startsWith('/b/')) {
            realLoc.href = toProxy(url);
          } else {
            realLoc.href = url;
          }
        }
      });
    } catch(e) {}
  }
  
  // History API
  var _pushState = history.pushState;
  var _replaceState = history.replaceState;
  history.pushState = function(state, title, url) {
    if (url && !url.startsWith('/b/')) url = toProxy(url);
    var result = _pushState.call(this, state, title, url);
    notifyParent(url || location.pathname);
    return result;
  };
  history.replaceState = function(state, title, url) {
    if (url && !url.startsWith('/b/')) url = toProxy(url);
    var result = _replaceState.call(this, state, title, url);
    notifyParent(url || location.pathname);
    return result;
  };
  
  window.addEventListener('popstate', function() {
    notifyParent(location.pathname);
  });
  
  // Helper to check if URL is a download
  function isDownloadUrl(url) {
    if (!url) return false;
    var ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
    var downloadExts = ['zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'ipa', 
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
      'mp3', 'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'wav', 'flac', 'aac', 'ogg',
      'iso', 'img', 'bin', 'jar', 'war', 'ear'];
    return downloadExts.includes(ext);
  }
  
  // Handle download by opening in parent window
  function triggerDownload(url, filename) {
    var abs = url;
    if (url.startsWith('//')) abs = 'https:' + url;
    else if (url.startsWith('/')) abs = B + url;
    else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
    
    var downloadUrl = '/api/download?u=' + encodeURIComponent(abs);
    if (filename) downloadUrl += '&f=' + encodeURIComponent(filename);
    
    // Notify parent to trigger download
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'download', url: downloadUrl, filename: filename || '' }, '*');
      } catch(e) {}
    }
    // Also open directly (works if not in iframe or parent handles it)
    window.open(downloadUrl, '_blank');
  }
  
  // Click handler - catch all link clicks including target=_blank
  document.addEventListener('click', function(e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('/b/')) return;
    
    // Check if this is a download link
    var hasDownloadAttr = link.hasAttribute('download');
    var downloadFilename = link.getAttribute('download') || '';
    var isDownload = hasDownloadAttr || isDownloadUrl(href);
    
    if (isDownload) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      triggerDownload(href, downloadFilename);
      return false;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    var proxyUrl = toProxy(href);
    notifyParent(proxyUrl);
    location.href = proxyUrl;
    return false;
  }, true);
  
  // Also handle mousedown for buttons that trigger on mousedown
  document.addEventListener('mousedown', function(e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (link) {
      var target = link.getAttribute('target');
      if (target === '_blank' || target === '_top' || target === '_parent') {
        link.removeAttribute('target');
      }
    }
  }, true);
  
  // Form submission interception
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var action = form.getAttribute('action') || '';
    if (action.startsWith('/b/') || action.startsWith('/api/')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    var method = (form.getAttribute('method') || 'GET').toUpperCase();
    var formData = new FormData(form);
    
    if (method === 'GET') {
      var params = new URLSearchParams(formData).toString();
      var url = action || location.pathname;
      var fullUrl = url + (url.includes('?') ? '&' : '?') + params;
      var proxyUrl = toProxy(fullUrl);
      notifyParent(proxyUrl);
      location.href = proxyUrl;
    } else {
      // POST - just navigate to action
      var proxyUrl = toProxy(action || location.pathname);
      notifyParent(proxyUrl);
      location.href = proxyUrl;
    }
    return false;
  }, true);
  
  // XHR intercept
  var _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, url) {
    if (url && !url.startsWith('/b/') && !url.startsWith('/api/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      var abs = url;
      if (url.startsWith('//')) abs = 'https:' + url;
      else if (url.startsWith('/')) abs = B + url;
      else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
      arguments[1] = '/api/r?u=' + encodeURIComponent(abs);
    }
    return _xhrOpen.apply(this, arguments);
  };
  
  // Fetch intercept
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url);
    if (url && !url.startsWith('/b/') && !url.startsWith('/api/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      var abs = url;
      if (url.startsWith('//')) abs = 'https:' + url;
      else if (url.startsWith('/')) abs = B + url;
      else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
      return _fetch.call(this, '/api/r?u=' + encodeURIComponent(abs), init);
    }
    return _fetch.apply(this, arguments);
  };
  
  // WebSocket intercept for real-time games
  var _WebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (url && !url.includes('/api/ws')) {
      var abs = url;
      if (url.startsWith('//')) abs = 'wss:' + url;
      else if (url.startsWith('/')) abs = (B.replace('https:', 'wss:').replace('http:', 'ws:')) + url;
      else if (!url.match(/^wss?:\\/\\//)) abs = 'wss://' + url;
      
      // Route through our WebSocket proxy
      var wsProxyUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/api/ws?u=' + encodeURIComponent(abs);
      console.log('WebSocket proxied:', abs, '->', wsProxyUrl);
      return new _WebSocket(wsProxyUrl, protocols);
    }
    return new _WebSocket(url, protocols);
  };
  window.WebSocket.prototype = _WebSocket.prototype;
  window.WebSocket.CONNECTING = _WebSocket.CONNECTING;
  window.WebSocket.OPEN = _WebSocket.OPEN;
  window.WebSocket.CLOSING = _WebSocket.CLOSING;
  window.WebSocket.CLOSED = _WebSocket.CLOSED;
  
  // Rewrite target attributes on page load
  setTimeout(function() {
    var links = document.querySelectorAll('a[target="_blank"], a[target="_top"], a[target="_parent"]');
    for (var i = 0; i < links.length; i++) {
      links[i].removeAttribute('target');
    }
    notifyParent(location.pathname);
  }, 100);
  
  // MutationObserver to catch dynamically added links
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          var links = node.querySelectorAll ? node.querySelectorAll('a[target="_blank"], a[target="_top"], a[target="_parent"]') : [];
          for (var i = 0; i < links.length; i++) {
            links[i].removeAttribute('target');
          }
          if (node.tagName === 'A' && (node.target === '_blank' || node.target === '_top' || node.target === '_parent')) {
            node.removeAttribute('target');
          }
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`;

      // Remove existing base tags and frame busters
      html = html.replace(/<base[^>]*>/gi, '');
      html = html
        .replace(/if\s*\(\s*(?:window\.)?(?:top|parent)\s*!==?\s*(?:window\.)?self\s*\)/gi, 'if(false)')
        .replace(/if\s*\(\s*(?:window\.)?self\s*!==?\s*(?:window\.)?(?:top|parent)\s*\)/gi, 'if(false)')
        .replace(/(?:window\.)?top\.location\s*=/gi, 'void 0;//')
        .replace(/(?:window\.)?parent\.location\s*=/gi, 'void 0;//');

      // Rewrite resource URLs to use obfuscated proxy
      html = html.replace(
        /(<(?:link|script|img|source|video|audio)[^>]*(?:src|href)=["'])([^"']+)(["'])/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('/b/') || url.startsWith('/api/')) {
            return match;
          }
          const abs = resolveUrl(url);
          return prefix + '/api/r?u=' + encodeURIComponent(abs) + suffix;
        }
      );

      // Rewrite anchor hrefs and remove target attributes
      html = html.replace(
        /(<a[^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
        (match, prefix, url, suffix) => {
          const decoded = decodeHtmlEntities(url);
          if (decoded.startsWith('#') || decoded.startsWith('javascript:') || decoded.startsWith('mailto:') || decoded.startsWith('tel:') || decoded.startsWith('/b/')) {
            return match;
          }
          // Remove target attribute from the suffix
          const cleanSuffix = suffix.replace(/\s+target=["'][^"']*["']/gi, '');
          return prefix + toObfuscatedProxy(url) + cleanSuffix;
        }
      );
      
      // Also remove standalone target attributes on links
      html = html.replace(/<a\s([^>]*)\starget=["'](_blank|_top|_parent)["']([^>]*)>/gi, '<a $1$3>');

      // Remove domain references
      html = obfuscateAllDomains(html, domain);

      // Inject script
      if (html.includes('<head')) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>${navScript}`);
      } else {
        html = `<!DOCTYPE html><html><head>${navScript}</head><body>${html}</body></html>`;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(html);
    } catch (error) {
      console.error("Obfuscated proxy error:", error);
      res.status(500).send("Error");
    }
  });

  // Obfuscated resource endpoint - for XHR/fetch requests with streaming support
  app.all("/api/r", async (req, res) => {
    try {
      const targetUrl = req.query.u as string;
      if (!targetUrl) {
        return res.status(400).send("Missing URL");
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      // Build headers to forward (Range for video streaming, Accept for SSE)
      const forwardHeaders: Record<string, string> = {
        'User-Agent': userAgents[0],
        'Accept': req.headers.accept || '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Don't request compression for streaming
      };

      // Forward Range header for video streaming (YouTube, etc.)
      if (req.headers.range) {
        forwardHeaders['Range'] = req.headers.range;
      }

      // Forward content-type for POST requests
      if (req.headers['content-type']) {
        forwardHeaders['Content-Type'] = req.headers['content-type'];
      }

      // Check if this is an SSE request
      const isSSE = req.headers.accept?.includes('text/event-stream');
      
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: forwardHeaders,
      };

      // Forward body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        if (typeof req.body === 'object') {
          fetchOptions.body = JSON.stringify(req.body);
        } else {
          fetchOptions.body = req.body;
        }
      }

      const response = await fetch(targetUrl, fetchOptions);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Disposition');
      
      // Forward important headers
      res.setHeader('Content-Type', contentType);
      
      // Forward Range response headers for video streaming
      const contentRange = response.headers.get('content-range');
      const acceptRanges = response.headers.get('accept-ranges');
      const contentLength = response.headers.get('content-length');
      const contentDisposition = response.headers.get('content-disposition');
      
      if (contentRange) res.setHeader('Content-Range', contentRange);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);

      // Use appropriate status code (206 for partial content)
      res.status(response.status);

      // Handle SSE streaming
      if (isSSE && response.body) {
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(decoder.decode(value, { stream: true }));
            }
            res.end();
          } catch (e) {
            res.end();
          }
        };
        
        pump();
        return;
      }

      // Stream response for large files (video, audio)
      if (response.body && (contentType.includes('video') || contentType.includes('audio') || contentRange)) {
        const reader = response.body.getReader();
        
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          } catch (e) {
            res.end();
          }
        };
        
        pump();
        return;
      }
      
      // Standard response for other content
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Resource proxy error:", error);
      res.status(500).send("Error");
    }
  });

  // Download endpoint - forces file download with proper headers
  app.get("/api/download", async (req, res) => {
    try {
      const targetUrl = req.query.u as string;
      const filename = req.query.f as string;
      
      if (!targetUrl) {
        return res.status(400).send("Missing URL");
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Not allowed");
      }

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': userAgents[0],
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).send("Download failed");
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');
      let contentDisposition = response.headers.get('content-disposition');
      
      // Extract filename from Content-Disposition or URL
      let downloadFilename = filename;
      if (!downloadFilename && contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) {
          downloadFilename = match[1].replace(/['"]/g, '');
        }
      }
      if (!downloadFilename) {
        downloadFilename = parsedUrl.pathname.split('/').pop() || 'download';
      }

      // Set headers for download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      // Stream the file
      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          } catch (e) {
            res.end();
          }
        };
        pump();
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).send("Download failed");
    }
  });

  // NEW: Path-based proxy that preserves URL structure for SPA routing
  // Format: /w/domain.com/path or /w/https/domain.com/path
  app.get("/w/*", async (req, res) => {
    try {
      // Rate limiting
      const clientIp = req.ip || 'unknown';
      const now = Date.now();
      const requests = proxyRateLimit.get(clientIp) || [];
      const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
      
      if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).send("Rate limit exceeded");
      }
      
      recentRequests.push(now);
      proxyRateLimit.set(clientIp, recentRequests);
      
      // Extract target from path: /w/domain.com/path or /w/https/domain.com/path
      let pathPart = (req.params as Record<string, string>)[0] || '';
      let targetUrl: string;
      
      if (pathPart.startsWith('https/')) {
        targetUrl = 'https://' + pathPart.slice(6);
      } else if (pathPart.startsWith('http/')) {
        targetUrl = 'http://' + pathPart.slice(5);
      } else {
        targetUrl = 'https://' + pathPart;
      }
      
      // Append query string if present (filter out internal params)
      if (req.query && Object.keys(req.query).length > 0) {
        const filteredQuery: Record<string, string> = {};
        for (const [key, val] of Object.entries(req.query)) {
          // Skip internal cache-busting params
          if (!key.startsWith('_')) {
            filteredQuery[key] = String(val);
          }
        }
        if (Object.keys(filteredQuery).length > 0) {
          const qs = new URLSearchParams(filteredQuery).toString();
          targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs;
        }
      }
      
      console.log("Path proxy target:", targetUrl);
      
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Not allowed");
      }

      // Use fetchWithRetry for resilience
      let response: Response | null = null;
      let html = '';
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetchWithRetry(targetUrl, attempt);
          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
              // For non-HTML, stream directly
              res.setHeader('Content-Type', contentType);
              res.setHeader('Access-Control-Allow-Origin', '*');
              if (response.body) {
                const reader = response.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(Buffer.from(value));
                }
                res.end();
              }
              return;
            }
            html = await response.text();
            if (!isBlockPage(html)) {
              break;
            }
          }
        } catch (err) {
          // continue trying
        }
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }
      
      if (!response || !html) {
        return res.status(500).send("Could not connect");
      }

      const domain = parsedUrl.hostname;
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const proxyBase = `/w/${domain}`;

      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Inject a powerful SPA-aware script
      const spaScript = `
<script>
(function() {
  var B = "${baseUrl}";
  var D = "${domain}";
  var PB = "${proxyBase}";
  
  // Override frame detection
  try {
    Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: false });
    Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: false });
    Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: false });
  } catch(e) {}
  
  // Create DYNAMIC fake location object that updates with navigation
  var realLocation = window.location;
  
  // Helper to get current target URL from real location
  function getCurrentTargetUrl() {
    var path = realLocation.pathname.replace(PB, '') || '/';
    // Filter out internal params from search
    var search = realLocation.search;
    if (search) {
      try {
        var params = new URLSearchParams(search);
        var filtered = new URLSearchParams();
        params.forEach(function(v, k) {
          if (!k.startsWith('_')) filtered.set(k, v);
        });
        search = filtered.toString() ? '?' + filtered.toString() : '';
      } catch(e) {}
    }
    return B + path + search + realLocation.hash;
  }
  
  try {
    // Use Proxy for dynamic location that updates with navigation
    var fakeLoc = new Proxy({}, {
      get: function(target, prop) {
        var currentUrl = getCurrentTargetUrl();
        try {
          var fakeUrl = new URL(currentUrl);
          switch(prop) {
            case 'href': return currentUrl;
            case 'protocol': return fakeUrl.protocol;
            case 'host': return fakeUrl.host;
            case 'hostname': return fakeUrl.hostname;
            case 'port': return fakeUrl.port || '';
            case 'pathname': return fakeUrl.pathname;
            case 'search': 
              // Return filtered search without internal params
              var params = new URLSearchParams(realLocation.search);
              var filtered = new URLSearchParams();
              params.forEach(function(v, k) {
                if (!k.startsWith('_')) filtered.set(k, v);
              });
              return filtered.toString() ? '?' + filtered.toString() : '';
            case 'hash': return realLocation.hash;
            case 'origin': return fakeUrl.origin;
            case 'assign': return function(u) { realLocation.assign(toProxy(u)); };
            case 'replace': return function(u) { realLocation.replace(toProxy(u)); };
            case 'reload': return function() { realLocation.reload(); };
            case 'toString': return function() { return currentUrl; };
            default: return undefined;
          }
        } catch(e) { return undefined; }
      },
      set: function(target, prop, value) {
        if (prop === 'href') {
          realLocation.href = toProxy(value);
          return true;
        }
        return false;
      }
    });
    
    // Try to override location
    try {
      Object.defineProperty(window, 'location', { 
        get: function() { return fakeLoc; },
        set: function(v) { realLocation.href = toProxy(v); },
        configurable: true 
      });
    } catch(e) {}
    
    try {
      Object.defineProperty(document, 'location', { 
        get: function() { return fakeLoc; },
        set: function(v) { realLocation.href = toProxy(v); },
        configurable: true 
      });
    } catch(e) {}
  } catch(e) { console.error('Location spoof error:', e); }
  
  // Convert URL to proxy path
  function toProxy(url) {
    if (!url) return url;
    if (typeof url !== 'string') url = String(url);
    if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('blob:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
    if (url.startsWith('/w/')) return url;
    
    var abs = url;
    if (url.startsWith('//')) abs = 'https:' + url;
    else if (url.startsWith('/')) abs = B + url;
    else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
    
    try {
      var u = new URL(abs);
      return '/w/' + u.hostname + u.pathname + u.search + u.hash;
    } catch(e) { return url; }
  }
  
  // Helper: Check if URL is for cacheable assets
  function isAssetUrl(url) {
    if (!url) return false;
    var ext = url.split('?')[0].split('#')[0].split('.').pop();
    return ['js', 'css', 'woff', 'woff2', 'ttf', 'eot', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'].includes(ext);
  }
  
  // Helper: Check if URL is for SSE/EventSource
  function isSSEUrl(url, init) {
    if (!url) return false;
    if (init && init.headers) {
      var accept = init.headers.Accept || init.headers.accept;
      if (accept && accept.includes('text/event-stream')) return true;
    }
    return url.includes('/stream') || url.includes('/sse') || url.includes('/events');
  }
  
  // XHR intercept with smart endpoint
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, url) {
    var abs = url;
    if (url && !url.startsWith('/w/') && !url.startsWith('/api/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      if (url.startsWith('//')) abs = 'https:' + url;
      else if (url.startsWith('/')) abs = B + url;
      else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
      var endpoint = isAssetUrl(abs) ? '/api/asset' : '/api/xp';
      arguments[1] = endpoint + '?u=' + encodeURIComponent(abs);
    }
    return _open.apply(this, arguments);
  };
  
  // Fetch intercept with smart endpoint selection
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url);
    if (url && !url.startsWith('/w/') && !url.startsWith('/api/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      var abs = url;
      if (url.startsWith('//')) abs = 'https:' + url;
      else if (url.startsWith('/')) abs = B + url;
      else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
      var endpoint = isSSEUrl(abs, init) ? '/api/sse' : (isAssetUrl(abs) ? '/api/asset' : '/api/xp');
      return _fetch.call(this, endpoint + '?u=' + encodeURIComponent(abs), init);
    }
    return _fetch.apply(this, arguments);
  };
  
  // EventSource intercept for SSE streaming
  var _EventSource = window.EventSource;
  if (_EventSource) {
    window.EventSource = function(url, config) {
      var abs = url;
      if (url && !url.startsWith('/api/')) {
        if (url.startsWith('//')) abs = 'https:' + url;
        else if (url.startsWith('/')) abs = B + url;
        else if (!url.match(/^https?:\\/\\//)) abs = B + '/' + url;
        return new _EventSource('/api/sse?u=' + encodeURIComponent(abs), config);
      }
      return new _EventSource(url, config);
    };
    window.EventSource.CONNECTING = _EventSource.CONNECTING;
    window.EventSource.OPEN = _EventSource.OPEN;
    window.EventSource.CLOSED = _EventSource.CLOSED;
  }
  
  // WebSocket intercept for real-time connections
  var _WebSocket = window.WebSocket;
  if (_WebSocket) {
    window.WebSocket = function(url, protocols) {
      if (url && !url.includes('localhost')) {
        var wsBase = (realLocation.protocol === 'https:' ? 'wss://' : 'ws://') + realLocation.host;
        var targetUrl = url.replace(/^wss?:\\/\\//, 'https://');
        return new _WebSocket(wsBase + '/api/ws?u=' + encodeURIComponent(targetUrl), protocols);
      }
      return new _WebSocket(url, protocols);
    };
    window.WebSocket.CONNECTING = _WebSocket.CONNECTING;
    window.WebSocket.OPEN = _WebSocket.OPEN;
    window.WebSocket.CLOSING = _WebSocket.CLOSING;
    window.WebSocket.CLOSED = _WebSocket.CLOSED;
  }
  
  // Notify parent window of URL changes
  function notifyParent(newUrl) {
    if (window.parent && window.parent !== window) {
      try {
        // Extract real URL from proxy path
        var realUrl = newUrl;
        if (newUrl && newUrl.startsWith('/w/')) {
          var parts = newUrl.substring(3).split('/');
          var host = parts[0];
          var path = '/' + parts.slice(1).join('/');
          realUrl = 'https://' + host + path;
        }
        window.parent.postMessage({ type: 'navigation', url: realUrl }, '*');
      } catch(e) {}
    }
  }
  
  // History API - critical for SPA routing
  var _pushState = history.pushState;
  var _replaceState = history.replaceState;
  history.pushState = function(state, title, url) {
    if (url && !url.startsWith('/w/')) {
      url = toProxy(url);
    }
    var result = _pushState.call(this, state, title, url);
    notifyParent(url || realLocation.pathname);
    return result;
  };
  history.replaceState = function(state, title, url) {
    if (url && !url.startsWith('/w/')) {
      url = toProxy(url);
    }
    var result = _replaceState.call(this, state, title, url);
    notifyParent(url || realLocation.pathname);
    return result;
  };
  
  // Listen for popstate (back/forward navigation)
  window.addEventListener('popstate', function() {
    notifyParent(realLocation.pathname);
  });
  
  // Intercept link clicks - ONLY for cross-origin links
  // Let SPAs handle their own same-origin navigation
  document.addEventListener('click', function(e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('/w/')) return;
    
    // Check if this is a same-origin link that SPA routers should handle
    try {
      var abs = href;
      if (href.startsWith('/') && !href.startsWith('//')) {
        // Relative path - let SPA router handle it naturally
        // Only intercept if there's no SPA framework detected
        if (window.__NEXT_DATA__ || window.__remixContext || document.querySelector('[data-reactroot]') || document.querySelector('#__next') || document.querySelector('#root')) {
          return; // Let React/Next/Remix handle it
        }
      }
      if (href.startsWith('//')) abs = 'https:' + href;
      else if (!href.match(/^https?:\\/\\//)) abs = B + (href.startsWith('/') ? '' : '/') + href;
      
      var linkUrl = new URL(abs);
      if (linkUrl.hostname === D) {
        // Same domain - let SPA handle if present
        if (window.__NEXT_DATA__ || window.__remixContext || document.querySelector('[data-reactroot]')) {
          return;
        }
      }
    } catch(err) {}
    
    // Cross-origin or no SPA detected - use proxy
    e.preventDefault();
    e.stopPropagation();
    var proxyUrl = toProxy(href);
    notifyParent(proxyUrl);
    realLocation.href = proxyUrl;
  }, true);
  
  // Notify parent of initial URL on load
  setTimeout(function() {
    notifyParent(realLocation.pathname);
  }, 100);
  
})();
</script>`;

      // Remove existing base tags
      html = html.replace(/<base[^>]*>/gi, '');
      
      // Add base tag pointing to proxy path
      const baseTag = `<base href="${proxyBase}/">`;
      
      // Helper: decode HTML entities in URLs
      const decodeHtmlEntities = (str: string): string => {
        return str
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      };
      
      // Helper: resolve URL against base, handling all relative path types
      const resolveUrl = (url: string, base: string, currentPath: string): string => {
        // Decode HTML entities first
        url = decodeHtmlEntities(url);
        
        if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('blob:')) {
          return url;
        }
        if (url.startsWith('//')) {
          return 'https:' + url;
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        if (url.startsWith('/')) {
          return base + url;
        }
        // Relative path - resolve against current directory
        const pathParts = currentPath.split('/');
        pathParts.pop(); // Remove filename
        return base + pathParts.join('/') + '/' + url;
      };
      
      // Helper to check for cacheable assets
      const isCacheableUrl = (url: string): boolean => {
        const lower = url.toLowerCase().split('?')[0].split('#')[0];
        return ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.php'].some(ext => lower.endsWith(ext) || lower.includes(ext + '?'));
      };
      
      // Helper for media that needs streaming
      const isStreamingMedia = (url: string): boolean => {
        const lower = url.toLowerCase();
        return ['.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m3u8', '.ts', '.m4a', '.flac', '.mkv', '.avi', '.mov'].some(ext => lower.includes(ext));
      };
      
      const currentPath = parsedUrl.pathname;
      
      // Helper: check if URL is already a proxy URL (starts with /w/ followed by domain pattern)
      const isProxyUrl = (url: string): boolean => {
        if (!url.startsWith('/w/')) return false;
        // Check if it matches /w/{domain}/ pattern (e.g., /w/en.wikipedia.org/...)
        const afterW = url.substring(3);
        // If next segment looks like a domain (has a dot), it's a proxy URL
        const firstSlash = afterW.indexOf('/');
        const firstSegment = firstSlash > 0 ? afterW.substring(0, firstSlash) : afterW;
        return firstSegment.includes('.') && !firstSegment.includes('?');
      };
      
      // Rewrite resource URLs to go through optimized proxy endpoints
      html = html.replace(
        /(<(?:link|script|img|source|video|audio)[^>]*(?:src|href)=["'])([^"']+)(["'])/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('data:') || url.startsWith('javascript:') || isProxyUrl(url) || url.startsWith('/api/')) {
            return match;
          }
          
          const abs = resolveUrl(url, baseUrl, currentPath);
          
          // Route through optimized endpoints based on content type
          if (isStreamingMedia(abs) || prefix.toLowerCase().includes('video') || prefix.toLowerCase().includes('audio')) {
            return prefix + '/api/stream?u=' + encodeURIComponent(abs) + suffix;
          }
          if (isCacheableUrl(abs)) {
            return prefix + '/api/asset?u=' + encodeURIComponent(abs) + suffix;
          }
          return prefix + '/api/xp?u=' + encodeURIComponent(abs) + suffix;
        }
      );
      
      // Rewrite anchor hrefs to use proxy path
      html = html.replace(
        /(<a[^>]*href=["'])([^"']+)(["'])/gi,
        (match, prefix, url, suffix) => {
          const decodedUrl = decodeHtmlEntities(url);
          if (decodedUrl.startsWith('#') || decodedUrl.startsWith('javascript:') || decodedUrl.startsWith('mailto:') || decodedUrl.startsWith('tel:') || decodedUrl.startsWith('/w/')) {
            return match;
          }
          try {
            const abs = resolveUrl(url, baseUrl, currentPath);
            const u = new URL(abs);
            return prefix + '/w/' + u.hostname + u.pathname + u.search + suffix;
          } catch(e) { return match; }
        }
      );
      
      // Inject script at start of head
      if (html.includes('<head')) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${spaScript}`);
      } else {
        html = `<!DOCTYPE html><html><head>${baseTag}${spaScript}</head><body>${html}</body></html>`;
      }
      
      res.send(html);
    } catch (error) {
      console.error("Path proxy error:", error);
      res.status(500).send("Proxy error");
    }
  });

  // Keep the old query-based proxy for backward compatibility
  app.get("/api/p", async (req, res) => {
    try {
      const encoded = req.query.q as string;
      if (!encoded) {
        return res.status(400).send("Missing parameter");
      }
      
      const url = decodeUrl(encoded);
      console.log("Decoded URL:", url, "from:", encoded.substring(0, 20) + "...");
      
      if (!url) {
        console.log("Empty URL after decode");
        return res.status(400).send("Invalid request");
      }
      
      const clientIp = req.ip || 'unknown';
      
      const now = Date.now();
      const requests = proxyRateLimit.get(clientIp) || [];
      const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
      
      if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).send("Rate limit exceeded");
      }
      
      recentRequests.push(now);
      proxyRateLimit.set(clientIp, recentRequests);

      const targetUrl = url.startsWith("http") ? url : `https://${url}`;
      console.log("Target URL:", targetUrl);
      
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        console.log("Invalid URL:", targetUrl);
        return res.status(400).send("Invalid");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      console.log("Hostname:", parsedUrl.hostname);
      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        console.log("Blocked as private address:", parsedUrl.hostname);
        return res.status(403).send("Not allowed");
      }

      let response: Response | null = null;
      let html = '';

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetchWithRetry(targetUrl, attempt);
          if (response.ok) {
            html = await response.text();
            if (!isBlockPage(html)) {
              break;
            }
          }
        } catch (err) {
          // continue trying
        }
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }

      if (!response) {
        console.log("No response received");
        return res.status(500).send("Could not connect to site");
      }
      
      // Even if response is not 200, try to show the content
      // Many sites return 403 but still have viewable content
      if (!response.ok && !html) {
        try {
          html = await response.text();
        } catch (e) {
          console.log("Could not read error response body");
        }
      }
      
      if (!html) {
        console.log("No HTML content received, status:", response.status);
        return res.status(response.status).send("Site returned error: " + response.status);
      }

      const contentType = response.headers.get('content-type') || 'text/html';
      
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-XSS-Protection');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const domain = parsedUrl.hostname;
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      
      const frameBypassScript = `
<script>
(function() {
  try {
    var B="${baseUrl}";
    var P="${parsedUrl.protocol}";
    var D="${domain}";
    
    // Bypass frame detection
    Object.defineProperty(window, 'top', { get: function() { return window.self; }, configurable: false });
    Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: false });
    Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: false });
    
    // Spoof location to match target origin (critical for SPA routing)
    var fakeLocation = new URL(B);
    try {
      Object.defineProperty(document, 'domain', { get: function() { return D; }, configurable: true });
    } catch(e) {}
    
    // URL encoding for proxy
    function encodeForProxy(url) {
      try {
        if (!url || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('blob:') || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
        if (url.startsWith('/api/p')) return url;
        if (url.startsWith('#')) return url;
        var abs = url;
        if (url.startsWith('//')) abs = P + url;
        else if (url.startsWith('/')) abs = B + url;
        else if (!url.startsWith('http')) abs = B + '/' + url;
        var rev = abs.split('').reverse().join('');
        var enc = btoa(rev).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
        return '/api/p?q=' + enc;
      } catch(e) { return url; }
    }
    
    // Helper to make URL absolute
    function makeAbs(url) {
      if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) return url;
      if (url.startsWith('//')) return P + url;
      if (url.startsWith('/')) return B + url;
      if (!url.startsWith('http')) return B + '/' + url;
      return url;
    }
    
    // Check if URL is same-origin (for SPA routing)
    function isSameOrigin(url) {
      try {
        if (url.startsWith('#') || url.startsWith('/')) return true;
        var parsed = new URL(url, B);
        return parsed.origin === B || parsed.hostname === D;
      } catch(e) { return false; }
    }
    
    // Check if URL is for media content (use streaming endpoint)
    function isMediaUrl(url) {
      if (!url) return false;
      var lower = url.toLowerCase();
      var mediaExts = ['.mp4','.webm','.mp3','.wav','.ogg','.m3u8','.ts','.m4a','.flac','.mkv','.avi','.mov'];
      for (var i = 0; i < mediaExts.length; i++) {
        if (lower.includes(mediaExts[i])) return true;
      }
      return false;
    }
    
    // XHR proxy - route through /api/xp (or /api/stream for media)
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
      var absUrl = makeAbs(url);
      var endpoint = isMediaUrl(absUrl) ? '/api/stream' : '/api/xp';
      var proxyUrl = endpoint + '?u=' + encodeURIComponent(absUrl);
      return origOpen.call(this, method, proxyUrl, async !== false, user, pass);
    };
    
    // Fetch proxy - route through /api/xp (or /api/stream for media)
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : null);
        if (url && !url.startsWith('/api/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
          var absUrl = makeAbs(url);
          var endpoint = isMediaUrl(absUrl) ? '/api/stream' : '/api/xp';
          var proxyUrl = endpoint + '?u=' + encodeURIComponent(absUrl);
          var newInit = init ? Object.assign({}, init) : {};
          // Preserve method and body from Request objects
          if (input && typeof input === 'object' && input.method) {
            newInit.method = newInit.method || input.method;
          }
          return origFetch.call(this, proxyUrl, newInit);
        }
      } catch(e) {}
      return origFetch.apply(this, arguments);
    };
    
    // History API shim - let SPAs manage their own routing
    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;
    history.pushState = function(state, title, url) {
      // Allow internal routing to proceed normally
      return origPushState.apply(this, arguments);
    };
    history.replaceState = function(state, title, url) {
      return origReplaceState.apply(this, arguments);
    };
    
    // Intercept form submissions
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      var action = form.getAttribute('action') || '';
      if (action.startsWith('/api/p')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      var targetUrl = action;
      if (action.startsWith('//')) targetUrl = P + action;
      else if (action.startsWith('/')) targetUrl = B + action;
      else if (!action.startsWith('http')) targetUrl = B + '/' + action;
      
      if ((form.method || 'get').toLowerCase() === 'get') {
        var fd = new FormData(form);
        var params = new URLSearchParams(fd).toString();
        var fullUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + params;
        window.location.href = encodeForProxy(fullUrl);
      } else {
        var newForm = document.createElement('form');
        newForm.method = 'POST';
        newForm.action = '/api/pf';
        var urlInput = document.createElement('input');
        urlInput.type = 'hidden';
        urlInput.name = '_target_url';
        urlInput.value = targetUrl;
        newForm.appendChild(urlInput);
        var fd = new FormData(form);
        for (var pair of fd.entries()) {
          var inp = document.createElement('input');
          inp.type = 'hidden';
          inp.name = pair[0];
          inp.value = pair[1];
          newForm.appendChild(inp);
        }
        document.body.appendChild(newForm);
        newForm.submit();
      }
    }, true);
    
    // Smart link click handler - allow SPA routing for same-origin
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      var link = target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      
      // Allow hash links and javascript: to pass through
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      
      // Already proxied
      if (href.startsWith('/api/p')) return;
      
      // For same-origin relative links, let the SPA router handle it if present
      // This allows React Router, Next.js, etc. to work
      if (href.startsWith('/') && !href.startsWith('//')) {
        // Check if there's an SPA router listening
        if (window.__NEXT_DATA__ || window.__remixContext || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          // Let the SPA handle internal navigation
          return;
        }
      }
      
      // External or cross-origin links go through proxy
      e.preventDefault();
      e.stopPropagation();
      window.location.href = encodeForProxy(href);
    }, true);
    
  } catch(e) { console.error('Proxy script error:', e); }
})();
</script>`;

      let modifiedHtml = html;

      // Replace existing base tag with one pointing to target origin
      // This helps SPAs resolve their internal routes correctly
      modifiedHtml = modifiedHtml.replace(/<base[^>]*>/gi, '');
      const baseTag = `<base href="${baseUrl}/">`;

      // Frame bypass patterns
      modifiedHtml = modifiedHtml
        .replace(/if\s*\(\s*(?:window\.)?(?:top|parent)\s*!==?\s*(?:window\.)?self\s*\)/gi, 'if(false)')
        .replace(/if\s*\(\s*(?:window\.)?self\s*!==?\s*(?:window\.)?(?:top|parent)\s*\)/gi, 'if(false)')
        .replace(/(?:window\.)?top\.location\s*=/gi, 'void 0;//')
        .replace(/(?:window\.)?parent\.location\s*=/gi, 'void 0;//');

      // Rewrite relative URLs to absolute through our proxy
      const rewriteUrl = (originalUrl: string): string => {
        if (!originalUrl || originalUrl.startsWith('data:') || originalUrl.startsWith('javascript:') || originalUrl.startsWith('#') || originalUrl.startsWith('mailto:') || originalUrl.startsWith('tel:')) {
          return originalUrl;
        }
        let absoluteUrl = originalUrl;
        if (originalUrl.startsWith('//')) {
          absoluteUrl = parsedUrl.protocol + originalUrl;
        } else if (originalUrl.startsWith('/')) {
          absoluteUrl = baseUrl + originalUrl;
        } else if (!originalUrl.startsWith('http')) {
          absoluteUrl = baseUrl + '/' + originalUrl;
        }
        const encodedTarget = encodeUrlServer(absoluteUrl);
        return `/api/p?q=${encodedTarget}`;
      };

      // Rewrite href and src attributes to go through proxy
      modifiedHtml = modifiedHtml.replace(
        /(<a\s+[^>]*href=["'])([^"']+)(["'])/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
            return match;
          }
          return prefix + rewriteUrl(url) + suffix;
        }
      );

      // Helper to check if URL is media content (streaming)
      const isMediaUrl = (url: string): boolean => {
        const lower = url.toLowerCase();
        const mediaExts = ['.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m3u8', '.ts', '.m4a', '.flac', '.mkv', '.avi', '.mov'];
        return mediaExts.some(ext => lower.includes(ext));
      };
      
      // Helper to check if URL is a cacheable static asset
      const isCacheableAsset = (url: string): boolean => {
        const lower = url.toLowerCase().split('?')[0].split('#')[0];
        const cacheableExts = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'];
        return cacheableExts.some(ext => lower.endsWith(ext));
      };
      
      // Rewrite resource URLs - route through optimized endpoints
      modifiedHtml = modifiedHtml.replace(
        /(<(?:img|script|link|source|video|audio|iframe)\s+[^>]*(?:src|href)=["'])([^"']+)(["'])/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('data:') || url.startsWith('javascript:')) {
            return match;
          }
          
          // Make URL absolute
          let absoluteUrl = url;
          if (url.startsWith('//')) {
            absoluteUrl = parsedUrl.protocol + url;
          } else if (url.startsWith('/')) {
            absoluteUrl = baseUrl + url;
          } else if (!url.startsWith('http')) {
            absoluteUrl = baseUrl + '/' + url;
          }
          
          // Route video/audio sources through streaming endpoint
          if (isMediaUrl(absoluteUrl) || prefix.toLowerCase().includes('video') || prefix.toLowerCase().includes('audio') || prefix.toLowerCase().includes('source')) {
            return prefix + '/api/stream?u=' + encodeURIComponent(absoluteUrl) + suffix;
          }
          
          // Route cacheable assets through cached endpoint for better performance
          if (isCacheableAsset(absoluteUrl)) {
            return prefix + '/api/asset?u=' + encodeURIComponent(absoluteUrl) + suffix;
          }
          
          // Other resources use proxy
          return prefix + '/api/xp?u=' + encodeURIComponent(absoluteUrl) + suffix;
        }
      );

      // CRITICAL: Remove/obfuscate all occurrences of the domain name in text content
      // This uses ROT13 encoding so "reddit" becomes "erqqvg" which won't match filters
      modifiedHtml = obfuscateAllDomains(modifiedHtml, domain);

      // Inject our script and base tag at the start of head
      if (modifiedHtml.includes('<head')) {
        modifiedHtml = modifiedHtml.replace(
          /<head([^>]*)>/i,
          `<head$1>${baseTag}${frameBypassScript}`
        );
      } else {
        modifiedHtml = `<!DOCTYPE html><html><head>${baseTag}${frameBypassScript}</head><body>${modifiedHtml}</body></html>`;
      }
      
      res.send(modifiedHtml);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error");
    }
  });

  // Universal fetch proxy - forwards any request through our server with STREAMING
  app.all("/api/xp", async (req, res) => {
    try {
      const targetUrl = req.query.u as string;
      if (!targetUrl) {
        return res.status(400).json({ error: "Missing URL" });
      }

      const clientIp = req.ip || 'unknown';
      const now = Date.now();
      const requests = proxyRateLimit.get(clientIp) || [];
      const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
      
      if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }
      
      recentRequests.push(now);
      proxyRateLimit.set(clientIp, recentRequests);

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL" });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: "Invalid protocol" });
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).json({ error: "Not allowed" });
      }

      // Forward the request with full headers for better compatibility
      const headers: Record<string, string> = {
        'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
        'Accept': req.headers.accept as string || '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Request uncompressed for streaming
      };

      // Forward content-type for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      }

      let body: string | Buffer | undefined;
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const rawBody = (req as any).rawBody as Buffer | undefined;
        if (rawBody) {
          body = rawBody;
        } else if (typeof req.body === 'object') {
          body = JSON.stringify(req.body);
          headers['Content-Type'] = 'application/json';
        }
      }

      // Use a longer timeout for streaming - don't abort active transfers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        // Only abort if we haven't started receiving data
        if (!res.headersSent) controller.abort();
      }, 30000);
      
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId); // Cancel timeout once we have a response

      // Forward response headers (filtered)
      const safeHeaders = ['content-type', 'cache-control', 'etag', 'last-modified'];
      for (const header of safeHeaders) {
        const value = response.headers.get(header);
        if (value) res.setHeader(header, value);
      }
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(response.status);

      // STREAM the response body directly for faster delivery with backpressure
      if (response.body) {
        const reader = response.body.getReader();
        
        const pump = async (): Promise<void> => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (res.writableEnded) break;
              
              const chunk = Buffer.from(value);
              const canContinue = res.write(chunk);
              
              // Handle backpressure - wait for drain if buffer is full
              if (!canContinue) {
                await new Promise<void>(resolve => res.once('drain', resolve));
              }
            }
            if (!res.writableEnded) res.end();
          } catch (err) {
            if (!res.writableEnded) res.end();
          }
        };
        
        // Handle client disconnect
        res.on('close', () => reader.cancel());
        await pump();
      } else {
        // Fallback for responses without streaming body
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error("XP proxy error:", error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Proxy error" });
      }
    }
  });
  
  // Dedicated streaming media proxy for images, videos, and large files
  app.get("/api/stream", async (req, res) => {
    try {
      const targetUrl = req.query.u as string;
      if (!targetUrl) {
        return res.status(400).send("Missing URL");
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Not allowed");
      }

      // Support range requests for video seeking
      const rangeHeader = req.headers.range;
      const headers: Record<string, string> = {
        'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
        'Accept': '*/*',
      };
      
      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }

      // No hard timeout for media - let it stream until complete
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        // Only abort if we haven't started receiving data
        if (!res.headersSent) controller.abort();
      }, 30000);
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId); // Cancel timeout once we have a response

      // Forward important headers for media playback
      const mediaHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
      for (const header of mediaHeaders) {
        const value = response.headers.get(header);
        if (value) res.setHeader(header, value);
      }
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      res.status(response.status);

      // Stream media content with backpressure handling
      if (response.body) {
        const reader = response.body.getReader();
        
        const pump = async (): Promise<void> => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (res.writableEnded) break;
              
              const chunk = Buffer.from(value);
              const canContinue = res.write(chunk);
              
              // Handle backpressure - wait for drain if buffer is full
              if (!canContinue) {
                await new Promise<void>(resolve => res.once('drain', resolve));
              }
            }
            if (!res.writableEnded) res.end();
          } catch (err) {
            if (!res.writableEnded) res.end();
          }
        };
        
        // Handle client disconnect
        res.on('close', () => reader.cancel());
        await pump();
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error("Stream proxy error:", error.message);
      if (!res.headersSent) {
        res.status(500).send("Stream error");
      }
    }
  });

  // SSE (Server-Sent Events) proxy for real-time streaming (ChatGPT, etc.)
  app.get("/api/sse", async (req, res) => {
    try {
      const targetUrl = req.query.u as string;
      if (!targetUrl) {
        return res.status(400).send("Missing URL");
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Not allowed");
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        res.write(`event: error\ndata: ${response.status}\n\n`);
        return res.end();
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done || res.writableEnded) break;
              
              const text = decoder.decode(value, { stream: true });
              res.write(text);
            }
            if (!res.writableEnded) res.end();
          } catch (err) {
            if (!res.writableEnded) res.end();
          }
        };

        res.on('close', () => reader.cancel());
        await pump();
      } else {
        res.end();
      }
    } catch (error: any) {
      console.error("SSE proxy error:", error.message);
      if (!res.headersSent) {
        res.status(500).send("SSE error");
      }
    }
  });

  // Cached asset endpoint for faster repeat loads
  app.get("/api/asset", async (req, res) => {
    try {
      let targetUrl = req.query.u as string;
      if (!targetUrl) {
        return res.status(400).send("Missing URL");
      }
      
      // Decode HTML entities that might be in the URL
      targetUrl = targetUrl
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
      
      console.log("Asset request:", targetUrl.substring(0, 100));

      // Check cache first
      const cached = assetCache.get(targetUrl);
      const clientEtag = req.headers['if-none-match'];
      
      if (cached && (Date.now() - cached.timestamp < CACHE_MAX_AGE)) {
        if (clientEtag && clientEtag === cached.etag) {
          return res.status(304).end();
        }
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('ETag', cached.etag);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(cached.data);
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Not allowed");
      }

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return res.status(response.status).send("Fetch failed");
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const etag = `"${Buffer.from(targetUrl).toString('base64').slice(0, 16)}-${buffer.length}"`;

      // Cache for repeat requests
      cleanCache();
      assetCache.set(targetUrl, {
        data: buffer,
        contentType,
        etag,
        timestamp: Date.now()
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
    } catch (error: any) {
      console.error("Asset proxy error:", error.message);
      if (!res.headersSent) {
        res.status(500).send("Asset error");
      }
    }
  });

  // POST form proxy endpoint
  app.post("/api/pf", async (req, res) => {
    try {
      const targetUrl = req.body._target_url as string;
      if (!targetUrl) {
        return res.status(400).send("Missing target URL");
      }
      
      const clientIp = req.ip || 'unknown';
      const now = Date.now();
      const requests = proxyRateLimit.get(clientIp) || [];
      const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
      
      if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).send("Rate limit exceeded");
      }
      
      recentRequests.push(now);
      proxyRateLimit.set(clientIp, recentRequests);

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid protocol");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Not allowed");
      }

      // Build form data from request body (excluding _target_url)
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(req.body)) {
        if (key !== '_target_url') {
          formData.append(key, String(value));
        }
      }

      const ua = userAgents[0];
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: formData.toString(),
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        return res.status(response.status).send("Request failed");
      }

      let html = await response.text();
      
      const domain = parsedUrl.hostname;
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

      // Inject the same frame bypass script
      const frameBypassScript = `
<script>
(function() {
  try {
    var B="${baseUrl}";
    var P="${parsedUrl.protocol}";
    Object.defineProperty(window, 'top', { get: function() { return window.self; }, configurable: false });
    Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: false });
    Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: false });
    function encodeForProxy(url) {
      try {
        if (!url || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('/api/p')) return url;
        var abs = url;
        if (url.startsWith('//')) abs = P + url;
        else if (url.startsWith('/')) abs = B + url;
        else if (!url.startsWith('http')) abs = B + '/' + url;
        var rev = abs.split('').reverse().join('');
        var enc = btoa(rev).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
        return '/api/p?q=' + enc;
      } catch(e) { return url; }
    }
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      var link = target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('/api/p')) return;
      e.preventDefault();
      window.location.href = encodeForProxy(href);
    }, true);
  } catch(e) {}
})();
</script>`;

      // Inject script
      if (html.includes('<head')) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>${frameBypassScript}`);
      } else {
        html = `<!DOCTYPE html><html><head>${frameBypassScript}</head><body>${html}</body></html>`;
      }

      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("POST proxy error:", error);
      res.status(500).send("Error");
    }
  });

  app.get("/api/proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      const clientIp = req.ip || 'unknown';
      
      const now = Date.now();
      const requests = proxyRateLimit.get(clientIp) || [];
      const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
      
      if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).send("Rate limit exceeded. Please try again later.");
      }
      
      recentRequests.push(now);
      proxyRateLimit.set(clientIp, recentRequests);
      
      if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
      }

      const targetUrl = url.startsWith("http") ? url : `https://${url}`;
      
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch (e) {
        return res.status(400).send("Invalid URL");
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).send("Only HTTP and HTTPS protocols are allowed");
      }

      if (isPrivateOrLocalAddress(parsedUrl.hostname)) {
        return res.status(403).send("Access to private or local addresses is not allowed");
      }

      let response: Response | null = null;
      let html = '';
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetchWithRetry(targetUrl, attempt);
          if (response.ok) {
            html = await response.text();
            if (!isBlockPage(html)) {
              break;
            }
          }
        } catch (err) {
          lastError = err as Error;
        }
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }

      if (!response || !response.ok) {
        if (lastError?.name === 'AbortError') {
          return res.status(504).send("Request timeout");
        }
        return res.status(response?.status || 500).send(`Failed to fetch: ${response?.statusText || 'Unknown error'}`);
      }

      const contentType = response.headers.get('content-type') || 'text/html';
      
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-XSS-Protection');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      
      const frameBypassScript = `
<script>
(function() {
  try {
    Object.defineProperty(window, 'top', { get: function() { return window.self; }, configurable: false });
    Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: false });
    Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: false });
    Object.defineProperty(document, 'referrer', { get: function() { return ''; }, configurable: false });
    
    window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); return undefined; }, true);
    window.addEventListener('unload', function(e) { e.stopImmediatePropagation(); }, true);
    
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
      arguments[1] = arguments[1] || '';
      if (arguments[1].startsWith('/')) {
        arguments[1] = '${baseUrl}' + arguments[1];
      }
      return origOpen.apply(this, arguments);
    };
    
    var origFetch = window.fetch;
    window.fetch = function(url, opts) {
      if (typeof url === 'string' && url.startsWith('/')) {
        url = '${baseUrl}' + url;
      }
      return origFetch.call(this, url, opts);
    };
    
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      Object.defineProperty(window.location, 'ancestorOrigins', { get: function() { return []; } });
    }
  } catch(e) {}
})();
</script>`;

      let modifiedHtml = html
        .replace(/if\s*\(\s*(?:window\.)?(?:top|parent)\s*!==?\s*(?:window\.)?self\s*\)/gi, 'if(false)')
        .replace(/if\s*\(\s*(?:window\.)?self\s*!==?\s*(?:window\.)?(?:top|parent)\s*\)/gi, 'if(false)')
        .replace(/(?:window\.)?top\.location\s*[!=]==/gi, 'null==')
        .replace(/(?:window\.)?parent\.location\s*[!=]==/gi, 'null==')
        .replace(/(?:window\.)?top\.location\s*=/gi, 'void 0;//')
        .replace(/(?:window\.)?parent\.location\s*=/gi, 'void 0;//')
        .replace(/window\.top\s*&&/gi, 'false &&')
        .replace(/window\.parent\s*&&/gi, 'false &&')
        .replace(/inIframe|isIframe|inFrame|isFrame/gi, 'false')
        .replace(/frameElement/gi, 'null');

      modifiedHtml = modifiedHtml.replace(
        /(<a\s+[^>]*href=["'])(?!https?:\/\/|javascript:|mailto:|tel:|#|data:)([^"']+)/gi,
        `$1${baseUrl}$2`
      );
      
      modifiedHtml = modifiedHtml.replace(
        /(<(?:img|script|link|source|video|audio)\s+[^>]*(?:src|href)=["'])(?!https?:\/\/|javascript:|data:)([^"']+)/gi,
        `$1${baseUrl}$2`
      );

      modifiedHtml = modifiedHtml.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${targetUrl}">${frameBypassScript}`
      );
      
      if (!modifiedHtml.includes('<head')) {
        modifiedHtml = `<!DOCTYPE html><html><head><base href="${targetUrl}">${frameBypassScript}</head><body>${modifiedHtml}</body></html>`;
      }
      
      res.send(modifiedHtml);
    } catch (error) {
      console.error("Proxy error:", error);
      if (error instanceof Error && error.name === 'AbortError') {
        res.status(504).send("Request timeout");
      } else {
        res.status(500).send("Failed to load webpage");
      }
    }
  });

  app.get("/api/resource", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).send("URL required");
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgents[0],
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch resource");
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      res.status(500).send("Failed to fetch resource");
    }
  });

  app.post("/api/history", async (req, res) => {
    try {
      const { url, title } = req.body;
      
      if (!url || !title) {
        return res.status(400).json({ error: "URL and title are required" });
      }

      const item = await storage.addHistoryItem({ url, title });
      res.json(item);
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ error: "Failed to save history" });
    }
  });

  app.get("/api/history", async (_req, res) => {
    try {
      const history = await storage.getHistory();
      res.json(history);
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ error: "Failed to get history" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket tunneling for real-time connections
  const wss = new WebSocketServer({ server: httpServer, path: '/api/ws' });
  
  wss.on('connection', (clientWs, req) => {
    const parsedReqUrl = new URL(req.url || '', 'http://localhost');
    const urlParam = parsedReqUrl.searchParams.get('u');
    const originParam = parsedReqUrl.searchParams.get('origin'); // Allow custom origin
    
    if (!urlParam) {
      clientWs.close(1008, 'Missing URL');
      return;
    }

    // Handle WebSocket URL - ensure it's wss:// or ws://
    let wsUrl = urlParam;
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
      wsUrl = 'wss://' + wsUrl;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(wsUrl);
    } catch (e) {
      console.error('Invalid WebSocket URL:', wsUrl);
      clientWs.close(1008, 'Invalid URL');
      return;
    }

    // For game servers that connect to raw IPs, use the provided origin or detect common games
    let origin = originParam || targetUrl.origin;
    const path = targetUrl.pathname;
    
    // Detect slither.io game servers (they use /ptc or /slither paths on raw IPs)
    if (path === '/ptc' || path === '/slither') {
      origin = 'http://slither.io';
    }

    // Reject IPv6 connections immediately - Replit doesn't support IPv6
    if (wsUrl.includes('[')) {
      console.log('WebSocket: Rejecting IPv6 address (not supported):', wsUrl.substring(0, 50));
      clientWs.close(1011, 'IPv6 not supported');
      return;
    }
    
    console.log('WebSocket proxy connecting to:', wsUrl, 'with origin:', origin);
    
    let serverWs: WebSocket;
    try {
      serverWs = new WebSocket(wsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': origin,
          'Host': targetUrl.host,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        handshakeTimeout: 15000,
        family: 4, // Always force IPv4
        perMessageDeflate: false, // Disable compression for binary protocols
      });
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      clientWs.close(1011, 'Connection failed');
      return;
    }

    serverWs.on('open', () => {
      console.log('WebSocket tunnel opened to:', targetUrl.hostname);
    });

    serverWs.on('message', (data, isBinary) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    serverWs.on('close', (code, reason) => {
      console.log('Server WebSocket closed:', code, reason.toString());
      if (clientWs.readyState === WebSocket.OPEN) {
        // Use valid close code (1006 is reserved and can't be sent)
        const safeCode = (code >= 1000 && code <= 1003) || (code >= 3000 && code <= 4999) ? code : 1000;
        clientWs.close(safeCode, reason.toString().slice(0, 123));
      }
    });

    serverWs.on('error', (err) => {
      console.error('Server WS error:', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'Server error');
      }
    });

    clientWs.on('message', (data, isBinary) => {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(data, { binary: isBinary });
      }
    });

    clientWs.on('close', () => {
      console.log('Client WebSocket closed');
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.close();
      }
    });

    clientWs.on('error', (err) => {
      console.error('Client WS error:', err.message);
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.close();
      }
    });
  });

  return httpServer;
}

function getDemoSearchResults(query: string): Array<{ title: string; url: string; description: string; favicon?: string }> {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 1);
  
  const allResults = [
    {
      title: "Wikipedia - The Free Encyclopedia",
      url: "https://www.wikipedia.org",
      description: "Wikipedia is a free online encyclopedia, created and edited by volunteers around the world and hosted by the Wikimedia Foundation.",
      favicon: "https://www.google.com/s2/favicons?domain=wikipedia.org&sz=32"
    },
    {
      title: "GitHub: Let's build from here",
      url: "https://github.com",
      description: "GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code, and more.",
      favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=32"
    },
    {
      title: "Stack Overflow - Where Developers Learn, Share, & Build Careers",
      url: "https://stackoverflow.com",
      description: "Stack Overflow is the largest, most trusted online community for developers to learn, share their programming knowledge, and build their careers.",
      favicon: "https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=32"
    },
    {
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      description: "The MDN Web Docs site provides information about Open Web technologies including HTML, CSS, and APIs for both Web sites and progressive web apps.",
      favicon: "https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=32"
    },
    {
      title: "YouTube",
      url: "https://www.youtube.com",
      description: "Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.",
      favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32"
    },
    {
      title: "Reddit - Dive into anything",
      url: "https://www.reddit.com",
      description: "Reddit is a network of communities where people can dive into their interests, hobbies and passions. There's a community for whatever you're interested in.",
      favicon: "https://www.google.com/s2/favicons?domain=reddit.com&sz=32"
    },
    {
      title: "Twitter / X",
      url: "https://twitter.com",
      description: "From breaking news and entertainment to sports and politics, get the full story with all the live commentary.",
      favicon: "https://www.google.com/s2/favicons?domain=twitter.com&sz=32"
    },
    {
      title: "LinkedIn: Log In or Sign Up",
      url: "https://www.linkedin.com",
      description: "750 million+ members | Manage your professional identity. Build and engage with your professional network. Access knowledge, insights and opportunities.",
      favicon: "https://www.google.com/s2/favicons?domain=linkedin.com&sz=32"
    },
    {
      title: "Amazon.com: Online Shopping",
      url: "https://www.amazon.com",
      description: "Free shipping on millions of items. Get the best of Shopping and Entertainment with Prime. Enjoy low prices and great deals on the largest selection.",
      favicon: "https://www.google.com/s2/favicons?domain=amazon.com&sz=32"
    },
    {
      title: "Google",
      url: "https://www.google.com",
      description: "Search the world's information, including webpages, images, videos and more. Google has many special features to help you find exactly what you're looking for.",
      favicon: "https://www.google.com/s2/favicons?domain=google.com&sz=32"
    },
    {
      title: "The New York Times - Breaking News, US News, World News",
      url: "https://www.nytimes.com",
      description: "Live news, investigations, opinion, photos and video by the journalists of The New York Times from more than 150 countries around the world.",
      favicon: "https://www.google.com/s2/favicons?domain=nytimes.com&sz=32"
    },
    {
      title: "BBC - Homepage",
      url: "https://www.bbc.com",
      description: "Breaking news, sport, TV, radio and a whole lot more. The BBC informs, educates and entertains - wherever you are, whatever your age.",
      favicon: "https://www.google.com/s2/favicons?domain=bbc.com&sz=32"
    },
    {
      title: "Netflix - Watch TV Shows Online, Watch Movies Online",
      url: "https://www.netflix.com",
      description: "Watch Netflix movies & TV shows online or stream right to your smart TV, game console, PC, Mac, mobile, tablet and more.",
      favicon: "https://www.google.com/s2/favicons?domain=netflix.com&sz=32"
    },
    {
      title: "Spotify - Web Player: Music for everyone",
      url: "https://open.spotify.com",
      description: "Spotify is a digital music service that gives you access to millions of songs.",
      favicon: "https://www.google.com/s2/favicons?domain=spotify.com&sz=32"
    },
    {
      title: "Medium – Get smarter about what matters to you",
      url: "https://medium.com",
      description: "Medium is an open platform where readers find dynamic thinking, and where expert and undiscovered voices can share their writing on any topic.",
      favicon: "https://www.google.com/s2/favicons?domain=medium.com&sz=32"
    },
    {
      title: "Khan Academy | Free Online Courses, Lessons & Practice",
      url: "https://www.khanacademy.org",
      description: "Learn for free about math, art, computer programming, economics, physics, chemistry, biology, medicine, finance, history, and more.",
      favicon: "https://www.google.com/s2/favicons?domain=khanacademy.org&sz=32"
    }
  ];

  const scored = allResults.map(result => {
    const titleLower = result.title.toLowerCase();
    const descLower = result.description.toLowerCase();
    const urlLower = result.url.toLowerCase();
    const combined = `${titleLower} ${descLower} ${urlLower}`;
    
    let score = 0;
    
    if (titleLower.includes(lowerQuery)) score += 100;
    if (descLower.includes(lowerQuery)) score += 50;
    if (urlLower.includes(lowerQuery)) score += 75;
    
    for (const word of queryWords) {
      if (titleLower.includes(word)) score += 30;
      if (descLower.includes(word)) score += 15;
      if (urlLower.includes(word)) score += 20;
    }
    
    const categories: { [key: string]: string[] } = {
      'video': ['youtube', 'netflix', 'streaming', 'watch', 'movie', 'film', 'tv', 'show'],
      'social': ['twitter', 'reddit', 'linkedin', 'facebook', 'social', 'post', 'share', 'friends'],
      'shopping': ['amazon', 'buy', 'shop', 'store', 'price', 'deal', 'product'],
      'news': ['nytimes', 'bbc', 'news', 'article', 'breaking', 'world', 'politics'],
      'learning': ['wikipedia', 'khan', 'mdn', 'learn', 'education', 'course', 'tutorial', 'study', 'school'],
      'code': ['github', 'stackoverflow', 'developer', 'programming', 'code', 'coding', 'dev', 'software'],
      'music': ['spotify', 'music', 'song', 'playlist', 'audio', 'listen'],
      'reading': ['medium', 'blog', 'article', 'read', 'writing', 'story'],
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (queryWords.some(w => keywords.includes(w))) {
        if (keywords.some(k => combined.includes(k))) {
          score += 40;
        }
      }
    }
    
    return { result, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  const topResults = scored.filter(s => s.score > 0).slice(0, 12);
  
  if (topResults.length >= 4) {
    return topResults.map(s => s.result);
  }
  
  return scored.slice(0, 8).map(s => s.result);
}

async function fetchBraveSearchResults(query: string, apiKey: string): Promise<Array<{ title: string; url: string; description: string; favicon?: string }>> {
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
    headers: {
      'X-Subscription-Token': apiKey,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.web?.results) {
    throw new Error("No results from Brave Search");
  }
  
  return data.web.results.slice(0, 12).map((result: any) => ({
    title: result.title || '',
    url: result.url || '',
    description: result.description || '',
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=32`
  }));
}

async function fetchSerpApiResults(query: string, apiKey: string): Promise<Array<{ title: string; url: string; description: string; favicon?: string }>> {
  const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`);
  
  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.organic_results) {
    throw new Error("No results from SerpAPI");
  }
  
  return data.organic_results.slice(0, 12).map((result: any) => ({
    title: result.title || '',
    url: result.link || '',
    description: result.snippet || '',
    favicon: result.favicon ? `data:image/png;base64,${result.favicon}` : undefined
  }));
}

function isPrivateOrLocalAddress(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return true;
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  
  if (match) {
    const octets = match.slice(1, 5).map(Number);
    
    if (octets.some(octet => octet > 255)) {
      return false;
    }
    
    if (octets[0] === 127) return true;
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
    if (octets[0] === 0) return true;
    if (octets[0] >= 224) return true;
  }

  if (hostname.includes(':') || hostname === '::1' || hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
    return true;
  }

  return false;
}
