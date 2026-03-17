import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import {
  Send, Image as ImageIcon, Reply, Pencil, Trash2, X,
  MessageSquare, AlertTriangle, ChevronDown, Check
} from "lucide-react";

interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

interface Message {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  replyToId: string | null;
  editedAt: string | null;
  originalContent: string | null;
  createdAt: string;
  user: MessageUser;
  reactions: MessageReaction[];
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "💯"];

function getInitials(user: MessageUser) {
  const name = user.displayName || user.username;
  return name.slice(0, 2).toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString();
}

function groupReactions(reactions: MessageReaction[]) {
  const map: Record<string, string[]> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = [];
    map[r.emoji].push(r.userId);
  }
  return map;
}

function ReactionBar({ reactions, messageId, currentUserId, onToggle }: {
  reactions: MessageReaction[];
  messageId: string;
  currentUserId?: string;
  onToggle: (messageId: string, emoji: string) => void;
}) {
  const grouped = groupReactions(reactions);
  if (Object.keys(grouped).length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, userIds]) => (
        <button
          key={emoji}
          onClick={() => onToggle(messageId, emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
            currentUserId && userIds.includes(currentUserId)
              ? "bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-600"
              : "bg-muted border-border hover:bg-muted/80"
          }`}
          title={`${userIds.length} reaction${userIds.length !== 1 ? "s" : ""}`}
        >
          <span>{emoji}</span>
          <span className="text-muted-foreground">{userIds.length}</span>
        </button>
      ))}
    </div>
  );
}

function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute bottom-8 right-0 z-50 bg-background border border-border rounded-xl shadow-lg p-2 flex gap-1.5 flex-wrap w-48">
      {EMOJI_LIST.map(e => (
        <button key={e} onClick={() => { onPick(e); onClose(); }} className="text-lg hover:scale-110 transition-transform p-1 rounded">{e}</button>
      ))}
    </div>
  );
}

function MessageBubble({
  msg,
  messages,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: {
  msg: Message;
  messages: Message[];
  currentUserId?: string;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (id: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const isOwn = currentUserId === msg.userId;
  const [showEmoji, setShowEmoji] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const replyTarget = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

  return (
    <div className={`group flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`} data-testid={`message-${msg.id}`}>
      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
        <AvatarImage src={msg.user.avatarUrl || undefined} />
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          {getInitials(msg.user)}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs font-semibold text-foreground">
            {msg.user.displayName || msg.user.username}
          </span>
          <span className="text-[11px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
          {msg.editedAt && (
            <span className="text-[10px] text-muted-foreground italic">(edited)</span>
          )}
        </div>

        {replyTarget && (
          <div className={`text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 mb-1 max-w-full truncate ${isOwn ? "text-right border-r-2 border-l-0 pr-2 pl-0" : ""}`}>
            <span className="font-medium">{replyTarget.user.displayName || replyTarget.user.username}: </span>
            {replyTarget.content.slice(0, 60)}{replyTarget.content.length > 60 ? "…" : ""}
          </div>
        )}

        <div className="relative">
          <div
            className={`rounded-2xl px-3 py-2 text-sm cursor-pointer select-text ${
              isOwn
                ? "bg-[#4285F4] text-white rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}
            onClick={() => msg.editedAt && setShowOriginal(v => !v)}
            title={msg.editedAt ? "Click to see original" : undefined}
          >
            {showOriginal && msg.originalContent ? (
              <div>
                <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                  <span>Original:</span>
                  <button onClick={(e) => { e.stopPropagation(); setShowOriginal(false); }} className="opacity-70 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
                <span className="line-through opacity-60">{msg.originalContent}</span>
                <div className="text-xs opacity-70 mt-1">Edited:</div>
                <span>{msg.content}</span>
              </div>
            ) : (
              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
            )}
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="attached"
                className="mt-2 rounded-lg max-w-[200px] max-h-[200px] object-cover cursor-pointer"
                onClick={(e) => { e.stopPropagation(); window.open(msg.imageUrl!, "_blank"); }}
              />
            )}
          </div>

          {/* Action bar on hover */}
          <div className={`absolute top-1 ${isOwn ? "right-full mr-1" : "left-full ml-1"} hidden group-hover:flex items-center gap-0.5 bg-background border border-border rounded-lg shadow px-1 py-0.5`}>
            <button
              title="Reply"
              onClick={() => onReply(msg)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            ><Reply className="w-3.5 h-3.5" /></button>
            <button
              title="React"
              onClick={() => setShowEmoji(v => !v)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-base leading-none"
            >+</button>
            {isOwn && (
              <>
                <button
                  title="Edit"
                  onClick={() => onEdit(msg)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                ><Pencil className="w-3.5 h-3.5" /></button>
                <button
                  title="Delete"
                  onClick={() => onDelete(msg.id)}
                  className="p-1 rounded hover:bg-muted text-red-500 hover:text-red-600 transition-colors"
                ><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
            {showEmoji && (
              <EmojiPicker onPick={(e) => onReact(msg.id, e)} onClose={() => setShowEmoji(false)} />
            )}
          </div>
        </div>

        <ReactionBar
          reactions={msg.reactions}
          messageId={msg.id}
          currentUserId={currentUserId}
          onToggle={onReact}
        />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  // Fetch initial messages
  useEffect(() => {
    fetch("/api/messages")
      .then(r => r.json())
      .then(data => { setMessages(data); setLoading(false); setTimeout(() => scrollToBottom(false), 50); })
      .catch(() => setLoading(false));
  }, []);

  // SSE for live updates
  useEffect(() => {
    const es = new EventSource("/api/messages/sse");
    es.addEventListener("message", (e) => {
      const msg: Message = JSON.parse(e.data);
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollToBottom(true), 50);
    });
    es.addEventListener("message_edited", (e) => {
      const updated: Message = JSON.parse(e.data);
      setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
    });
    es.addEventListener("message_deleted", (e) => {
      const { id } = JSON.parse(e.data);
      setMessages(prev => prev.filter(m => m.id !== id));
    });
    es.addEventListener("reactions_updated", (e) => {
      const { messageId, reactions } = JSON.parse(e.data);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });
    return () => es.close();
  }, []);

  // Scroll observer
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handler = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const handleSend = async () => {
    if (!user) { setShowAuthModal(true); return; }
    const content = input.trim();
    if (!content && !imagePreview) return;
    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (imagePreview) {
        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: imagePreview }),
        });
        if (res.ok) { const d = await res.json(); imageUrl = d.url; }
      }

      if (editingMsg) {
        await fetch(`/api/messages/${editingMsg.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        setEditingMsg(null);
      } else {
        await fetch("/api/messages", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, imageUrl, replyToId: replyTo?.id || null }),
        });
        setReplyTo(null);
      }
      setInput("");
      setImagePreview(null);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await fetch(`/api/messages/${id}`, { method: "DELETE", credentials: "include" });
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) { setShowAuthModal(true); return; }
    await fetch(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEdit = (msg: Message) => {
    setEditingMsg(msg);
    setInput(msg.content);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => { setEditingMsg(null); setInput(""); };
  const cancelReply = () => setReplyTo(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#4285F4]" />
            <h1 className="font-semibold text-foreground text-base">School Messages</h1>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#EA4335] text-white rounded-full uppercase tracking-wide">Beta</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* Beta warning */}
      <div className="flex-shrink-0 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Beta:</strong> School Messages is experimental. Keep it respectful — messages are visible to everyone.
        </p>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-sm">No messages yet. Be the first to say something!</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            messages={messages}
            currentUserId={user?.id}
            onReply={setReplyTo}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReact}
          />
        ))}
        <div ref={messagesEndRef} />

        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom(true)}
            className="fixed bottom-24 right-6 bg-[#4285F4] text-white rounded-full p-2 shadow-lg z-20 hover:bg-blue-600 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border bg-background px-4 py-3">
        {/* Reply/Edit indicator */}
        {(replyTo || editingMsg) && (
          <div className="flex items-center justify-between mb-2 bg-muted rounded-lg px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {replyTo ? (
                <>
                  <Reply className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Replying to <strong>{replyTo.user.displayName || replyTo.user.username}</strong>: {replyTo.content.slice(0, 50)}…</span>
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Editing message</span>
                </>
              )}
            </div>
            <button onClick={replyTo ? cancelReply : cancelEdit} className="p-0.5 text-muted-foreground hover:text-foreground ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img src={imagePreview} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-border" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            ><X className="w-3 h-3" /></button>
          </div>
        )}

        {!user && (
          <div className="mb-2 text-xs text-muted-foreground text-center bg-muted rounded-lg py-2 px-3">
            <button onClick={() => setShowAuthModal(true)} className="text-[#4285F4] hover:underline font-medium">Sign in</button> to send messages. You can still read the chat.
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? "Type a message… (Enter to send, Shift+Enter for new line)" : "Sign in to send messages"}
              disabled={!user || sending}
              className="w-full resize-none rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:border-[#4285F4]/50 focus:ring-1 focus:ring-[#4285F4]/30 placeholder:text-muted-foreground disabled:opacity-50 min-h-[44px] max-h-[120px]"
              rows={1}
              data-testid="input-message"
              style={{ height: "auto" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
          </div>
          {user && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Attach image"
                data-testid="button-attach-image"
                className="flex-shrink-0"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            size="icon"
            onClick={user ? handleSend : () => setShowAuthModal(true)}
            disabled={sending || (user ? (!input.trim() && !imagePreview) : false)}
            data-testid="button-send-message"
            className="flex-shrink-0 bg-[#4285F4] hover:bg-[#3b73d8] text-white"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
