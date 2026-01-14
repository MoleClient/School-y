import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RemoteBrowserProps {
  url: string;
  onUrlChange?: (newUrl: string) => void;
}

export function RemoteBrowser({ url, onUrlChange }: RemoteBrowserProps) {
  const [status, setStatus] = useState<string>("Connecting...");
  const [isConnected, setIsConnected] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastReportedUrlRef = useRef<string>("");
  const onUrlChangeRef = useRef(onUrlChange);
  const initialUrlRef = useRef<string>(url);
  const isConnectedRef = useRef(false);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    onUrlChangeRef.current = onUrlChange;
  }, [onUrlChange]);

  useEffect(() => {
    if (!initialUrlRef.current || isConnectedRef.current) return;

    const targetUrl = initialUrlRef.current;
    const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/remote-browser?url=${encodeURIComponent(fullUrl)}`;

    console.log('[RemoteBrowser] Connecting to:', wsUrl);
    setStatus("Connecting to remote browser...");
    lastReportedUrlRef.current = "";
    isConnectedRef.current = true;
    setShowFallback(false);
    setConnectionFailed(false);

    // Show fallback button after 5 seconds if not connected
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!isConnectedRef.current) {
        setShowFallback(true);
      }
    }, 5000);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[RemoteBrowser] WebSocket connected');
      setStatus("Loading page...");
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'frame':
            setCurrentFrame(`data:image/jpeg;base64,${message.data}`);
            setIsConnected(true);
            setStatus("");
            if (message.url && message.url !== lastReportedUrlRef.current) {
              lastReportedUrlRef.current = message.url;
              onUrlChangeRef.current?.(message.url);
            }
            break;
          case 'status':
            setStatus(message.message);
            break;
          case 'error':
            setStatus(`Error: ${message.message}`);
            setIsConnected(false);
            break;
        }
      } catch (e) {
        console.error('[RemoteBrowser] Parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[RemoteBrowser] WebSocket error:', error);
      setStatus("Connection failed - remote browser unavailable");
      setIsConnected(false);
      setConnectionFailed(true);
      setShowFallback(true);
    };

    ws.onclose = () => {
      console.log('[RemoteBrowser] WebSocket closed');
      setIsConnected(false);
      if (!connectionFailed) {
        setStatus("Disconnected");
        setShowFallback(true);
      }
    };

    return () => {
      isConnectedRef.current = false;
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const sendEvent = useCallback((event: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    sendEvent({ type: 'click', x, y });
  }, [sendEvent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();

    if (e.key.length === 1) {
      sendEvent({ type: 'type', text: e.key });
    } else {
      sendEvent({ type: 'keydown', key: e.key });
    }
  }, [sendEvent]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    sendEvent({ type: 'scroll', deltaY: e.deltaY });
  }, [sendEvent]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">No webpage loaded</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
    >
      {!isConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
          {!connectionFailed && (
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          )}
          <p className="text-muted-foreground text-sm">{status}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            {connectionFailed 
              ? "The remote browser couldn't start. Use the buttons below to access this site."
              : "Launching remote browser for interactive mode..."}
          </p>
          
          {showFallback && (
            <div className="flex flex-col gap-3 mt-6">
              <Button
                variant="default"
                onClick={() => {
                  const fullUrl = initialUrlRef.current?.startsWith('http') 
                    ? initialUrlRef.current 
                    : `https://${initialUrlRef.current}`;
                  window.open(fullUrl, '_blank');
                }}
                className="bg-primary hover:bg-primary/80"
                data-testid="button-open-new-tab"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setConnectionFailed(false);
                  setShowFallback(false);
                  isConnectedRef.current = false;
                  setStatus("Retrying connection...");
                  // Force re-mount by triggering the effect
                  if (wsRef.current) {
                    wsRef.current.close();
                  }
                }}
                data-testid="button-retry-remote"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Remote Browser
              </Button>
            </div>
          )}
        </div>
      )}

      {currentFrame && (
        <img
          src={currentFrame}
          alt="Remote browser view"
          className="w-full h-full object-contain cursor-pointer"
          onClick={handleClick}
          draggable={false}
          data-testid="remote-browser-frame"
        />
      )}
    </div>
  );
}
