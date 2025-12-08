import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, RefreshCw, Shield, Lock, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hacker-style loading messages
const DECRYPT_MESSAGES = [
  "Initializing secure tunnel...",
  "Bypassing content filters...",
  "Decrypting connection...",
  "Spoofing browser fingerprint...",
  "Establishing proxy route...",
  "Injecting stealth headers...",
  "Circumventing firewall...",
  "Masking origin server...",
  "Negotiating TLS handshake...",
  "Rendering protected content...",
  "Extracting page data...",
  "Reassembling packets...",
];

// Generate random hex string
function randomHex(length: number): string {
  return Array.from({ length }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Scramble text effect
function scrambleText(text: string, progress: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const revealed = Math.floor(text.length * progress);
  return text.split('').map((char, i) => {
    if (i < revealed) return char;
    if (char === ' ' || char === '.' || char === '/') return char;
    return chars[Math.floor(Math.random() * chars.length)];
  }).join('');
}

interface WebpageViewerProps {
  url: string;
  onUrlChange?: (newUrl: string) => void;
}

// XOR key for URL obfuscation (must match server)
const OBFUSCATION_KEY = 0x5A;

// Cloudflare and tracking parameters to strip from URLs
const SPAM_PARAMS = [
  '__cf_chl_rt_tk',
  '__cf_chl_tk',
  '__cf_chl_jschl_tk',
  '__cf_chl_captcha_tk',
  '__cflb',
  'cf_chl_opt',
  '_ga',
  '_gl',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'msclkid',
];

// Clean URL by removing Cloudflare challenge and tracking parameters
function cleanUrlParams(url: string): string {
  try {
    const urlObj = new URL(url);
    let changed = false;
    
    for (const param of SPAM_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
        changed = true;
      }
    }
    
    // Also remove any parameter starting with __cf
    const keysToDelete: string[] = [];
    urlObj.searchParams.forEach((_, key) => {
      if (key.startsWith('__cf')) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      urlObj.searchParams.delete(key);
      changed = true;
    });
    
    return changed ? urlObj.toString() : url;
  } catch {
    return url;
  }
}

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

  // Listen for navigation and download messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'navigation' && event.data.url) {
        // Clean Cloudflare challenge and tracking params from the URL
        const newUrl = cleanUrlParams(event.data.url);
        // Only notify if the URL actually changed (after cleaning)
        if (newUrl && newUrl !== cleanUrl && onUrlChange) {
          onUrlChange(newUrl);
        }
      }
      
      // Handle download requests from iframe
      if (event.data && event.data.type === 'download' && event.data.url) {
        // Trigger download by creating a temporary link
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

  // Animated decrypt message
  const [decryptMsg, setDecryptMsg] = useState(DECRYPT_MESSAGES[0]);
  const [hexData, setHexData] = useState(randomHex(32));
  const [scrambledUrl, setScrambledUrl] = useState('');
  
  useEffect(() => {
    if (!isLoading) return;
    
    // Rotate through decrypt messages
    const msgInterval = setInterval(() => {
      setDecryptMsg(DECRYPT_MESSAGES[Math.floor(Math.random() * DECRYPT_MESSAGES.length)]);
    }, 2000);
    
    // Animate hex data
    const hexInterval = setInterval(() => {
      setHexData(randomHex(32));
    }, 100);
    
    // Scramble URL reveal effect
    const urlInterval = setInterval(() => {
      const progress = Math.min(loadProgress / 100, 1);
      setScrambledUrl(scrambleText(cleanUrl || '', progress));
    }, 50);
    
    return () => {
      clearInterval(msgInterval);
      clearInterval(hexInterval);
      clearInterval(urlInterval);
    };
  }, [isLoading, loadProgress, cleanUrl]);

  return (
    <div className="relative w-full h-full bg-white dark:bg-gray-900">
      {/* Hacker-style loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 overflow-hidden">
          {/* Matrix-style background effect */}
          <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
            <div className="font-mono text-xs text-primary whitespace-pre leading-tight animate-pulse">
              {Array.from({ length: 20 }, () => randomHex(80)).join('\n')}
            </div>
          </div>
          
          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-6 p-8">
            {/* Shield icon with pulse effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <Shield className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            
            {/* Status text */}
            <div className="text-center space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-lg font-bold text-primary uppercase tracking-wider">
                  Decrypting
                </span>
              </div>
              <p className="font-mono text-sm text-muted-foreground animate-pulse">
                {decryptMsg}
              </p>
            </div>
            
            {/* URL with scramble effect */}
            <div className="bg-black/50 border border-primary/30 rounded-lg p-3 max-w-md w-full">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary/70 font-mono uppercase">Target URL</span>
              </div>
              <p className="font-mono text-xs text-green-400 break-all">
                {scrambledUrl || cleanUrl}
              </p>
            </div>
            
            {/* Hex data stream */}
            <div className="font-mono text-xs text-primary/40 tracking-wider">
              0x{hexData}
            </div>
            
            {/* Progress bar */}
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(loadProgress)}%</span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-primary/20">
                <div 
                  className="h-full bg-gradient-to-r from-primary via-primary to-primary/50 transition-all duration-150 ease-out relative"
                  style={{ width: `${loadProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
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
