import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Send, Image as ImageIcon, Reply, Pencil, Trash2, X, Plus,
  Users, MessageSquarePlus, SmilePlus, Check, Info, ChevronLeft,
  Search, UserPlus
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserMeta {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

interface Message {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  imageUrl?: string | null;
  replyToId?: string | null;
  editedAt?: string | null;
  originalContent?: string | null;
  isSystem?: boolean;
  createdAt: string;
  user: UserMeta;
  reactions: MessageReaction[];
}

interface Conversation {
  id: string;
  name?: string | null;
  type: "everyone" | "dm" | "group";
  displayName?: string | null;
  avatarUrl?: string | null;
  members: UserMeta[];
  lastMessage?: Message | null;
  createdAt: string;
}

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "👎"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(u: UserMeta) {
  return (u.displayName || u.username || "?").slice(0, 2).toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isThisYear) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function shouldShowDateSeparator(msgs: Message[], i: number) {
  if (i === 0) return true;
  const prev = new Date(msgs[i - 1].createdAt);
  const curr = new Date(msgs[i].createdAt);
  return prev.toDateString() !== curr.toDateString();
}

// ─── UserAvatar ───────────────────────────────────────────────────────────────

function UserAvatar({ user, size = "sm" }: { user: UserMeta; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <Avatar className={cls}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.username} />}
      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">{initials(user)}</AvatarFallback>
    </Avatar>
  );
}

// ─── EmojiPicker ─────────────────────────────────────────────────────────────

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 flex gap-1" style={{ bottom: "110%", right: 0 }}>
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }}
          className="text-xl hover:scale-125 transition-transform p-1 rounded-xl hover:bg-gray-100">
          {e}
        </button>
      ))}
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg, isMine, allMessages, currentUserId, onReply, onEdit, onDelete, onReact,
}: {
  msg: Message; isMine: boolean; allMessages: Message[];
  currentUserId?: string; onReply: (m: Message) => void;
  onEdit: (m: Message) => void; onDelete: (id: string) => void;
  onReact: (msgId: string, emoji: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const replyTarget = msg.replyToId ? allMessages.find(m => m.id === msg.replyToId) : null;

  // Group reactions
  const reactionGroups: Record<string, { count: number; mine: boolean }> = {};
  for (const r of msg.reactions) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, mine: false };
    reactionGroups[r.emoji].count++;
    if (r.userId === currentUserId) reactionGroups[r.emoji].mine = true;
  }

  if (msg.isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== msg.content) {
      onEdit({ ...msg, content: editText.trim() });
    }
    setEditing(false);
  };

  return (
    <div className={`flex gap-2 items-end group mb-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setShowEmoji(false); }}>

      {/* Avatar (others only) */}
      {!isMine && (
        <div className="w-8 flex-shrink-0 mb-1">
          <UserAvatar user={msg.user} size="sm" />
        </div>
      )}

      <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
        {/* Username (others only) */}
        {!isMine && (
          <span className="text-xs text-gray-500 mb-1 ml-1">{msg.user.displayName || msg.user.username}</span>
        )}

        {/* Reply context */}
        {replyTarget && (
          <div className={`text-xs px-3 py-1.5 mb-1 rounded-2xl border max-w-full ${
            isMine ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-100 border-gray-200 text-gray-600"
          } truncate`}>
            <span className="font-semibold">{replyTarget.user.displayName || replyTarget.user.username}</span>: {replyTarget.content}
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          {editing ? (
            <div className="flex flex-col gap-1">
              <textarea
                ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } if (e.key === "Escape") setEditing(false); }}
                className="rounded-2xl px-3.5 py-2.5 text-sm bg-white border-2 border-blue-400 outline-none resize-none min-w-[200px]"
                rows={2} autoFocus
              />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleEditSubmit}>Save</Button>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed cursor-default ${
                isMine
                  ? "bg-blue-500 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
              }`}
            >
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="attachment" className="rounded-xl mb-2 max-w-[250px] max-h-[200px] object-cover cursor-pointer"
                  onClick={() => window.open(msg.imageUrl!, "_blank")} />
              )}
              <span>{msg.content}</span>
              {msg.editedAt && (
                <button onClick={() => setShowOriginal(v => !v)}
                  className={`text-xs ml-2 opacity-60 underline underline-offset-2 ${isMine ? "text-blue-100" : "text-gray-500"}`}>
                  edited
                </button>
              )}
              {showOriginal && msg.originalContent && (
                <div className={`text-xs mt-1 pt-1 border-t opacity-70 ${isMine ? "border-blue-300" : "border-gray-300"}`}>
                  Original: {msg.originalContent}
                </div>
              )}
            </div>
          )}

          {/* Action bar */}
          <div className={`absolute ${isMine ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity ${hovered && !editing ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className="relative">
              <button onClick={() => setShowEmoji(v => !v)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
              {showEmoji && <EmojiPicker onSelect={emoji => onReact(msg.id, emoji)} onClose={() => setShowEmoji(false)} />}
            </div>
            <button onClick={() => onReply(msg)}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
              <Reply className="h-3.5 w-3.5" />
            </button>
            {isMine && (
              <>
                <button onClick={() => { setEditing(true); setEditText(msg.content); }}
                  className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(msg.id)}
                  className="p-1.5 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactionGroups).map(([emoji, { count, mine }]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  mine ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {emoji} {count > 1 && <span>{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className={`text-[10px] text-gray-400 mt-0.5 ${isMine ? "mr-1" : "ml-1"}`}>
          {formatTime(msg.createdAt)}
        </span>
      </div>

      {/* Spacer for own messages */}
      {isMine && <div className="w-8 flex-shrink-0" />}
    </div>
  );
}

// ─── ConversationItem ─────────────────────────────────────────────────────────

function ConversationItem({ conv, isActive, onClick, currentUserId }: {
  conv: Conversation; isActive: boolean; onClick: () => void; currentUserId?: string;
}) {
  const lastMsg = conv.lastMessage;
  const previewText = lastMsg
    ? lastMsg.isSystem ? lastMsg.content
    : lastMsg.imageUrl && !lastMsg.content ? "Image"
    : lastMsg.content
    : "No messages yet";

  const ConvAvatar = () => {
    if (conv.type === "everyone") {
      return (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-white" />
        </div>
      );
    }
    if (conv.type === "group") {
      return (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">{(conv.displayName || conv.name || "G").slice(0, 2).toUpperCase()}</span>
        </div>
      );
    }
    const other = conv.members?.find(m => m.id !== currentUserId);
    return (
      <Avatar className="h-10 w-10 flex-shrink-0">
        {other?.avatarUrl && <AvatarImage src={other.avatarUrl} />}
        <AvatarFallback className="bg-gray-200 text-gray-600 font-semibold">
          {initials(other || { id: "", username: "?" })}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
      isActive ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-50"
    }`}>
      <ConvAvatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {conv.displayName || conv.name || "Conversation"}
          </span>
          {lastMsg && (
            <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(lastMsg.createdAt)}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{previewText}</p>
      </div>
    </button>
  );
}

// ─── UserSearchInput ──────────────────────────────────────────────────────────

function UserSearchInput({ onSelect, excluded = [], label = "Search users..." }: {
  onSelect: (user: UserMeta) => void;
  excluded?: string[];
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults((data as UserMeta[]).filter(u => !excluded.includes(u.id)));
      } catch {} finally { setLoading(false); }
    }, 250);
  }, [q, excluded.join(",")]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
        <Search className="h-4 w-4 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={label}
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {results.map(u => (
            <button key={u.id} onClick={() => { onSelect(u); setQ(""); setResults([]); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors">
              <UserAvatar user={u} size="sm" />
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">{u.displayName || u.username}</div>
                {u.displayName && <div className="text-xs text-gray-500">@{u.username}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NewConversationModal ─────────────────────────────────────────────────────

function NewConversationModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}) {
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [selectedUser, setSelectedUser] = useState<UserMeta | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<UserMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createDm = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/conversations/dm", { targetUserId: selectedUser.id });
      const conv = await res.json();
      onCreated(conv);
      onClose();
    } catch { toast({ title: "Failed to start conversation", variant: "destructive" }); }
    setLoading(false);
  };

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/conversations/group", {
        name: groupName.trim(), memberIds: groupMembers.map(m => m.id),
      });
      const conv = await res.json();
      onCreated(conv);
      onClose();
    } catch { toast({ title: "Failed to create group", variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] max-h-[600px] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Message</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mt-4 bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setTab("dm")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${tab === "dm" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            Direct Message
          </button>
          <button onClick={() => setTab("group")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${tab === "group" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            Group Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 flex flex-col gap-4">
          {tab === "dm" ? (
            <>
              <UserSearchInput onSelect={setSelectedUser} label="Search by username..." />
              {selectedUser && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <UserAvatar user={selectedUser} size="md" />
                  <div>
                    <div className="font-semibold text-gray-900">{selectedUser.displayName || selectedUser.username}</div>
                    {selectedUser.displayName && <div className="text-xs text-gray-500">@{selectedUser.username}</div>}
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="ml-auto p-1 rounded-full hover:bg-blue-100 text-blue-500"><X className="h-4 w-4" /></button>
                </div>
              )}
              <Button onClick={createDm} disabled={!selectedUser || loading} className="w-full rounded-xl">
                {loading ? "Starting..." : "Start Conversation"}
              </Button>
            </>
          ) : (
            <>
              <input value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="Group chat name..." className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300" />
              <UserSearchInput onSelect={u => setGroupMembers(prev => prev.find(m => m.id === u.id) ? prev : [...prev, u])}
                excluded={groupMembers.map(m => m.id)} label="Add members..." />
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {groupMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-blue-100 text-blue-700 rounded-full px-2.5 py-1 text-xs font-medium">
                      {m.displayName || m.username}
                      <button onClick={() => setGroupMembers(prev => prev.filter(x => x.id !== m.id))}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0 || loading} className="w-full rounded-xl">
                {loading ? "Creating..." : `Create Group${groupMembers.length > 0 ? ` (${groupMembers.length + 1})` : ""}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MessageInput ─────────────────────────────────────────────────────────────

function MessageInput({ onSend, replyTo, onCancelReply, disabled }: {
  onSend: (content: string, imageUrl?: string, replyToId?: string) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSend = () => {
    if (!text.trim() && !imageUrl) return;
    onSend(text.trim(), imageUrl || undefined, replyTo?.id);
    setText("");
    setImageUrl("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const res = await apiRequest("POST", "/api/upload", { dataUrl: reader.result, filename: file.name });
        const data = await res.json();
        setImageUrl(data.url);
      } catch { toast({ title: "Upload failed", variant: "destructive" }); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
          <div className="w-1 h-full bg-blue-400 rounded-full flex-shrink-0" />
          <Reply className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-blue-600">{replyTo.user.displayName || replyTo.user.username}</span>
            <p className="text-xs text-gray-600 truncate">{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-blue-100 text-blue-400"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Image preview */}
      {imageUrl && (
        <div className="relative inline-block mb-2">
          <img src={imageUrl} alt="attachment" className="h-20 w-20 object-cover rounded-xl border border-gray-200" />
          <button onClick={() => setImageUrl("")}
            className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Image button */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading || disabled}
          className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors flex-shrink-0 mb-0.5">
          <ImageIcon className="h-5 w-5" />
        </button>

        {/* Text input */}
        <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 flex items-end gap-2">
          <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={disabled ? "Sign in to send messages..." : "iMessage"}
            disabled={disabled}
            rows={1}
            style={{ resize: "none", maxHeight: "120px", overflow: "auto" }}
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 min-w-0 disabled:cursor-not-allowed"
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
        </div>

        {/* Send button */}
        <button onClick={handleSend} disabled={(!text.trim() && !imageUrl) || disabled}
          className={`p-2.5 rounded-full flex-shrink-0 mb-0.5 transition-all ${
            (text.trim() || imageUrl) && !disabled
              ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}>
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ─── ConversationThread ───────────────────────────────────────────────────────

function ConversationThread({ conv, currentUser, onBack }: {
  conv: Conversation;
  currentUser: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null } | null;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`);
      if (res.ok) setMessages(await res.json());
    } catch {} finally { setLoading(false); }
  }, [conv.id]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    fetchMessages();
  }, [conv.id]);

  // SSE for live updates
  useEffect(() => {
    const es = new EventSource("/api/messages/sse");
    es.addEventListener("message", e => {
      const msg = JSON.parse(e.data) as Message;
      if (msg.conversationId === conv.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
    es.addEventListener("message_edited", e => {
      const msg = JSON.parse(e.data) as Message;
      if (msg.conversationId === conv.id) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
      }
    });
    es.addEventListener("message_deleted", e => {
      const { id, conversationId } = JSON.parse(e.data);
      if (conversationId === conv.id) setMessages(prev => prev.filter(m => m.id !== id));
    });
    es.addEventListener("reactions_updated", e => {
      const { messageId, reactions, conversationId } = JSON.parse(e.data);
      if (conversationId === conv.id) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
      }
    });
    return () => es.close();
  }, [conv.id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (content: string, imageUrl?: string, replyToId?: string) => {
    if (!currentUser) return;
    try {
      await apiRequest("POST", `/api/conversations/${conv.id}/messages`, { content, imageUrl, replyToId });
      setReplyTo(null);
    } catch { toast({ title: "Failed to send", variant: "destructive" }); }
  };

  const handleEdit = async (msg: Message) => {
    try {
      await apiRequest("PATCH", `/api/messages/${msg.id}`, { content: msg.content });
    } catch { toast({ title: "Failed to edit", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/messages/${id}`);
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      const res = await apiRequest("POST", `/api/messages/${msgId}/reactions`, { emoji });
      const { reactions } = await res.json();
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m));
    } catch {}
  };

  const handleAddMember = async (user: UserMeta) => {
    try {
      await apiRequest("POST", `/api/conversations/${conv.id}/members`, { userId: user.id });
      setAddingMember(false);
      toast({ title: `Added ${user.displayName || user.username}` });
    } catch { toast({ title: "Failed to add member", variant: "destructive" }); }
  };

  // Conversation header display
  const isEveryoneConv = conv.type === "everyone";
  const isDm = conv.type === "dm";
  const other = isDm ? conv.members?.find(m => m.id !== currentUser?.id) : null;
  const headerTitle = conv.displayName || conv.name || "Conversation";
  const memberCount = conv.members?.length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 md:hidden">
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Avatar area */}
        {isEveryoneConv ? (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
        ) : isDm && other ? (
          <Avatar className="h-10 w-10">
            {other.avatarUrl && <AvatarImage src={other.avatarUrl} />}
            <AvatarFallback className="bg-gray-200 font-semibold">{initials(other)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{headerTitle.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 text-sm truncate">{headerTitle}</h2>
          <p className="text-xs text-gray-500">
            {isEveryoneConv ? `${memberCount} members` : isDm ? (other?.displayName ? `@${other.username}` : "Direct Message") : `${memberCount} members`}
          </p>
        </div>

        {/* Info button for groups */}
        {!isDm && (
          <button onClick={() => setShowInfo(v => !v)}
            className={`p-2 rounded-full transition-colors ${showInfo ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}>
            <Info className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Group info panel */}
      {showInfo && !isDm && (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Members ({memberCount})</span>
            {!isEveryoneConv && currentUser && (
              <button onClick={() => setAddingMember(v => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700">
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            )}
          </div>
          {addingMember && (
            <div className="mb-3">
              <UserSearchInput onSelect={handleAddMember} excluded={conv.members?.map(m => m.id)} label="Search users to add..." />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {conv.members?.map(m => (
              <div key={m.id} className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 border border-gray-200 text-xs text-gray-700">
                <Avatar className="h-5 w-5">
                  {m.avatarUrl && <AvatarImage src={m.avatarUrl} />}
                  <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">{initials(m)}</AvatarFallback>
                </Avatar>
                {m.displayName || m.username}
                {m.id === currentUser?.id && <span className="text-gray-400">(you)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-sm">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageSquarePlus className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">No messages yet — say hi!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id}>
              {shouldShowDateSeparator(messages, i) && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">{formatDateSeparator(msg.createdAt)}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <MessageBubble
                msg={msg}
                isMine={msg.userId === currentUser?.id}
                allMessages={messages}
                currentUserId={currentUser?.id}
                onReply={setReplyTo}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReact={handleReact}
              />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={!currentUser}
      />
    </div>
  );
}

// ─── Main Messages Page ───────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [convLoading, setConvLoading] = useState(true);
  const { toast } = useToast();

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) {
      // Even logged-out users can see the "everyone" conversation
      try {
        const res = await fetch("/api/conversations/everyone-public");
        // We'll just fetch the everyone conv ID another way
      } catch {}
      setConvLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
        // Auto-select "everyone" or first conversation
        if (!activeConvId && data.length > 0) {
          setActiveConvId(data[0].id);
        }
      }
    } catch {} finally { setConvLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // SSE for conversation-level events
  useEffect(() => {
    if (!user) return;
    const es = new EventSource("/api/messages/sse");
    es.addEventListener("conversation_created", e => {
      const conv = JSON.parse(e.data) as Conversation;
      setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
    });
    es.addEventListener("message", e => {
      const msg = JSON.parse(e.data) as Message;
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId ? { ...c, lastMessage: msg } : c
      ).sort((a, b) => {
        if (a.type === "everyone") return -1;
        if (b.type === "everyone") return 1;
        const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bt - at;
      }));
    });
    return () => es.close();
  }, [user?.id]);

  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  const handleConvCreated = (conv: Conversation) => {
    setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
    setActiveConvId(conv.id);
  };

  // If not logged in, just show the everyone chat in read-only mode + nudge
  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <Users className="h-10 w-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">School Messages</h2>
          <p className="text-gray-500 text-sm mt-1">Sign in to send messages and start conversations</p>
        </div>
        <Button onClick={() => setShowAuthModal(true)} className="rounded-full px-8">Sign In</Button>
        {showAuthModal && <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />}
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col border-r border-gray-100 bg-white flex-shrink-0 w-full md:w-72 xl:w-80`}>
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <button onClick={() => setShowNewModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 text-blue-500 transition-colors">
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {convLoading ? (
            <div className="flex flex-col gap-2 p-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4 gap-2">
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <button onClick={() => setShowNewModal(true)} className="text-blue-500 text-sm font-medium hover:underline">
                Start one
              </button>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                currentUserId={user.id}
                onClick={() => { setActiveConvId(conv.id); setShowSidebar(false); }}
              />
            ))
          )}
        </div>
      </div>

      {/* Thread panel */}
      <div className={`flex-1 flex flex-col min-w-0 ${!showSidebar || activeConv ? "flex" : "hidden md:flex"}`}>
        {activeConv ? (
          <ConversationThread
            key={activeConv.id}
            conv={activeConv}
            currentUser={user}
            onBack={() => setShowSidebar(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageSquarePlus className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Select a conversation</h3>
            <p className="text-gray-400 text-sm">Choose from your conversations or start a new one</p>
            <Button variant="outline" onClick={() => setShowNewModal(true)} className="rounded-full mt-1">
              <Plus className="h-4 w-4 mr-1" /> New Message
            </Button>
          </div>
        )}
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleConvCreated}
        />
      )}
    </div>
  );
}
