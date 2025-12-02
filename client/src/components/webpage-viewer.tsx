import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebpageViewerProps {
  url: string;
  onUrlChange?: (newUrl: string) => void;
}

// XOR key for URL obfuscation (must match server)
const OBFUSCATION_KEY = 0x5A;

// Obfuscate URL to hide domain names from content filters
function obfuscateUrl(url: string): string {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const xored = fullUrl.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY)).join('');
  return btoa(xored).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Convert URL to obfuscated proxy format: /b/{encoded}
function toProxyPath(url: string): string {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    return `/b/${obfuscateUrl(fullUrl)}`;
  } catch (e) {
    return `/b/${obfuscateUrl(url)}`;
  }
}

export function WebpageViewer({ url, onUrlChange }: WebpageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const cleanUrl = url.split('?_reload=')[0];
  // Use path-based proxy for better SPA support - no cache busting params needed
  const proxyUrl = cleanUrl ? toProxyPath(cleanUrl) : "";

  // Listen for navigation messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'navigation' && event.data.url) {
        const newUrl = event.data.url;
        // Only notify if the URL actually changed
        if (newUrl && newUrl !== cleanUrl && onUrlChange) {
          onUrlChange(newUrl);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [cleanUrl, onUrlChange]);

  // Simulate loading progress for better UX
  const startProgressSimulation = useCallback(() => {
    setLoadProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      setLoadProgress(prev => {
        // Slow down as we approach 90%
        if (prev >= 90) return prev;
        const increment = Math.max(1, (90 - prev) / 10);
        return Math.min(90, prev + increment);
      });
    }, 100);
  }, []);

  useEffect(() => {
    if (cleanUrl) {
      setIsLoading(true);
      setLoadAttempt(0);
      startProgressSimulation();

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      // Longer timeout for complex SPAs
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadProgress(100);
      }, 45000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [cleanUrl, startProgressSimulation]);

  const handleLoad = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    // Animate to 100%
    setLoadProgress(100);
    setTimeout(() => setIsLoading(false), 150);
  }, []);

  const handleError = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setIsLoading(false);
    setLoadProgress(0);
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setLoadAttempt(prev => prev + 1);
    startProgressSimulation();
    
    if (iframeRef.current) {
      // Force reload by changing src
      const newSrc = `${toProxyPath(cleanUrl)}?_r=${Date.now()}`;
      iframeRef.current.src = newSrc;
    }
    
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setLoadProgress(100);
    }, 45000);
  }, [cleanUrl, startProgressSimulation]);

  if (!cleanUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">No webpage loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white dark:bg-gray-900">
      {/* Loading overlay with progress bar */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background z-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Loading webpage...</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs truncate">{cleanUrl}</p>
          </div>
          {/* Progress bar */}
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-150 ease-out"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons - visible on hover */}
      <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRetry}
          className="shadow-lg"
          data-testid="button-retry"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Reload
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => window.open(cleanUrl, "_blank")}
          className="shadow-lg"
          data-testid="button-open-new-tab"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          New Tab
        </Button>
      </div>

      {/* Optimized iframe with GPU acceleration hints */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="w-full h-full border-0 bg-white dark:bg-gray-900"
        style={{ 
          transform: 'translateZ(0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden'
        }}
        title="Webpage viewer"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-modals allow-pointer-lock allow-presentation allow-downloads"
        allow="accelerometer; camera; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; clipboard-write"
        referrerPolicy="no-referrer"
        data-testid="iframe-webpage"
      />
    </div>
  );
}
