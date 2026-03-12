import { useState, useEffect, useRef } from "react";
import { Key, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const STORAGE_KEY = "schooly_openrouter_key";
const MODEL = "openai/gpt-5.4";

function GeminiSparkle({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <defs>
        <linearGradient id="gemini-grad" x1="0" y1="0" x2="28" y2="28">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CF" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M14 2C14 2 15.5 8.5 20 13C24.5 17.5 26 14 26 14C26 14 20.5 14.5 16 19C11.5 23.5 14 26 14 26C14 26 12.5 19.5 8 15C3.5 10.5 2 14 2 14C2 14 7.5 13.5 12 9C16.5 4.5 14 2 14 2Z"
        fill="url(#gemini-grad)"
      />
    </svg>
  );
}

export function ApiKeyDialog({ onSave, onClose }: { onSave: (key: string) => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <GeminiSparkle size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Set Up AI Features</h2>
              <p className="text-sm text-muted-foreground">Enter your OpenRouter API key</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-api-dialog">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Powers AI Overview and AI Mode using <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{MODEL}</span>.
          Get a free key at <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">openrouter.ai</a>
        </p>
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onSave(value.trim())}
          placeholder="sk-or-v1-..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-blue-500 transition-colors font-mono mb-4"
          data-testid="input-api-key"
        />
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground" data-testid="button-cancel-api">Cancel</button>
          <Button onClick={() => value.trim() && onSave(value.trim())} disabled={!value.trim()} size="sm" data-testid="button-save-api-key">
            Save Key
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AIOverviewProps {
  query: string;
  results?: Array<{ title: string; description: string; url: string; favicon?: string }>;
  onResultClick?: (url: string) => void;
}

export function AIOverview({ query, results, onResultClick }: AIOverviewProps) {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [showDialog, setShowDialog] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fetchedRef = useRef<string>("");

  const handleSaveKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setShowDialog(false);
    setSummary(null);
    setError(null);
    fetchedRef.current = "";
  };

  useEffect(() => {
    if (!apiKey || !query || fetchedRef.current === query) return;
    fetchedRef.current = query;
    setSummary(null);
    setError(null);
    setIsLoading(true);

    const context = results
      ? results.slice(0, 5).map(r => `Source: ${r.title} (${r.url})\n${r.description}`).join("\n\n")
      : "";

    const prompt = `You are an AI search assistant providing an overview for the query: "${query}"

${context ? `Search results for context:\n${context}\n\n` : ""}Provide a clear, well-formatted overview using markdown. Include:
- A brief introductory sentence or two
- 2-4 bullet points with **bold** key terms followed by concise explanations
- Keep it factual and informative
- Do not cite sources inline (they will be shown separately)
- Do not use h1/h2/h3 headers
- Keep total length under 200 words`;

    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "School-y Browser",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.4,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error.message || "API error");
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error("No response");
        setSummary(text.trim());
      })
      .catch((err) => {
        setError(err.message || "Failed to generate overview");
        if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
          localStorage.removeItem(STORAGE_KEY);
          setApiKey(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, [apiKey, query, results]);

  const PREVIEW_LENGTH = 280;
  const needsExpand = summary && summary.length > PREVIEW_LENGTH;
  const displayedSummary = summary && !expanded && needsExpand
    ? summary.slice(0, PREVIEW_LENGTH) + "..."
    : summary;

  const sources = results?.slice(0, 4) || [];

  return (
    <>
      {showDialog && <ApiKeyDialog onSave={handleSaveKey} onClose={() => setShowDialog(false)} />}

      <div
        className="mb-6 rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)" }}
        data-testid="section-ai-overview"
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <GeminiSparkle size={20} />
              <span className="text-[15px] font-medium text-white">AI Overview</span>
            </div>
            <div className="flex items-center gap-2">
              {apiKey && (
                <button
                  onClick={() => setShowDialog(true)}
                  className="text-white/40 hover:text-white/70 transition-colors"
                  title="Change API key"
                  data-testid="button-change-api-key"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {!apiKey ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-white/60">
                Connect an AI model to get instant, synthesized overviews for any search topic.
              </p>
              <button
                onClick={() => setShowDialog(true)}
                className="flex-shrink-0 px-4 py-1.5 text-sm rounded-full border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                data-testid="button-setup-ai"
              >
                Set Up
              </button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2.5 py-1">
              <div className="h-3 rounded-full animate-pulse w-full" style={{ background: "rgba(255,255,255,0.1)" }} />
              <div className="h-3 rounded-full animate-pulse w-11/12" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="h-3 rounded-full animate-pulse w-4/5" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 rounded-full animate-pulse w-3/5" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
          ) : error ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-red-400">
                {error.includes("401") || error.includes("Unauthorized")
                  ? "Invalid API key. Please update your OpenRouter key."
                  : `Could not generate overview: ${error}`}
              </p>
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
              <div className="text-sm text-white/90 leading-relaxed ai-overview-content" data-testid="text-ai-summary">
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
                      <button
                        onClick={() => href && onResultClick?.(href)}
                        className="text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        {children}
                      </button>
                    ),
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "rgba(255,255,255,0.12)" }}>
                        {children}
                      </code>
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
    </>
  );
}
