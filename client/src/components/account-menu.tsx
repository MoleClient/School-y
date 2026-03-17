import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";

export function AccountMenu() {
  const { user, logout, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [, navigate] = useLocation();

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-sign-in"
          onClick={() => setShowAuth(true)}
          className="flex-shrink-0"
        >
          Sign in
        </Button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-account-menu"
          title={user.username}
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">
              {user.username[0]}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{user.username}</p>
          <p className="text-xs text-muted-foreground">Schooly account</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="menu-item-profile"
          onClick={() => navigate("/profile")}
          className="cursor-pointer"
        >
          <BarChart2 className="w-4 h-4 mr-2" />
          Profile &amp; activity
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
