import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, RefreshCw, Shield, Lock, Terminal, Skull, Archive, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    __uv$config?: {
      prefix: string;
      encodeUrl: (url: string) => string;
      decodeUrl: (url: string) => string;
    };
    BareMux?: {
      BareMuxConnection: new (path: string) => {
        setTransport: (path: string, args: unknown[]) => Promise<void>;
      };
    };
  }
}

// Hacker-style loading messages
const DECRYPT_MESSAGES = [
  "Initializing Ultraviolet...",
  "Bypassing content filters...",
  "Connecting to WISP server...",
  "Establishing proxy tunnel...",
  "Spoofing browser fingerprint...",
  "Injecting stealth headers...",
  "Circumventing firewall...",
  "Masking origin server...",
  "Negotiating TLS handshake...",
  "Rendering protected content...",
  "Extracting page data...",
  "Reassembling packets...",
];

// Force mode messages (smart bypass)
const FORCE_MESSAGES = [
  "Activating mobile bypass...",
  "Querying Google cache...",
  "Searching Wayback archive...",
  "Trying Google Translate proxy...",
  "Randomizing fingerprint...",
  "Simulating human behavior...",
  "Evading bot detection...",
  "Launching stealth browser...",
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

// Sites that require login - with Ultraviolet these now work!
// Keeping empty array since UV handles WebSocket proxying
const UNPROXYABLE_SITES: string[] = [];

// Sites with Cloudflare protection (may work with bypass)
const PROTECTED_SITES = [
  'downdetector.com',
  'openai.com',
  'chatgpt.com',
  'anthropic.com',
  'claude.ai',
];

// Interactive sites that need Full Window mode (service workers, complex SPAs)
const FULL_WINDOW_SITES = [
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
  'github.com',
  'codepen.io',
  'replit.com',
  'codesandbox.io',
];

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

// Obfuscate URL to hide domain names from content filters (legacy fallback)
function obfuscateUrl(url: string): string {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const xored = fullUrl.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY)).join('');
  return btoa(xored).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// XOR encode URL for Ultraviolet (matches UV's xor codec)
function xorEncode(str: string): string {
  if (!str) return str;
  const result = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    result[i] = str.charCodeAt(i) ^ 2;
  }
  return btoa(String.fromCharCode(...result))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Convert URL to proxy format - always use legacy proxy for iframes
// UV proxy requires full navigation which doesn't work well with iframes
function toProxyPath(url: string, _useUV: boolean = false): string {
  try {
    // Always use legacy proxy for iframe embedding
    console.log('[Proxy] Using legacy proxy for:', url);
    return `/b/${obfuscateUrl(url)}`;
  } catch (e) {
    console.error('[Proxy] Error encoding URL:', e);
    return `/b/${obfuscateUrl(url)}`;
  }
}

export function WebpageViewer({ url, onUrlChange }: WebpageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [forceMode, setForceMode] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [uvReady, setUvReady] = useState(false);
  const uvReadyRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  // Wait for UV to be ready (set up in index.html)
  useEffect(() => {
    let isMounted = true;
    
    const checkUV = () => {
      const win = window as unknown as { __uvReady?: boolean; __uv$config?: unknown };
      
      // Check both the ready flag AND that the config is loaded
      if (win.__uvReady === true && win.__uv$config) {
        console.log('[Proxy] UV is ready with config');
        if (isMounted && !uvReadyRef.current) {
          uvReadyRef.current = true;
          setUvReady(true);
        }
        return true;
      } else if (win.__uvReady === false) {
        console.log('[Proxy] UV setup failed, using legacy');
        return false;
      }
      return null; // Still waiting
    };
    
    // Check immediately
    if (checkUV() === true) return;
    
    // Also listen for the ready event
    const handler = () => {
      checkUV();
    };
    window.addEventListener('uvready', handler);
    
    // Poll periodically in case event was missed
    const pollInterval = setInterval(() => {
      if (checkUV() === true) {
        clearInterval(pollInterval);
      }
    }, 500);
    
    // Fallback timeout - don't wait forever (10 seconds)
    const timeout = setTimeout(() => {
      if (!uvReadyRef.current) {
        console.log('[Proxy] UV timeout after 10s, using legacy');
        // Don't set uvReady to false explicitly, just let it stay false
      }
      clearInterval(pollInterval);
    }, 10000);
    
    return () => {
      isMounted = false;
      window.removeEventListener('uvready', handler);
      clearTimeout(timeout);
      clearInterval(pollInterval);
    };
  }, []);

  const cleanUrl = url.split('?_reload=')[0];
  
  // Check if this is an unproxyable site (requires login)
  const isUnproxyable = cleanUrl ? UNPROXYABLE_SITES.some(site => cleanUrl.includes(site)) : false;
  
  // Check if this is a known protected site (Cloudflare etc)
  const isProtectedSite = cleanUrl ? PROTECTED_SITES.some(site => cleanUrl.includes(site)) : false;
  
  // Check if this is an interactive site that needs to open externally
  const needsExternal = cleanUrl ? FULL_WINDOW_SITES.some(site => cleanUrl.includes(site)) : false;
  
  // Open in new tab (direct, no proxy)
  const handleOpenExternal = useCallback(() => {
    if (!cleanUrl) return;
    const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
    window.open(fullUrl, '_blank');
  }, [cleanUrl]);
  
  // Use path-based proxy format with optional force mode
  // Use UV proxy when ready, fallback to legacy
  const proxyUrl = cleanUrl ? `${toProxyPath(cleanUrl, uvReady)}${forceMode ? '?force=1' : ''}` : "";
  
  // Debug logging
  useEffect(() => {
    if (cleanUrl && proxyUrl) {
      console.log('[WebpageViewer] uvReady:', uvReady, 'proxyUrl:', proxyUrl);
    }
  }, [cleanUrl, proxyUrl, uvReady]);

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
      setLoadFailed(false);
      setFailReason('');
      startProgressSimulation();

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      // Reasonable timeout - don't make users wait forever
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadProgress(100);
      }, forceMode ? 30000 : 15000); // 15s normal, 30s for bypass mode
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [cleanUrl, startProgressSimulation, isProtectedSite, forceMode]);
  
  // Force decrypt handler
  const handleForceDecrypt = useCallback(() => {
    setForceMode(true);
    setIsLoading(true);
    setLoadFailed(false);
    setLoadProgress(0);
    startProgressSimulation();
    
    if (iframeRef.current) {
      const forcePath = `${toProxyPath(cleanUrl, uvReady)}?force=1&t=${Date.now()}`;
      iframeRef.current.src = forcePath;
    }
    
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setLoadProgress(100);
    }, 30000); // 30 second timeout for force mode
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
      const newSrc = `${toProxyPath(cleanUrl, uvReady)}?_r=${Date.now()}`;
      iframeRef.current.src = newSrc;
    }
    
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setLoadProgress(100);
    }, 15000); // 15 second timeout
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
    
    // Rotate through decrypt messages (use force mode messages when in bypass mode)
    const messages = forceMode ? FORCE_MESSAGES : DECRYPT_MESSAGES;
    const msgInterval = setInterval(() => {
      setDecryptMsg(messages[Math.floor(Math.random() * messages.length)]);
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
      {/* Unproxyable site warning - show immediately for sites that require login */}
      {isUnproxyable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-20 overflow-hidden">
          <div className="flex flex-col items-center gap-4 p-6 text-center max-w-lg">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-red-500 uppercase tracking-wider">
                Login Required
              </h3>
              <p className="text-sm text-muted-foreground">
                This site requires you to log in to view content. Social media and chat apps cannot be proxied.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(cleanUrl, "_blank")}
                className="border-primary/50 text-primary hover:bg-primary/20"
                data-testid="button-open-direct"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Open in New Tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const waybackUrl = `https://web.archive.org/web/${cleanUrl}`;
                  if (onUrlChange) onUrlChange(waybackUrl);
                }}
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                data-testid="button-wayback-unproxyable"
              >
                <Archive className="w-4 h-4 mr-1" />
                Try Wayback
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground/60 mt-4">
              Tip: Try searching for websites that don't require login, like news sites, Wikipedia, or games.
            </p>
          </div>
        </div>
      )}
      
      {/* Hacker-style loading overlay */}
      {isLoading && !isUnproxyable && (
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
                <span>{forceMode ? 'Force Mode' : 'Progress'}</span>
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
            
            {/* Action buttons - show after some loading time */}
            {loadProgress > 30 && (
              <div className="flex flex-wrap justify-center gap-2">
                {needsExternal && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleOpenExternal}
                    className="bg-primary hover:bg-primary/80"
                    data-testid="button-open-external-loading"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open Direct (Recommended)
                  </Button>
                )}
                {!forceMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceDecrypt}
                    className="border-primary/50 text-primary hover:bg-primary/20"
                    data-testid="button-bypass"
                  >
                    <Skull className="w-4 h-4 mr-1" />
                    Bypass
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const waybackUrl = `https://web.archive.org/web/${cleanUrl}`;
                    if (onUrlChange) onUrlChange(waybackUrl);
                  }}
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                  data-testid="button-wayback-loading"
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Wayback
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(cleanUrl)}`;
                    if (onUrlChange) onUrlChange(cacheUrl);
                  }}
                  className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                  data-testid="button-google-cache-loading"
                >
                  <Globe className="w-4 h-4 mr-1" />
                  Google Cache
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(cleanUrl, "_blank")}
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                  data-testid="button-new-tab-loading"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  New Tab
                </Button>
              </div>
            )}
            
            {/* Protected site warning */}
            {isProtectedSite && (
              <div className="text-center text-xs text-yellow-500/70 max-w-xs">
                <span className="font-mono">Warning: This site has advanced protection</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Failed to load overlay */}
      {loadFailed && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-10 overflow-auto">
          <div className="flex flex-col items-center gap-4 p-6 text-center max-w-lg">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-yellow-500 uppercase tracking-wider">
                Site Protected
              </h3>
              <p className="text-sm text-muted-foreground">
                This site blocks proxy servers. Try these alternatives:
              </p>
            </div>
            
            {/* Action buttons in a row */}
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {needsExternal && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="bg-primary hover:bg-primary/80"
                  data-testid="button-open-external-failed"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Direct (Recommended)
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceDecrypt}
                className="border-primary/50 text-primary hover:bg-primary/20"
                data-testid="button-bypass-failed"
              >
                <Skull className="w-4 h-4 mr-1" />
                Bypass
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const waybackUrl = `https://web.archive.org/web/${cleanUrl}`;
                  if (onUrlChange) onUrlChange(waybackUrl);
                }}
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                data-testid="button-wayback-failed"
              >
                <Archive className="w-4 h-4 mr-1" />
                Wayback
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(cleanUrl)}`;
                  if (onUrlChange) onUrlChange(cacheUrl);
                }}
                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                data-testid="button-google-cache-failed"
              >
                <Globe className="w-4 h-4 mr-1" />
                Google Cache
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(cleanUrl, "_blank")}
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                data-testid="button-new-tab-failed"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                New Tab
              </Button>
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
          variant="default"
          onClick={handleOpenExternal}
          className="shadow-lg"
          data-testid="button-open-external-hover"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Open Direct
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
