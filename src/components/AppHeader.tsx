import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut, Settings, List, Calendar, Sun, Moon, StickyNote, Sparkles,
  Menu, X, MessageSquare, Smartphone, ClipboardList,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import FeedbackDialog from "@/components/FeedbackDialog";
import IOSWaitlistDialog from "@/components/IOSWaitlistDialog";
import goodgoodsLogo from "@/assets/goodgoods-logo-new.png";
import { cn } from "@/lib/utils";
import GlobalSearch from "@/components/GlobalSearch";

const mainNav = [
  { path: "/listen", icon: List, label: "Listen" },
  { path: "/notizen", icon: StickyNote, label: "Notizen" },
  { path: "/kalender", icon: Calendar, label: "Kalender" },
  { path: "/inspiration", icon: Sparkles, label: "Inspiration" },
];

const AppHeader = () => {
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [vorname, setVorname] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="border-b bg-card text-card-foreground">
      <div className="container flex items-center justify-between py-3">
        {/* Left: Logo */}
        <Link to={user ? "/listen" : "/"} className="flex items-center">
          <img src={goodgoodsLogo} alt="GoodGoods Logo" className="h-6 w-auto" />
        </Link>

        {/* Center: Desktop nav */}
        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {mainNav.map(({ path, icon: Icon, label }) => (
              <Button
                key={path}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "whitespace-nowrap text-xs px-3",
                  isActive(path) && "bg-accent text-accent-foreground font-semibold"
                )}
              >
                <Link to={path}>
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const next = resolvedTheme === "dark" ? "light" : resolvedTheme === "light" ? "dark" : "light";
              setTheme(next);
            }}
            onDoubleClick={() => setTheme("system")}
            aria-label="Dark Mode umschalten (Doppelklick für System)"
            title={`Theme: ${resolvedTheme === "dark" ? "Dunkel" : "Hell"} (Doppelklick: System)`}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>

          {user && (
            <>
              {/* Desktop: Settings + Avatar */}
              <Link to="/einstellungen" className="hidden md:inline-flex">
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Einstellungen">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/einstellungen" className="hidden md:inline-flex">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                  <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                </Avatar>
              </Link>

              {/* Mobile: Hamburger Menu */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" aria-label="Menü öffnen">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="p-4 pb-2 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                        <AvatarFallback className="text-sm bg-muted">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <SheetTitle className="text-sm font-semibold">{vorname || "Mein Konto"}</SheetTitle>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="flex flex-col py-2">
                    <Link
                      to="/einstellungen"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors",
                        isActive("/einstellungen") && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      Einstellungen
                    </Link>
                    <Link
                      to="/umfrage"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors",
                        isActive("/umfrage") && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Umfrage
                    </Link>

                    <div className="border-t my-1" />

                    <div className="px-4 py-2">
                      <FeedbackDialog />
                    </div>
                    <div className="px-4 py-2">
                      <IOSWaitlistDialog />
                    </div>

                    <div className="border-t my-1" />

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Abmelden
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
