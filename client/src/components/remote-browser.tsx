import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface RemoteBrowserProps {
  url: string;
  onUrlChange?: (newUrl: string) => void;
}

export function RemoteBrowser({ url, onUrlChange }: RemoteBrowserProps) {
  const [status, setStatus] = useState<string>("Connecting...");
  const [isConnected, setIsConnected] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastReportedUrlRef = useRef<string>("");
  const onUrlChangeRef = useRef(onUrlChange);
  const initialUrlRef = useRef<string>(url);
  const isConnectedRef = useRef(false);
  
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

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[RemoteBrowser] WebSocket connected');
      setStatus("Loading page...");
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
      setStatus("Connection error");
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[RemoteBrowser] WebSocket closed');
      setIsConnected(false);
      setStatus("Disconnected");
    };

    return () => {
      isConnectedRef.current = false;
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
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">{status}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            Launching remote browser for interactive mode...
          </p>
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
