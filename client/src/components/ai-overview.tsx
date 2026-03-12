import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function GeminiSparkle({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <defs>
        <linearGradient id="gemini-grad-ov" x1="0" y1="0" x2="28" y2="28">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CF" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M14 2C14 2 15.5 8.5 20 13C24.5 17.5 26 14 26 14C26 14 20.5 14.5 16 19C11.5 23.5 14 26 14 26C14 26 12.5 19.5 8 15C3.5 10.5 2 14 2 14C2 14 7.5 13.5 12 9C16.5 4.5 14 2 14 2Z"
        fill="url(#gemini-grad-ov)"
      />
    </svg>
  );
}

interface AIOverviewProps {
  query: string;
  results?: Array<{ title: string; description: string; url: string; favicon?: string }>;
  onResultClick?: (url: string) => void;
}

export function AIOverview({ query, results, onResultClick }: AIOverviewProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fetchedRef = useRef<string>("");

  useEffect(() => {
    if (!query || fetchedRef.current === query) return;
    fetchedRef.current = query;
    setSummary(null);
    setError(null);
    setIsLoading(true);

    fetch("/api/ai/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, results: results?.slice(0, 5) }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSummary(data.summary);
      })
      .catch((err) => setError(err.message || "Failed to generate overview"))
      .finally(() => setIsLoading(false));
  }, [query, results]);

  const PREVIEW_LENGTH = 280;
  const needsExpand = summary && summary.length > PREVIEW_LENGTH;
  const displayedSummary = summary && !expanded && needsExpand
    ? summary.slice(0, PREVIEW_LENGTH) + "..."
    : summary;

  const sources = results?.slice(0, 4) || [];

  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)" }}
      data-testid="section-ai-overview"
    >
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <GeminiSparkle size={20} />
          <span className="text-[15px] font-medium text-white">AI Overview</span>
        </div>

        {isLoading ? (
          <div className="space-y-2.5 py-1">
            <div className="h-3 rounded-full animate-pulse w-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-3 rounded-full animate-pulse w-11/12" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="h-3 rounded-full animate-pulse w-4/5" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-3 rounded-full animate-pulse w-3/5" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-white/50">{error.includes("AI not configured") ? "AI Overview unavailable." : `Could not load overview.`}</p>
            <button
              onClick={() => { fetchedRef.current = ""; setSummary(null); setError(null); }}
              className="flex-shrink-0 px-3 py-1 text-xs rounded-full border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
              data-testid="button-retry-ai"
            >
              Retry
            </button>
          </div>
        ) : summary ? (
          <div>
            <div className="text-sm text-white/90 leading-relaxed" data-testid="text-ai-summary">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="space-y-1.5 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="space-y-1.5 my-2 list-decimal list-inside">{children}</ol>,
                  li: ({ children }) => (
                    <li className="flex gap-2 items-start">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  em: ({ children }) => <em className="italic text-white/80">{children}</em>,
                  a: ({ href, children }) => (
                    <button onClick={() => href && onResultClick?.(href)} className="text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0">
                      {children}
                    </button>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "rgba(255,255,255,0.12)" }}>{children}</code>
                  ),
                }}
              >
                {displayedSummary || ""}
              </ReactMarkdown>
            </div>

            {sources.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {sources.map((s, i) => {
                  const domain = (() => { try { return new URL(s.url).hostname.replace("www.", ""); } catch { return s.url; } })();
                  return (
                    <button
                      key={i}
                      onClick={() => onResultClick?.(s.url)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                      data-testid={`button-source-${i}`}
                    >
                      {s.favicon ? (
                        <img src={s.favicon} className="w-3 h-3 rounded-full" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-white/20" />
                      )}
                      {domain}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {summary && needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-white/60 hover:text-white/80 transition-colors border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
          data-testid="button-show-more-ai"
        >
          {expanded ? (
            <><span>Show less</span><ChevronUp className="w-4 h-4" /></>
          ) : (
            <><span>Show more</span><ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
