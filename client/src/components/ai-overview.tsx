import { useState, useEffect, useRef } from "react";
import { Sparkles, Key, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "schooly_openrouter_key";
const MODEL = "openai/gpt-5.4";

interface AIOverviewProps {
  query: string;
  results?: Array<{ title: string; description: string; url: string }>;
}

function ApiKeyDialog({ onSave, onClose }: { onSave: (key: string) => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Set Up AI Overview</h2>
              <p className="text-sm text-muted-foreground">Enter your OpenRouter API key</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-api-dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          AI Overview uses <span className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">{MODEL}</span> via OpenRouter to summarize search topics.
          Get a free key at <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-primary hover:underline">openrouter.ai</a>
        </p>

        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onSave(value.trim())}
          placeholder="sk-or-v1-..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors font-mono mb-4"
          data-testid="input-api-key"
        />

        <div className="flex items-center gap-3 justify-end">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-cancel-api">
            Cancel
          </button>
          <Button
            onClick={() => value.trim() && onSave(value.trim())}
            disabled={!value.trim()}
            size="sm"
            data-testid="button-save-api-key"
          >
            Save Key
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AIOverview({ query, results }: AIOverviewProps) {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [showDialog, setShowDialog] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
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
      ? results.slice(0, 5).map(r => `• ${r.title}: ${r.description}`).join("\n")
      : "";

    const prompt = `You are a helpful search assistant. Provide a concise, accurate AI Overview for the search query "${query}". 
${context ? `\nTop search results for context:\n${context}` : ""}

Write 2-4 sentences summarizing the key facts about "${query}". Be factual, clear, and informative. Do not use markdown headers. Keep it conversational and direct.`;

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
        max_tokens: 200,
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

  return (
    <>
      {showDialog && (
        <ApiKeyDialog onSave={handleSaveKey} onClose={() => setShowDialog(false)} />
      )}

      <div className="mb-6 rounded-xl border border-border bg-background overflow-hidden" data-testid="section-ai-overview">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Overview</span>
            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Beta</span>
          </div>
          <div className="flex items-center gap-2">
            {apiKey && (
              <button
                onClick={() => { setShowDialog(true); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-change-api-key"
                title="Change API key"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-ai-overview"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-4 py-4">
            {!apiKey ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Connect an AI model to get instant summaries of any search topic.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDialog(true)}
                  className="ml-4 flex-shrink-0"
                  data-testid="button-setup-ai"
                >
                  <Key className="w-3.5 h-3.5 mr-1.5" />
                  Set Up
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-500">
                  {error.includes("401") || error.includes("Unauthorized")
                    ? "Invalid API key. Please check your OpenRouter key."
                    : `Could not generate overview: ${error}`}
                </p>
                <Button size="sm" variant="ghost" onClick={() => { fetchedRef.current = ""; setSummary(null); setError(null); }} className="ml-2 flex-shrink-0" data-testid="button-retry-ai">
                  Retry
                </Button>
              </div>
            ) : summary ? (
              <p className="text-sm text-foreground leading-relaxed" data-testid="text-ai-summary">{summary}</p>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
