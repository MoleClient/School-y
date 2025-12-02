# School-y - Safari-Styled Web Browser Platform

A beautiful Safari-inspired web browser that allows users to search the web and view websites embedded within the platform without leaving the page.

## Features

- **Safari-Styled UI**: Authentic Safari browser chrome with traffic lights, address bar, and navigation controls
- **Web Search**: Real-time web search with support for multiple search providers
- **Embedded Webpage Viewer**: View websites without redirecting to new tabs using iframe technology
- **URL Synchronization**: Address bar updates in real-time as you click links within pages (shows full paths like `www.website.com/article/name`)
- **Navigation Controls**: Full browser history with back, forward, and reload functionality
- **Real-time Support**: WebSocket tunneling and SSE proxy for chat apps, live updates, and streaming content
- **Asset Caching**: In-memory caching for static assets (JS, CSS, fonts, images) with ETag support
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile devices

## Architecture

### Frontend
- React SPA with Wouter routing
- Shadcn UI components for polished, accessible interface
- TanStack Query for data fetching and caching
- Tailwind CSS with custom Safari-inspired design tokens

### Backend
- Express.js server
- Search API integration (Brave Search or SerpAPI)
- CORS proxy for embedding external websites
- In-memory storage for browser history

## Search Configuration

School-y supports real web search through two providers:

### Option 1: Brave Search API (Recommended)
1. Get a free API key from [Brave Search API](https://brave.com/search/api/)
2. Add to your environment: `BRAVE_SEARCH_API_KEY=your_key_here`

### Option 2: SerpAPI
1. Get an API key from [SerpAPI](https://serpapi.com/)
2. Add to your environment: `SERPAPI_KEY=your_key_here`

### Demo Mode
Without API keys, School-y runs in demo mode with curated search results featuring popular websites. This provides a good experience for testing and development.

## Security

The proxy endpoint includes several security measures:
- Rate limiting (30 requests per minute per IP)
- Private IP address blocking (RFC1918, loopback, link-local)
- Protocol validation (HTTP/HTTPS only)
- Request timeout (10 seconds)

## Development

The application runs on port 5000 with hot module replacement enabled for rapid development.

```bash
npm run dev
```

## User Experience

1. **Search**: Enter a query in the address bar to see search results
2. **Browse**: Click any result to view the website embedded in the browser
3. **Navigate**: Use back/forward buttons to navigate through history
4. **Reload**: Refresh the current page while preserving query parameters
5. **Direct URLs**: Enter a URL directly in the address bar to visit any website

## Known Limitations

- Some websites prevent iframe embedding for security reasons (X-Frame-Options)
- Demo search results are curated and limited without API keys
- Proxy functionality is educational and not intended for production use at scale
