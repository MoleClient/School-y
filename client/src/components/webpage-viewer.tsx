import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, RefreshCw, AlertTriangle, Archive, Globe, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoteBrowser } from "./remote-browser";

declare global {
  interface Window {
    __uv$config?: {
      prefix: string;
      encodeUrl: (url: string) => string;
      decodeUrl: (url: string) => string;
    };
    __uvReady?: boolean;
  }
}

interface WebpageViewerProps {
  url: string;
  onUrlChange?: (newUrl: string) => void;
}

const REMOTE_BROWSER_SITES = [
  'chatgpt.com',
  'claude.ai',
  'openai.com',
  'anthropic.com',
  'discord.com',
  'slack.com',
  'notion.so',
  'figma.com',
  'canva.com',
  'docs.google.com',
  'drive.google.com',
  'mail.google.com',
  'outlook.live.com',
  'office.com',
];

// XOR key for URL obfuscation (must match server)
const OBFUSCATION_KEY = 0x5A;

function obfuscateUrl(url: string): string {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const xored = fullUrl.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY)).join('');
  return btoa(xored).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function cleanUrlParams(url: string): string {
  const SPAM_PARAMS = ['__cf_chl_rt_tk', '__cf_chl_tk', '__cflb', '_ga', '_gl', 'utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
  try {
    const u = new URL(url);
    let changed = false;
    for (const param of SPAM_PARAMS) {
      if (u.searchParams.has(param)) { u.searchParams.delete(param); changed = true; }
    }
    u.searchParams.forEach((_, key) => {
      if (key.startsWith('__cf')) { u.searchParams.delete(key); changed = true; }
    });
    return changed ? u.toString() : url;
  } catch { return url; }
}

function toProxyUrl(url: string, useUV: boolean): string {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Prefer UV proxy — it's service-worker based and handles JS-heavy pages much better
  if (useUV) {
    const cfg = window.__uv$config;
    if (cfg?.encodeUrl && cfg?.prefix) {
      try {
        const encoded = cfg.encodeUrl(fullUrl);
        return cfg.prefix + encoded;
      } catch (e) {
        console.warn('[Proxy] UV encode failed, falling back to legacy:', e);
      }
    }
  }
  
  // Legacy CORS proxy fallback
  return `/b/${obfuscateUrl(fullUrl)}`;
}

// Top loading bar component
function LoadingBar({ progress, visible }: { progress: number; visible: boolean }) {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-[3px] z-30 overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #4285F4, #EA4335, #FBBC05, #34A853)',
          backgroundSize: '200% 100%',
          animation: visible ? 'shimmer 2s linear infinite' : 'none',
          boxShadow: '0 0 8px rgba(66,133,244,0.6)',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  );
}

export function WebpageViewer({ url, onUrlChange }: WebpageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uvReady, setUvReady] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const uvReadyRef = useRef(false);
  const navTimerRef = useRef<NodeJS.Timeout>();

  // Wait for UV service worker to be ready
  useEffect(() => {
    const check = () => {
      if (window.__uvReady === true && window.__uv$config) {
        if (!uvReadyRef.current) {
          uvReadyRef.current = true;
          setUvReady(true);
        }
        return true;
      }
      return false;
    };

    if (check()) return;

    const handler = () => { check(); };
    window.addEventListener('uvready', handler);
    const poll = setInterval(() => { if (check()) clearInterval(poll); }, 300);
    const timeout = setTimeout(() => clearInterval(poll), 12000);

    return () => {
      window.removeEventListener('uvready', handler);
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, []);

  const cleanUrl = url.split('?_reload=')[0];
  const useRemoteBrowser = cleanUrl ? REMOTE_BROWSER_SITES.some(s => cleanUrl.includes(s)) : false;
  const proxyUrl = (cleanUrl && !useRemoteBrowser) ? toProxyUrl(cleanUrl, uvReady) : "";

  // Listen for navigation messages from proxy iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigation' && event.data.url) {
        const newUrl = cleanUrlParams(event.data.url);
        if (newUrl && newUrl !== cleanUrl && onUrlChange) onUrlChange(newUrl);
      }
      if (event.data?.type === 'download' && event.data.url) {
        const link = document.createElement('a');
        link.href = event.data.url;
        link.download = event.data.filename || '';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [cleanUrl, onUrlChange]);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setShowError(false);
    setLoadProgress(5);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.max(0.5, (85 - prev) / 20);
      });
    }, 150);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      clearInterval(progressIntervalRef.current);
      setLoadProgress(100);
      setTimeout(() => setIsLoading(false), 400);
    }, 18000);
  }, []);

  // Start loading whenever the target URL changes
  useEffect(() => {
    if (cleanUrl) startLoading();
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [cleanUrl]);

  const handleLoad = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setLoadProgress(100);
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  const handleError = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsLoading(false);
    setLoadProgress(0);
    setShowError(true);
    setErrorMsg("This page couldn't be loaded through the proxy.");
  }, []);

  const handleRetry = useCallback(() => {
    setShowError(false);
    startLoading();
    if (iframeRef.current) {
      iframeRef.current.src = `${proxyUrl}${proxyUrl.includes('?') ? '&' : '?'}_r=${Date.now()}`;
    }
  }, [proxyUrl, startLoading]);

  const openDirect = useCallback(() => {
    const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
    window.open(fullUrl, '_blank');
  }, [cleanUrl]);

  // Show navigation bar briefly on mouse move
  const handleMouseMove = useCallback(() => {
    setShowNav(true);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNav(false), 2500);
  }, []);

  if (!cleanUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">No page loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white" onMouseMove={handleMouseMove}>
      {/* Top loading bar */}
      <LoadingBar progress={loadProgress} visible={isLoading} />

      {/* Floating nav bar - appears on mouse move */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-lg px-3 py-1.5 transition-all duration-200"
        style={{ opacity: showNav ? 1 : 0, pointerEvents: showNav ? 'all' : 'none' }}
      >
        <button
          onClick={() => iframeRef.current && (iframeRef.current.src = iframeRef.current.src)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
          title="Reload"
          data-testid="button-reload"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="text-xs text-muted-foreground max-w-[200px] truncate">
          {(() => { try { return new URL(cleanUrl).hostname; } catch { return cleanUrl; } })()}
        </div>
        <button
          onClick={openDirect}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
          title="Open in new tab"
          data-testid="button-open-external"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error overlay */}
      {showError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Page couldn't load</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {errorMsg} Try an alternative method below.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={handleRetry} variant="default" data-testid="button-retry">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                if (onUrlChange) onUrlChange(`https://web.archive.org/web/${cleanUrl}`);
              }} data-testid="button-wayback">
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Wayback Machine
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                if (onUrlChange) onUrlChange(`https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(cleanUrl)}`);
              }} data-testid="button-google-cache">
                <Globe className="w-3.5 h-3.5 mr-1.5" />
                Google Cache
              </Button>
              <Button size="sm" variant="outline" onClick={openDirect} data-testid="button-open-tab">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open Directly
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remote browser (for complex SPAs) or standard iframe */}
      {useRemoteBrowser ? (
        <RemoteBrowser url={cleanUrl} onUrlChange={onUrlChange} />
      ) : (
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="w-full h-full border-0"
          style={{ display: 'block' }}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-presentation allow-orientation-lock allow-pointer-lock"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          title="webpage"
          data-testid="iframe-webpage"
        />
      )}
    </div>
  );
}
