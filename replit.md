# School-y - Google-Inspired Web Browser Platform

A web browser platform designed to look like Google's homepage, featuring a clean search interface with actual search results and an embedded webpage viewer.

## Features

- **Google-Style Homepage**: Clean white design with centered Google logo, rounded search bar, and "Google Search" / "I'm Feeling Lucky" buttons
- **Real Search Results**: Google-style search results layout with favicons, blue titles, green URLs, and descriptions
- **Beta AI Overview**: AI-powered search summary panel (requires API key + model name configuration)
- **Embedded Webpage Viewer**: View websites without redirecting using advanced iframe + proxy technology
- **No Authentication**: Direct access with no password block
- **URL Obfuscation**: Domain names are XOR-encoded and base64-encoded to evade content filter detection
- **Video Streaming**: Range header support for YouTube and other video sites with chunked transfer
- **Real-time Support**: WebSocket tunneling and SSE proxy for chat apps, live updates, and streaming content
- **Remote Browser**: Puppeteer-based fallback for complex SPAs (ChatGPT, Claude, Discord, etc.)

## Design Theme

The application uses a Google-inspired clean design:
- **Primary Color**: Google Blue `hsl(215, 89%, 43%)` / `#0B57D0`
- **Background**: White `#FFFFFF`
- **Typography**: Arial/Roboto, clean and minimal
- **Search Bar**: Rounded pill shape with subtle border and shadow
- **Results Page**: Left-aligned single column, Google-style result cards

## Architecture

### Frontend
- React SPA with Wouter routing
- Shadcn UI components with Google-style custom styling
- TanStack Query for data fetching and caching
- Tailwind CSS with clean light theme

### Backend
- Express.js server
- Search API integration (Brave Search or SerpAPI, with demo fallback)
- **Ultraviolet Proxy** for SPAs (React apps like ChatGPT)
- Legacy CORS proxy fallback for simpler sites
- Remote browser (Puppeteer) for complex SPAs
- In-memory storage for browser history

### Proxy System
The browser uses multiple proxy methods:
1. **Ultraviolet (UV) Proxy** - Primary method for modern SPAs. Uses service worker at `/service/` with epoxy transport via wisp WebSocket.
2. **Legacy Proxy** - Fallback at `/b/` path for simpler sites.
3. **Remote Browser** - Puppeteer-based screenshot streaming via WebSocket for complex SPAs that block proxies.

## Search Configuration

### Option 1: Brave Search API (Recommended)
1. Get a free API key from [Brave Search API](https://brave.com/search/api/)
2. Add to your environment: `BRAVE_SEARCH_API_KEY=your_key_here`

### Option 2: SerpAPI
1. Get an API key from [SerpAPI](https://serpapi.com/)
2. Add to your environment: `SERPAPI_KEY=your_key_here`

### Demo Mode
Without API keys, School-y runs in demo mode with curated search results.

## AI Overview (Beta)
The search results page includes a "Beta AI Overview" section that will display AI-generated summaries. User needs to provide:
- API key
- Model name

## Security

The proxy endpoint includes several security measures:
- Rate limiting (30 requests per minute per IP)
- Private IP address blocking (RFC1918, loopback, link-local)
- Protocol validation (HTTP/HTTPS only)
- Request timeout (10 seconds)

## Development

```bash
npm run dev
```

Runs on port 5000 with hot module replacement enabled.

## User Experience

1. **Homepage**: Google-style landing page with centered search bar
2. **Search**: Type a query to see real search results with AI Overview
3. **Browse**: Click any result to view the website embedded in the browser
4. **Direct URLs**: Enter a URL directly in the search bar to visit any website
