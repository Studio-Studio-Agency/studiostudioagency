import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, List, Calendar, Sun, Moon } from "lucide-react";
import FeedbackDialog from "@/components/FeedbackDialog";
import IOSWaitlistDialog from "@/components/IOSWaitlistDialog";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";
import goodgoodsLogoDark from "@/assets/goodgoods-logo-dark.svg";

const AppHeader = () => {
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [vorname, setVorname] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url, vorname")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url ?? null);
          setVorname(data.vorname ?? "");
        }
      });
  }, [user]);

  const initials = vorname ? vorname.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() ?? "?";
  const invertedIsDark = resolvedTheme !== "dark";
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="border-b bg-card text-card-foreground theme-inverted">
      <div className="container flex items-center justify-between py-3">
        <Link to={user ? "/listen" : "/"} className="flex items-center">
          <img src={invertedIsDark ? goodgoodsLogoDark : goodgoodsLogo} alt="GoodGoods Logo" className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Dark Mode umschalten"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>
          {user && (
            <Link to="/einstellungen">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </div>
      {user && (
        <nav className="border-t overflow-x-auto">
          <div className="container flex items-center justify-center gap-1 py-1">
            <Link to="/listen">
              <Button variant="ghost" size="sm" className={`whitespace-nowrap text-xs px-2 ${isActive("/listen") ? "bg-accent text-accent-foreground font-semibold" : ""}`}>
                <List className="h-4 w-4 mr-1" /> Listen
              </Button>
            </Link>
            <Link to="/kalender">
              <Button variant="ghost" size="sm" className={`whitespace-nowrap text-xs px-2 ${isActive("/kalender") ? "bg-accent text-accent-foreground font-semibold" : ""}`}>
                <Calendar className="h-4 w-4 mr-1" /> Kalender
              </Button>
            </Link>
            <FeedbackDialog />
            <IOSWaitlistDialog />
            <Link to="/umfrage">
              <Button variant="ghost" size="sm" className="whitespace-nowrap text-xs px-2">
                Umfrage
              </Button>
            </Link>
            <Link to="/einstellungen">
              <Button variant="ghost" size="sm" className="whitespace-nowrap text-xs px-2">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="whitespace-nowrap text-xs px-2" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default AppHeader;