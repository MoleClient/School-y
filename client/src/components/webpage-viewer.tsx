import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface WebpageViewerProps {
  url: string;
}

export function WebpageViewer({ url }: WebpageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");

  useEffect(() => {
    if (url) {
      setIsLoading(true);
      setHasError(false);
      const encodedUrl = encodeURIComponent(url);
      setProxyUrl(`/api/proxy?url=${encodedUrl}`);
    }
  }, [url]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setProxyUrl(`/api/proxy?url=${encodeURIComponent(url)}&retry=${Date.now()}`);
  };

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No webpage loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-background">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading {url}...</p>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-background z-10">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load webpage</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                This website could not be embedded. Some websites prevent embedding for security reasons.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleRetry}
                  size="sm"
                  variant="outline"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.open(url, "_blank")}
                  size="sm"
                  data-testid="button-open-new-tab"
                >
                  Open in New Tab
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <iframe
        src={proxyUrl}
        className="w-full h-full border-0"
        title="Webpage viewer"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        data-testid="iframe-webpage"
      />
    </div>
  );
}
