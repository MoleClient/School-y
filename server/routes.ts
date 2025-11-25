import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchResultSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
  const MAX_REQUESTS_PER_WINDOW = 30;

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

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'text/html';
      res.setHeader('Content-Type', contentType);
      
      const html = await response.text();
      
      const modifiedHtml = html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${targetUrl}">`
      );
      
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
