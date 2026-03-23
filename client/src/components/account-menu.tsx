import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, BarChart2, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";

export function AccountMenu() {
  const { user, logout, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [, navigate] = useLocation();

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-sign-in"
          onClick={() => { setAuthMode("login"); setShowAuth(true); }}
          className="flex-shrink-0"
        >
          Sign in
        </Button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />
      </>
    );
  }

  const displayName = user.displayName || user.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-account-menu"
          title={displayName}
          className="rounded-full"
        >
          <Avatar className="w-7 h-7">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-[#4285F4] to-[#6B72CF] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2 flex items-center gap-2.5">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-[#4285F4] to-[#6B72CF] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="menu-item-profile"
          onClick={() => navigate("/profile")}
          className="cursor-pointer"
        >
          <BarChart2 className="w-4 h-4 mr-2" />
          Profile &amp; Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="menu-item-messages"
          onClick={() => navigate("/messages")}
          className="cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          School Messages
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="menu-item-logout"
          onClick={() => logout()}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
