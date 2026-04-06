# School-y - Google-Inspired Web Browser Platform

A web browser platform designed to look like Google's homepage, featuring a clean search interface with actual search results and an embedded webpage viewer.

## Features

- **Google-Style Homepage**: Clean white design with centered Google logo, rounded search bar, and "Google Search" / "I'm Feeling Lucky" buttons
- **Real Search Results**: Google-style search results layout with favicons, blue titles, green URLs, and descriptions
- **Beta AI Overview**: AI-powered search summary panel (requires API key + model name configuration)
- **Embedded Webpage Viewer**: View websites without redirecting using advanced iframe + proxy technology
- **URL Obfuscation**: Domain names are XOR-encoded and base64-encoded to evade content filter detection
- **YouTube Playback**: Embedded YouTube IFrame player injected when visiting YouTube watch pages through the proxy
- **Real-time Support**: WebSocket tunneling and SSE proxy for chat apps, live updates, and streaming content
- **Remote Browser**: Puppeteer-based fallback for complex SPAs (ChatGPT, Claude, Discord, etc.)
- **User Accounts**: Username+password authentication, stored in PostgreSQL with session cookies
- **User Profiles**: Upload avatar photo, set display name, bio, connect Twitter/Instagram/Discord
- **Browsing History**: Per-user history saved to DB, visible on profile page
- **School Messages**: Live group chat (SSE-powered), emoji reactions, replies, image attachments, message editing with original visible on click. Beta feature visible to all, sending requires login.

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

No API keys needed. All search uses DuckDuckGo — no external API subscriptions required.

- **Web results**: Scrapes `https://html.duckduckgo.com/html/` with cheerio
- **Images**: DuckDuckGo image API (`/i.js`) with vqd token extraction — 24 real image results
- **Videos**: DuckDuckGo video API (`/v.js`) with vqd token extraction — 20 real video results with thumbnails and durations
- **News**: DuckDuckGo news API (`/news.js`) with vqd token extraction — 15 real news articles with source/date

### Autocomplete Suggestions
Uses DuckDuckGo autocomplete (`https://duckduckgo.com/ac/?q=...`) — no API key required.

### vqd Token Flow (Images/Videos/News)
DuckDuckGo's media APIs require a `vqd` token. Flow:
1. GET `https://duckduckgo.com/?q=QUERY&iax=TYPE&ia=TYPE` → extract `vqd="..."` from HTML
2. Call the appropriate API endpoint with the vqd token

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

## Distribution / Offline Access

Several methods are provided so users can run School-y without a terminal:

- **`School-y.vbs`** — Silent Windows launcher (double-click, no terminal window)
- **`start.command`** — macOS launcher (double-click in Finder)
- **`start.sh`** — Linux / Chromebook Linux launcher
- **`setup-chromebook.sh`** — Chromebook one-time setup script
- **`open.html`** — Browser launcher with auto-redirect (open in any browser)

### Chrome Extension (`extension/` folder)
A self-contained Chrome Extension that works on **Chromebook without any terminal or Node.js**:

**Files:**
- `manifest.json` — MV3 manifest, requires storage + tabs + host_permissions
- `background.js` — Opens School-y tab when extension icon clicked
- `index.html` + `style.css` + `app.js` — Dark-themed browser UI with home page, quick links, and URL bar
- `sw.js` — Ultraviolet service worker registered from the extension page
- `uv/` — Ultraviolet proxy bundle (handler, client, sw, config)
- `baremux/` — BareMux ES module + shared worker
- `epoxy/` — Epoxy transport ES module (Wisp TCP tunneling)

**How it works:**
1. User loads `extension/` folder as "unpacked" in `chrome://extensions`
2. On first open, setup screen prompts for a Wisp server URL (e.g. `wss://your-app.replit.app/wisp/`)
3. BareMux initializes Epoxy transport connecting to the Wisp WebSocket
4. UV service worker intercepts requests with prefix `/uv/service/` and proxies them through Wisp
5. The embedded `<iframe>` renders proxied sites fully

**Installation:**
1. Open `chrome://extensions` → Enable Developer Mode
2. Click "Load unpacked" → select the `extension/` folder
3. Click the School-y icon → enter server URL → browse freely

## Google Classroom Cloaking
- Tab title and favicon are set to "Google Classroom" by default (`client/index.html`)
- `CloakOverlay.tsx` shows a fake Classroom dashboard automatically when the window loses focus
- Toggle with **Alt+C**, dismiss with **Escape**

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
