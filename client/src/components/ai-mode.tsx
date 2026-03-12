import { useState, useRef, useEffect } from "react";
import { Send, Key } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { STORAGE_KEY, ApiKeyDialog } from "./ai-overview";

const MODEL = "openai/gpt-5.4";

function GeminiSparkle({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <defs>
        <linearGradient id="gspkl2" x1="0" y1="0" x2="28" y2="28">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CF" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M14 2C14 2 15.5 8.5 20 13C24.5 17.5 26 14 26 14C26 14 20.5 14.5 16 19C11.5 23.5 14 26 14 26C14 26 12.5 19.5 8 15C3.5 10.5 2 14 2 14C2 14 7.5 13.5 12 9C16.5 4.5 14 2 14 2Z"
        fill="url(#gspkl2)"
      />
    </svg>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string; favicon?: string }>;
}

interface AIModeProps {
  query: string;
  searchResults?: Array<{ title: string; description: string; url: string; favicon?: string }>;
  onResultClick: (url: string) => void;
}

function MarkdownMessage({ content, onResultClick }: { content: string; onResultClick: (url: string) => void }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="my-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 space-y-1 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-2 items-start text-sm leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-50" />
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => <h1 className="text-xl font-semibold mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-400 pl-4 my-3 text-muted-foreground italic">{children}</blockquote>
        ),
        code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
          const isBlock = className?.startsWith("language-");
          return isBlock ? (
            <code className={`text-xs font-mono ${className || ""}`}>{children}</code>
          ) : (
            <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-foreground">{children}</code>
          );
        },
        pre: ({ children }: { children?: React.ReactNode }) => (
          <pre className="bg-muted rounded-lg p-4 my-3 overflow-x-auto">{children}</pre>
        ),
        a: ({ href, children }) => (
          <button
            onClick={() => href && onResultClick(href)}
            className="text-blue-500 hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
          >
            {children}
          </button>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">{children}</th>,
        td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-3 px-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-blue-400"
          style={{ animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }}
        />
      ))}
      <style>{`@keyframes bounce { 0%, 60%, 100% { transform: translateY(0) } 30% { transform: translateY(-6px) } }`}</style>
    </div>
  );
}

export function AIMode({ query, searchResults, onResultClick }: AIModeProps) {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [showDialog, setShowDialog] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, streamContent]);

  useEffect(() => {
    if (apiKey && query && !initializedRef.current) {
      initializedRef.current = true;
      sendMessage(query, true);
    }
  }, [apiKey, query]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setShowDialog(false);
  };

  const sendMessage = async (text: string, isInitial = false) => {
    if (!apiKey || isStreaming) return;
    if (!text.trim()) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = isInitial ? [userMsg] : [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setStreamContent("");

    const context = searchResults
      ? `Available web search results for "${query}":\n` + searchResults.slice(0, 6).map(r =>
          `[${r.title}](${r.url}): ${r.description}`
        ).join("\n")
      : "";

    const systemPrompt = `You are a helpful AI assistant integrated into School-y, a web browser. You help users find information and understand topics.

${context ? `${context}\n\n` : ""}When citing sources, use markdown links like [source title](URL) — these will open in the browser. Use markdown formatting freely: **bold**, *italic*, bullet points, numbered lists, headers (##, ###), code blocks, tables. For math, use LaTeX notation. Be thorough, clear, and helpful.`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "School-y Browser",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          stream: true,
          temperature: 0.6,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            fullContent += delta;
            setStreamContent(fullContent);
          } catch {}
        }
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: fullContent,
        sources: searchResults?.slice(0, 4),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStreamContent("");
    } catch (err: any) {
      const errMsg = err?.message || "Failed to get response";
      if (errMsg.includes("401") || errMsg.includes("Unauthorized")) {
        localStorage.removeItem(STORAGE_KEY);
        setApiKey(null);
      }
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Error: ${errMsg}. Please try again.` },
      ]);
      setStreamContent("");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) sendMessage(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isStreaming) sendMessage(input.trim());
    }
  };

  if (!apiKey) {
    return (
      <>
        {showDialog && <ApiKeyDialog onSave={handleSaveKey} onClose={() => setShowDialog(false)} />}
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <GeminiSparkle size={52} className="mb-5" />
          <h2 className="text-2xl font-medium text-foreground mb-2">AI Mode</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Get comprehensive AI-powered answers with sources, citations, and rich formatting.
          </p>
          <button
            onClick={() => setShowDialog(true)}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #4285F4, #9B72CF)" }}
            data-testid="button-setup-ai-mode"
          >
            Set Up AI Mode
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="max-w-[760px] mx-auto px-4 py-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {msg.role === "assistant" ? (
                <div className="flex gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    <GeminiSparkle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground leading-relaxed">
                      <MarkdownMessage content={msg.content} onResultClick={onResultClick} />
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.sources.map((s, si) => {
                          const domain = (() => { try { return new URL(s.url).hostname.replace("www.", ""); } catch { return s.url; } })();
                          return (
                            <button
                              key={si}
                              onClick={() => onResultClick(s.url)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 transition-colors"
                              data-testid={`button-ai-source-${si}`}
                            >
                              {s.favicon ? (
                                <img src={s.favicon} className="w-3 h-3 rounded-full" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-muted" />
                              )}
                              {domain}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm text-white leading-relaxed"
                  style={{ background: "linear-gradient(135deg, #4285F4, #6B72CF)" }}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <GeminiSparkle size={18} />
              </div>
              <div className="flex-1 min-w-0 text-sm text-foreground leading-relaxed">
                {streamContent ? (
                  <MarkdownMessage content={streamContent} onResultClick={onResultClick} />
                ) : (
                  <TypingIndicator />
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 bg-background">
        <div className="max-w-[760px] mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 rounded-2xl border border-border bg-background overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                rows={1}
                disabled={isStreaming}
                className="w-full px-4 py-3 text-sm bg-transparent outline-none resize-none text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                style={{ maxHeight: "120px" }}
                data-testid="input-ai-message"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="p-2.5 rounded-full text-white transition-all disabled:opacity-40 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4285F4, #9B72CF)" }}
              data-testid="button-send-ai"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
            AI Mode uses {MODEL} · Responses may be inaccurate
          </p>
        </div>
      </div>
    </div>
  );
}
