import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GeminiSparkle } from "./ai-overview";

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
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-40" />
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => <h1 className="text-xl font-semibold mt-4 mb-2" style={{ color: "#202124" }}>{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2" style={{ color: "#202124" }}>{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1" style={{ color: "#202124" }}>{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold" style={{ color: "#202124" }}>{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-400 pl-4 my-3 italic" style={{ color: "#5f6368" }}>{children}</blockquote>
        ),
        code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
          const isBlock = className?.startsWith("language-");
          return isBlock ? (
            <code className={`text-xs font-mono ${className || ""}`}>{children}</code>
          ) : (
            <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "#f1f3f4", color: "#202124" }}>{children}</code>
          );
        },
        pre: ({ children }: { children?: React.ReactNode }) => (
          <pre className="rounded-lg p-4 my-3 overflow-x-auto text-xs font-mono" style={{ background: "#f1f3f4" }}>{children}</pre>
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
        th: ({ children }) => <th className="border border-gray-200 px-3 py-2 font-semibold text-left" style={{ background: "#f8f9fa" }}>{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
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
          className="w-2 h-2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #4285F4, #9B72CF)",
            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes bounce { 0%, 60%, 100% { transform: translateY(0) } 30% { transform: translateY(-6px) } }`}</style>
    </div>
  );
}

export function AIMode({ query, searchResults, onResultClick }: AIModeProps) {
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
    if (query && !initializedRef.current) {
      initializedRef.current = true;
      sendMessage(query, true);
    }
  }, [query]);

  const sendMessage = async (text: string, isInitial = false) => {
    if (isStreaming) return;
    if (!text.trim()) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = isInitial ? [userMsg] : [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setStreamContent("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          query,
          searchResults: searchResults?.slice(0, 6),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as any;
        throw new Error(err?.error || `HTTP ${response.status}`);
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

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: fullContent, sources: searchResults?.slice(0, 4) },
      ]);
      setStreamContent("");
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Sorry, I couldn't get a response: ${err?.message || "Unknown error"}. Please try again.` },
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

  return (
    <div className="flex flex-col h-full" style={{ background: "#fff" }}>
      <div className="flex-1 overflow-auto" style={{ background: "#fff" }}>
        <div className="max-w-[760px] mx-auto px-4 py-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {msg.role === "assistant" ? (
                <div className="flex gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    <GeminiSparkle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-relaxed" style={{ color: "#202124" }}>
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
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs hover:border-blue-300 transition-colors"
                              style={{ border: "1px solid #dadce0", color: "#5f6368" }}
                              data-testid={`button-ai-source-${si}`}
                            >
                              {s.favicon ? (
                                <img src={s.favicon} className="w-3 h-3 rounded-full" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-gray-200" />
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
              <div className="flex-1 min-w-0 text-sm leading-relaxed" style={{ color: "#202124" }}>
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

      <div className="border-t px-4 py-3" style={{ background: "#fff", borderColor: "#e8eaed" }}>
        <div className="max-w-[760px] mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div
              className="flex-1 rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid #dfe1e5", background: "#fff", boxShadow: "0 1px 6px rgba(32,33,36,0.1)" }}
            >
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
                className="w-full px-4 py-3 text-sm outline-none resize-none disabled:opacity-50"
                style={{ background: "#fff", color: "#202124", maxHeight: "120px" }}
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
          <p className="text-[11px] mt-1.5 text-center" style={{ color: "#9aa0a6" }}>
            Powered by AI · Responses may be inaccurate
          </p>
        </div>
      </div>
    </div>
  );
}
