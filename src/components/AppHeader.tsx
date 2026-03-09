import { Link } from "react-router-dom";
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

const AppHeader = () => {
  const { user, signOut } = useAuth();
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

  return (
    <header className="border-b bg-card">
      <div className="container flex items-center justify-between py-2">
        <Link to={user ? "/listen" : "/"} className="flex items-center">
          <img src={goodgoodsLogo} alt="GoodGoods Logo" className="h-8 w-auto" />
        </Link>
        {user && (
          <Link to="/einstellungen">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
              <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
      {user && (
        <nav className="border-t overflow-x-auto">
          <div className="container flex items-center justify-center gap-1 py-1">
            <Link to="/listen">
              <Button variant="ghost" size="sm" className="whitespace-nowrap text-xs px-2">
                <List className="h-4 w-4 mr-1" /> Listen
              </Button>
            </Link>
            <Link to="/kalender">
              <Button variant="ghost" size="sm" className="whitespace-nowrap text-xs px-2">
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
