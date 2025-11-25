import { useState, useEffect, useRef } from "react";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebpageViewerProps {
  url: string;
}

function encodeUrl(url: string): string {
  const reversed = url.split('').reverse().join('');
  const encoded = btoa(reversed);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function WebpageViewer({ url }: WebpageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanUrl = url.split('?_reload=')[0];
  const encodedUrl = cleanUrl ? encodeUrl(cleanUrl) : "";
  const proxyUrl = encodedUrl ? `/api/p?q=${encodedUrl}&t=${Date.now()}&a=${loadAttempt}` : "";

  useEffect(() => {
    if (cleanUrl) {
      setIsLoading(true);
      setLoadAttempt(0);

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 25000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [cleanUrl]);

  const handleLoad = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
  };

  const handleError = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setLoadAttempt(prev => prev + 1);
    
    if (iframeRef.current) {
      const encoded = encodeUrl(cleanUrl);
      iframeRef.current.src = `/api/p?q=${encoded}&r=${Date.now()}&a=${loadAttempt + 1}`;
    }
    
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 25000);
  };

  if (!cleanUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">No webpage loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white dark:bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background z-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Loading webpage...</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs truncate">{cleanUrl}</p>
          </div>
        </div>
      )}

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

      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="w-full h-full border-0 bg-white dark:bg-gray-900"
        title="Webpage viewer"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-modals"
        referrerPolicy="no-referrer"
        data-testid="iframe-webpage"
      />
    </div>
  );
}
