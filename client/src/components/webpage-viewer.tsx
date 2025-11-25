import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, ExternalLink, Globe } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface WebpageViewerProps {
  url: string;
}

export function WebpageViewer({ url }: WebpageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanUrl = url.split('?_reload=')[0];
  const proxyUrl = cleanUrl ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}&t=${Date.now()}` : "";

  useEffect(() => {
    if (cleanUrl) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage("");

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      loadTimeoutRef.current = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage("The page took too long to load. It may be blocked or unavailable.");
        }
      }, 15000);
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
    
    try {
      const iframe = iframeRef.current;
      if (iframe) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.body) {
          const bodyText = iframeDoc.body.innerText || "";
          if (bodyText.includes("Failed to fetch") || bodyText.includes("Rate limit") || bodyText.length < 50) {
            setHasError(true);
            setErrorMessage("This website couldn't be loaded in the embedded viewer.");
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (e) {
    }
    
    setIsLoading(false);
  };

  const handleError = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
    setHasError(true);
    setErrorMessage("Failed to load the webpage. The site may block embedding.");
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    
    if (iframeRef.current) {
      iframeRef.current.src = `/api/proxy?url=${encodeURIComponent(cleanUrl)}&retry=${Date.now()}`;
    }
  };

  if (!cleanUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No webpage loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white">
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

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-background z-10">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Unable to Display Page
            </h2>
            <p className="text-muted-foreground mb-6">
              {errorMessage || "This website cannot be embedded. Some sites block this for security reasons."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleRetry}
                variant="outline"
                data-testid="button-retry"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.open(cleanUrl, "_blank")}
                data-testid="button-open-new-tab"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="w-full h-full border-0 bg-white"
        title="Webpage viewer"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
        data-testid="iframe-webpage"
      />
    </div>
  );
}
