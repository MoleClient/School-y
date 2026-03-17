import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send, Image as ImageIcon, Reply, Pencil, Trash2, X, Plus,
  Users, MessageSquarePlus, SmilePlus, Check, Info, ChevronLeft,
  UserPlus, Lock
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

// For iMessage grouping — is this message within 5 min of same sender?
function isGroupBreak(msgs: Message[], i: number) {
  if (i === 0) return true;
  const prev = msgs[i - 1];
  const curr = msgs[i];
  if (prev.userId !== curr.userId) return true;
  const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return diff > 5 * 60 * 1000;
}

function isNextGroupBreak(msgs: Message[], i: number) {
  if (i === msgs.length - 1) return true;
  return isGroupBreak(msgs, i + 1);
}

// ─── UserAvatar ───────────────────────────────────────────────────────────────

function UserAvatar({ user, size = "sm" }: { user: UserMeta; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <Avatar className={cls}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.username} />}
      <AvatarFallback className="bg-[#E5E5EA] text-[#3C3C43] font-semibold text-xs">{initials(user)}</AvatarFallback>
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
    <div ref={ref}
      className="absolute z-50 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl p-1.5 flex gap-0.5"
      style={{ bottom: "110%", right: 0 }}>
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }}
          className="text-lg hover:scale-125 transition-transform p-1.5 rounded-xl hover:bg-[#F2F2F7]">
          {e}
        </button>
      ))}
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg, isMine, allMessages, currentUserId, onReply, onEdit, onDelete, onReact,
  isFirst, isLast, readOnly,
}: {
  msg: Message; isMine: boolean; allMessages: Message[];
  currentUserId?: string; onReply: (m: Message) => void;
  onEdit: (m: Message) => void; onDelete: (id: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  isFirst: boolean; isLast: boolean; readOnly?: boolean;
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
  for (const r of (msg.reactions || [])) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, mine: false };
    reactionGroups[r.emoji].count++;
    if (r.userId === currentUserId) reactionGroups[r.emoji].mine = true;
  }

  if (msg.isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-[#8E8E93] bg-transparent px-3 py-0.5">{msg.content}</span>
      </div>
    );
  }

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== msg.content) {
      onEdit({ ...msg, content: editText.trim() });
    }
    setEditing(false);
  };

  // iMessage-style bubble radius
  // Mine (right): default fully rounded, but if in a group:
  //   - not last → bottom-right is smaller
  //   - not first → top-right is smaller
  // Others (left): similar but mirrored
  const getBubbleRadius = () => {
    if (isMine) {
      if (isFirst && isLast) return "rounded-[22px]";
      if (isFirst) return "rounded-[22px] rounded-br-[6px]";
      if (isLast) return "rounded-[22px] rounded-tr-[6px]";
      return "rounded-[22px] rounded-tr-[6px] rounded-br-[6px]";
    } else {
      if (isFirst && isLast) return "rounded-[22px]";
      if (isFirst) return "rounded-[22px] rounded-bl-[6px]";
      if (isLast) return "rounded-[22px] rounded-tl-[6px]";
      return "rounded-[22px] rounded-tl-[6px] rounded-bl-[6px]";
    }
  };

  const bubbleRadius = getBubbleRadius();

  return (
    <div
      className={`flex gap-2 items-end group ${isMine ? "flex-row-reverse" : "flex-row"} ${isLast ? "mb-1" : "mb-[2px]"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmoji(false); }}>

      {/* Avatar (others only, last in group) */}
      <div className="w-8 flex-shrink-0 self-end mb-0.5">
        {!isMine && isLast && <UserAvatar user={msg.user} size="sm" />}
      </div>

      <div className={`flex flex-col max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
        {/* Sender name (others, first in group) */}
        {!isMine && isFirst && (
          <span className="text-[11px] text-[#8E8E93] mb-1 ml-1 font-medium">
            {msg.user.displayName || msg.user.username}
          </span>
        )}

        {/* Reply context */}
        {replyTarget && (
          <div className={`text-xs px-3 py-1.5 mb-1 rounded-[14px] max-w-full border ${
            isMine
              ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]"
              : "bg-[#F2F2F7] border-[#E5E5EA] text-[#3C3C43]"
          } truncate`}>
            <span className="font-semibold">{replyTarget.user.displayName || replyTarget.user.username}</span>
            : {replyTarget.content}
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          {editing ? (
            <div className="flex flex-col gap-1">
              <textarea
                ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } if (e.key === "Escape") setEditing(false); }}
                className="rounded-[18px] px-4 py-2.5 text-sm bg-white border-2 border-[#007AFF] outline-none resize-none min-w-[200px]"
                rows={2} autoFocus
              />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleEditSubmit}>Save</Button>
              </div>
            </div>
          ) : (
            <div
              className={`px-[14px] py-[9px] text-[15px] leading-[1.4] cursor-default select-text ${bubbleRadius} ${
                isMine
                  ? "bg-[#007AFF] text-white"
                  : "bg-[#E5E5EA] text-[#1C1C1E]"
              }`}
            >
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="attachment"
                  className="rounded-xl mb-2 max-w-[220px] max-h-[200px] object-cover cursor-pointer"
                  onClick={() => window.open(msg.imageUrl!, "_blank")} />
              )}
              <span>{msg.content}</span>
              {msg.editedAt && (
                <button
                  onClick={() => setShowOriginal(v => !v)}
                  className={`text-[10px] ml-1.5 opacity-60 underline decoration-dotted`}
                >
                  edited
                </button>
              )}
            </div>
          )}

          {/* Action buttons (hover) */}
          {!editing && !readOnly && (
            <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 ${
              isMine ? "right-full mr-1.5" : "left-full ml-1.5"
            } ${hovered ? "opacity-100" : "opacity-0"} transition-opacity`}>
              {/* Emoji react */}
              <div className="relative">
                {showEmoji && <EmojiPicker onSelect={e => onReact(msg.id, e)} onClose={() => setShowEmoji(false)} />}
                <button onClick={() => setShowEmoji(v => !v)}
                  className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#8E8E93] transition-colors">
                  <SmilePlus className="h-4 w-4" />
                </button>
              </div>
              {/* Reply */}
              <button onClick={() => onReply(msg)}
                className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#8E8E93] transition-colors">
                <Reply className="h-4 w-4" />
              </button>
              {/* Edit / Delete (mine only) */}
              {isMine && (
                <>
                  <button onClick={() => { setEditing(true); setEditText(msg.content); }}
                    className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#8E8E93] transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete(msg.id)}
                    className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#FF3B30] transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Original content on click */}
        {showOriginal && msg.originalContent && (
          <div className="text-[11px] text-[#8E8E93] mt-1 px-1 italic">
            Original: {msg.originalContent}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactionGroups).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => !readOnly && onReact(msg.id, emoji)}
                className={`flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  mine
                    ? "bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]"
                    : "bg-[#F2F2F7] border-[#E5E5EA] text-[#3C3C43]"
                }`}>
                <span>{emoji}</span>
                {count > 1 && <span className="font-medium">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp (last in group or single) */}
        {isLast && (
          <div className={`text-[10px] text-[#8E8E93] mt-1 ${isMine ? "pr-1" : "pl-1"}`}>
            {formatTime(msg.createdAt)}
            {isMine && msg.editedAt && <span className="ml-1">· edited</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MessageInput ─────────────────────────────────────────────────────────────

function MessageInput({
  onSend, replyTo, onCancelReply, disabled,
}: {
  onSend: (text: string, imageUrl?: string | null) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim() && !imageUrl) return;
    onSend(text.trim(), imageUrl);
    setText("");
    setImageUrl(null);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await apiRequest("POST", "/api/upload", { dataUrl: reader.result, filename: file.name });
        const data = await res.json();
        setImageUrl(data.url);
      } catch { alert("Upload failed"); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-t border-[#E5E5EA] bg-white px-3 py-2">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 bg-[#F2F2F7] rounded-[14px]">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-[#007AFF]">
              {replyTo.user.displayName || replyTo.user.username}
            </span>
            <p className="text-[11px] text-[#8E8E93] truncate">{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="ml-2 p-1 text-[#8E8E93] hover:text-[#3C3C43]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imageUrl && (
        <div className="relative mb-2 w-fit">
          <img src={imageUrl} className="rounded-[14px] max-h-24 max-w-[200px] object-cover" />
          <button onClick={() => setImageUrl(null)}
            className="absolute -top-1.5 -right-1.5 bg-[#8E8E93] text-white rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="p-2 text-[#007AFF] hover:bg-[#F2F2F7] rounded-full transition-colors flex-shrink-0">
          {uploading ? <div className="h-5 w-5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" /> : <ImageIcon className="h-5 w-5" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

        <div className="flex-1 flex items-end bg-white border border-[#C7C7CC] rounded-[22px] px-3 py-1.5">
          <textarea
            ref={textRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Sign in to message..." : "iMessage"}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-[15px] text-[#1C1C1E] placeholder-[#8E8E93] outline-none resize-none max-h-28 leading-[1.4] py-0.5"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim() && !imageUrl}
          className={`p-2 rounded-full flex-shrink-0 transition-colors ${
            text.trim() || imageUrl
              ? "bg-[#007AFF] text-white"
              : "bg-[#E5E5EA] text-[#8E8E93]"
          }`}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── UserSearchInput ──────────────────────────────────────────────────────────

function UserSearchInput({ onSelect, excluded = [], label }: {
  onSelect: (u: UserMeta) => void;
  excluded?: string[];
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserMeta[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 1) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data: UserMeta[] = await res.json();
          setResults(data.filter(u => !excluded.includes(u.id)));
        }
      } catch {}
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, excluded.join(",")]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setResults([]); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder={label || "Search users..."}
        className="w-full px-4 py-2.5 bg-[#F2F2F7] rounded-[14px] text-sm outline-none text-[#1C1C1E] placeholder-[#8E8E93]" />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E5EA] rounded-[14px] shadow-lg z-50 overflow-hidden">
          {results.map(u => (
            <button key={u.id} onClick={() => { onSelect(u); setQ(""); setResults([]); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F2F2F7] transition-colors">
              <UserAvatar user={u} size="sm" />
              <div className="text-left">
                <div className="text-sm font-semibold text-[#1C1C1E]">{u.displayName || u.username}</div>
                {u.displayName && <div className="text-xs text-[#8E8E93]">@{u.username}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ConversationItem ─────────────────────────────────────────────────────────

function ConversationItem({ conv, isActive, currentUserId, onClick }: {
  conv: Conversation;
  isActive: boolean;
  currentUserId?: string;
  onClick: () => void;
}) {
  const other = conv.type === "dm" ? conv.members?.find(m => m.id !== currentUserId) : null;
  const name = conv.displayName || conv.name
    || (other ? (other.displayName || other.username) : null)
    || "Conversation";
  const lastMsg = conv.lastMessage;

  return (
    <button
      onClick={onClick}
      data-testid={`conv-item-${conv.id}`}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-left transition-colors ${
        isActive ? "bg-[#007AFF]/10" : "hover:bg-[#F2F2F7]"
      }`}>
      {/* Avatar */}
      {conv.type === "everyone" ? (
        <div className="h-11 w-11 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-white" />
        </div>
      ) : conv.type === "dm" && other ? (
        <Avatar className="h-11 w-11 flex-shrink-0">
          {other.avatarUrl && <AvatarImage src={other.avatarUrl} />}
          <AvatarFallback className="bg-[#E5E5EA] text-[#3C3C43] font-semibold text-sm">{initials(other)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-11 w-11 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">{name.slice(0, 2).toUpperCase()}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[15px] font-semibold truncate ${isActive ? "text-[#007AFF]" : "text-[#1C1C1E]"}`}>
            {name}
          </span>
          {lastMsg && (
            <span className="text-[12px] text-[#8E8E93] flex-shrink-0">{formatTime(lastMsg.createdAt)}</span>
          )}
        </div>
        {lastMsg && (
          <p className="text-[13px] text-[#8E8E93] truncate">
            {lastMsg.isSystem ? lastMsg.content : (lastMsg.imageUrl ? "Photo" : lastMsg.content)}
          </p>
        )}
      </div>
    </button>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl w-full sm:w-[400px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">New Message</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#8E8E93]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex mx-5 mb-4 bg-[#F2F2F7] rounded-[12px] p-1 gap-1">
          <button onClick={() => setTab("dm")} className={`flex-1 text-[13px] font-medium py-1.5 rounded-[9px] transition-colors ${tab === "dm" ? "bg-white shadow-sm text-[#1C1C1E]" : "text-[#8E8E93]"}`}>
            Direct Message
          </button>
          <button onClick={() => setTab("group")} className={`flex-1 text-[13px] font-medium py-1.5 rounded-[9px] transition-colors ${tab === "group" ? "bg-white shadow-sm text-[#1C1C1E]" : "text-[#8E8E93]"}`}>
            Group Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-4">
          {tab === "dm" ? (
            <>
              <UserSearchInput onSelect={setSelectedUser} label="Search by username..." />
              {selectedUser && (
                <div className="flex items-center gap-3 p-3 bg-[#F2F2F7] rounded-[14px]">
                  <UserAvatar user={selectedUser} size="md" />
                  <div>
                    <div className="font-semibold text-[#1C1C1E] text-[15px]">{selectedUser.displayName || selectedUser.username}</div>
                    {selectedUser.displayName && <div className="text-xs text-[#8E8E93]">@{selectedUser.username}</div>}
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="ml-auto p-1 rounded-full hover:bg-[#E5E5EA] text-[#8E8E93]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <Button onClick={createDm} disabled={!selectedUser || loading}
                className="w-full rounded-full bg-[#007AFF] hover:bg-[#007AFF] text-white font-semibold">
                {loading ? "Starting..." : "Start Conversation"}
              </Button>
            </>
          ) : (
            <>
              <input value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="Group chat name..."
                className="w-full px-4 py-2.5 bg-[#F2F2F7] rounded-[14px] text-sm outline-none text-[#1C1C1E] placeholder-[#8E8E93]" />
              <UserSearchInput
                onSelect={u => setGroupMembers(prev => prev.find(m => m.id === u.id) ? prev : [...prev, u])}
                excluded={groupMembers.map(m => m.id)} label="Add members..." />
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {groupMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-[#F2F2F7] rounded-full px-3 py-1 text-[13px] text-[#1C1C1E]">
                      {m.displayName || m.username}
                      <button onClick={() => setGroupMembers(prev => prev.filter(x => x.id !== m.id))} className="text-[#8E8E93] hover:text-[#3C3C43]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0 || loading}
                className="w-full rounded-full bg-[#007AFF] hover:bg-[#007AFF] text-white font-semibold">
                {loading ? "Creating..." : `Create Group${groupMembers.length > 0 ? ` (${groupMembers.length + 1})` : ""}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ConversationThread ───────────────────────────────────────────────────────

function ConversationThread({ conv, currentUser, onBack, readOnly }: {
  conv: Conversation & { messages?: Message[] };
  currentUser: UserMeta | null;
  onBack: () => void;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(conv.messages || []);
  const [loading, setLoading] = useState(!conv.messages);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    if (!conv.messages) {
      setLoading(true);
      fetch(`/api/conversations/${conv.id}/messages`, { credentials: "include" })
        .then(r => r.json())
        .then((data: Message[]) => { setMessages(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [conv.id]);

  useEffect(() => {
    scrollToBottom("instant");
  }, [conv.id, loading]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  // SSE for real-time messages
  useEffect(() => {
    if (readOnly) return;
    if (!currentUser) return;
    const es = new EventSource("/api/messages/sse");
    es.addEventListener("message", e => {
      const msg = JSON.parse(e.data) as Message;
      if (msg.conversationId !== conv.id) return;
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
    es.addEventListener("message_edited", e => {
      const { messageId, content, editedAt, originalContent } = JSON.parse(e.data);
      if (messageId) setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content, editedAt, originalContent } : m
      ));
    });
    es.addEventListener("message_deleted", e => {
      const { messageId } = JSON.parse(e.data);
      if (messageId) setMessages(prev => prev.filter(m => m.id !== messageId));
    });
    es.addEventListener("reaction_added", e => {
      const reaction = JSON.parse(e.data) as MessageReaction;
      setMessages(prev => prev.map(m =>
        m.id === reaction.messageId ? { ...m, reactions: [...m.reactions.filter(r => !(r.userId === reaction.userId && r.emoji === reaction.emoji)), reaction] } : m
      ));
    });
    es.addEventListener("reaction_removed", e => {
      const { messageId, userId, emoji } = JSON.parse(e.data);
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: m.reactions.filter(r => !(r.userId === userId && r.emoji === emoji)) } : m
      ));
    });
    return () => es.close();
  }, [conv.id, currentUser?.id, readOnly]);

  const handleSend = async (content: string, imageUrl?: string | null) => {
    if (!currentUser) return;
    try {
      const res = await apiRequest("POST", `/api/conversations/${conv.id}/messages`, {
        content, imageUrl: imageUrl || null, replyToId: replyTo?.id || null,
      });
      const msg: Message = await res.json();
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      setReplyTo(null);
    } catch { toast({ title: "Failed to send", variant: "destructive" }); }
  };

  const handleEdit = async (msg: Message) => {
    try {
      await apiRequest("PATCH", `/api/conversations/${conv.id}/messages/${msg.id}`, { content: msg.content });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content, editedAt: new Date().toISOString() } : m));
    } catch { toast({ title: "Failed to edit", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/conversations/${conv.id}/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await apiRequest("POST", `/api/conversations/${conv.id}/messages/${msgId}/react`, { emoji });
    } catch {}
  };

  const handleAddMember = async (user: UserMeta) => {
    try {
      await apiRequest("POST", `/api/conversations/${conv.id}/members`, { userId: user.id });
      setAddingMember(false);
      toast({ title: `Added ${user.displayName || user.username}` });
    } catch { toast({ title: "Failed to add member", variant: "destructive" }); }
  };

  const isEveryoneConv = conv.type === "everyone";
  const isDm = conv.type === "dm";
  const other = isDm ? conv.members?.find(m => m.id !== currentUser?.id) : null;
  const headerTitle = conv.displayName || conv.name || "Conversation";
  const memberCount = conv.members?.length || 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header — iOS style */}
      <div className="flex flex-col items-center px-4 pt-3 pb-2 border-b border-[#E5E5EA] bg-white relative">
        <button onClick={onBack}
          className="absolute left-2 top-3 p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#007AFF] md:hidden">
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Center avatar + name */}
        <div className="flex flex-col items-center gap-1">
          {isEveryoneConv ? (
            <div className="h-12 w-12 rounded-full bg-[#007AFF] flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          ) : isDm && other ? (
            <Avatar className="h-12 w-12">
              {other.avatarUrl && <AvatarImage src={other.avatarUrl} />}
              <AvatarFallback className="bg-[#E5E5EA] text-[#3C3C43] font-semibold">{initials(other)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-12 w-12 rounded-full bg-[#34C759] flex items-center justify-center">
              <span className="text-white font-bold">{headerTitle.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="text-center">
            <h2 className="text-[13px] font-semibold text-[#1C1C1E]">{headerTitle}</h2>
            <p className="text-[11px] text-[#8E8E93]">
              {isEveryoneConv ? `${memberCount} members` : isDm ? (other?.username ? `@${other.username}` : "Direct Message") : `${memberCount} members`}
            </p>
          </div>
        </div>

        {/* Info button */}
        {!isDm && (
          <button onClick={() => setShowInfo(v => !v)}
            className={`absolute right-3 top-3 p-1.5 rounded-full transition-colors ${showInfo ? "bg-[#007AFF]/10 text-[#007AFF]" : "hover:bg-[#F2F2F7] text-[#8E8E93]"}`}>
            <Info className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Group info panel */}
      {showInfo && !isDm && (
        <div className="border-b border-[#E5E5EA] bg-[#F2F2F7] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Members ({memberCount})</span>
            {!isEveryoneConv && currentUser && (
              <button onClick={() => setAddingMember(v => !v)}
                className="flex items-center gap-1 text-[12px] text-[#007AFF] font-medium">
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
              <div key={m.id} className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 text-[12px] text-[#1C1C1E]">
                <Avatar className="h-5 w-5">
                  {m.avatarUrl && <AvatarImage src={m.avatarUrl} />}
                  <AvatarFallback className="text-[9px] bg-[#E5E5EA] text-[#3C3C43]">{initials(m)}</AvatarFallback>
                </Avatar>
                {m.displayName || m.username}
                {m.id === currentUser?.id && <span className="text-[#8E8E93]">(you)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col justify-end min-h-full px-3 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-[#8E8E93] text-sm">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="h-16 w-16 rounded-full bg-[#F2F2F7] flex items-center justify-center">
                <MessageSquarePlus className="h-8 w-8 text-[#C7C7CC]" />
              </div>
              <p className="text-[#8E8E93] text-sm">No messages yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {messages.map((msg, i) => {
                const first = isGroupBreak(messages, i) || msg.isSystem;
                const last = isNextGroupBreak(messages, i) || msg.isSystem;
                return (
                  <div key={msg.id}>
                    {shouldShowDateSeparator(messages, i) && (
                      <div className="flex items-center gap-2 my-4">
                        <div className="flex-1 h-px bg-[#E5E5EA]" />
                        <span className="text-[11px] text-[#8E8E93] font-medium">{formatDateSeparator(msg.createdAt)}</span>
                        <div className="flex-1 h-px bg-[#E5E5EA]" />
                      </div>
                    )}
                    {first && !msg.isSystem && i > 0 && <div className="h-2" />}
                    <MessageBubble
                      msg={msg}
                      isMine={msg.userId === currentUser?.id}
                      allMessages={messages}
                      currentUserId={currentUser?.id}
                      onReply={setReplyTo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReact={handleReact}
                      isFirst={first}
                      isLast={last}
                      readOnly={readOnly}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input or read-only banner */}
      {readOnly ? (
        <div className="border-t border-[#E5E5EA] bg-[#F2F2F7] px-4 py-3 flex items-center gap-3">
          <Lock className="h-4 w-4 text-[#8E8E93] flex-shrink-0" />
          <p className="text-[13px] text-[#8E8E93] flex-1">Sign in to join the conversation</p>
          <button
            onClick={() => { /* will be handled by parent */ document.dispatchEvent(new CustomEvent("schooly:openauth")); }}
            className="text-[13px] font-semibold text-[#007AFF]"
          >
            Sign In
          </button>
        </div>
      ) : (
        <MessageInput
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabled={!currentUser}
        />
      )}
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
  const [guestConv, setGuestConv] = useState<(Conversation & { messages: Message[] }) | null>(null);
  const { toast } = useToast();

  // Listen for sign-in events from the read-only banner
  useEffect(() => {
    const h = () => setShowAuthModal(true);
    document.addEventListener("schooly:openauth", h);
    return () => document.removeEventListener("schooly:openauth", h);
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) {
      // Guest: fetch the public everyone conversation
      try {
        const res = await fetch("/api/conversations/everyone-public");
        if (res.ok) {
          const data = await res.json();
          const conv: Conversation & { messages: Message[] } = {
            id: data.id,
            name: data.name || "Everyone",
            type: "everyone",
            members: [],
            messages: data.messages || [],
            createdAt: new Date().toISOString(),
          };
          setGuestConv(conv);
          setActiveConvId(data.id);
        }
      } catch {}
      setConvLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
        if (!activeConvId && data.length > 0) {
          setActiveConvId(data[0].id);
        }
      }
    } catch {} finally { setConvLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // SSE for logged-in users
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

  const activeConv = user
    ? (conversations.find(c => c.id === activeConvId) || null)
    : guestConv;

  const handleConvCreated = (conv: Conversation) => {
    setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
    setActiveConvId(conv.id);
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col border-r border-[#E5E5EA] bg-white flex-shrink-0 w-full md:w-72 xl:w-80`}>
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#E5E5EA]">
          <a href="/"
            className="flex items-center gap-1 text-[12px] text-[#007AFF] mb-3 w-fit">
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>School-y</span>
          </a>
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-[#1C1C1E]">School-y Text</h1>
            {user ? (
              <button onClick={() => setShowNewModal(true)}
                className="p-2 rounded-full hover:bg-[#F2F2F7] text-[#007AFF] transition-colors"
                data-testid="button-new-message">
                <MessageSquarePlus className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[13px] font-semibold text-[#007AFF]"
                data-testid="button-signin-sidebar"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {convLoading ? (
            <div className="flex flex-col gap-2 p-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-[#F2F2F7] rounded-[14px] animate-pulse" />)}
            </div>
          ) : !user && guestConv ? (
            // Guest view — just the Everyone conversation
            <ConversationItem
              conv={{ ...guestConv, lastMessage: guestConv.messages[guestConv.messages.length - 1] || null }}
              isActive={true}
              currentUserId={undefined}
              onClick={() => {}}
            />
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4 gap-2">
              <p className="text-[#8E8E93] text-sm">No conversations yet</p>
              <button onClick={() => setShowNewModal(true)} className="text-[#007AFF] text-sm font-medium">
                Start one
              </button>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                currentUserId={user?.id}
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
            readOnly={!user}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-20 w-20 rounded-full bg-[#F2F2F7] flex items-center justify-center">
              <MessageSquarePlus className="h-10 w-10 text-[#C7C7CC]" />
            </div>
            <h3 className="text-[17px] font-semibold text-[#1C1C1E]">Select a conversation</h3>
            <p className="text-[#8E8E93] text-sm">Choose from your conversations or start a new one</p>
            {user && (
              <Button variant="outline" onClick={() => setShowNewModal(true)} className="rounded-full mt-1">
                <Plus className="h-4 w-4 mr-1" /> New Message
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewModal && user && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleConvCreated}
        />
      )}
      {showAuthModal && (
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />
      )}
    </div>
  );
}
