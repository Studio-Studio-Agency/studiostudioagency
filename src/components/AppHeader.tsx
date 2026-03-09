import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, List, Calendar, MessageSquare, Smartphone } from "lucide-react";
import FeedbackDialog from "@/components/FeedbackDialog";
import IOSWaitlistDialog from "@/components/IOSWaitlistDialog";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";

const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b bg-card">
      <div className="container flex min-h-14 flex-wrap items-center justify-between gap-y-2 py-2">
        <Link to={user ? "/listen" : "/"} className="flex items-center gap-2">
          <img src={goodgoodsLogo} alt="GoodGoods Logo" className="h-7 w-auto" />
        </Link>
        {user && (
          <nav className="flex items-center gap-2">
            <Link to="/listen">
              <Button variant="ghost" size="sm">
                <List className="h-4 w-4 mr-1" /> Listen
              </Button>
            </Link>
            <Link to="/kalender">
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4" />
              </Button>
            </Link>
            <FeedbackDialog />
            <IOSWaitlistDialog />
            <Link to="/umfrage">
              <Button variant="ghost" size="sm">
                Umfrage
              </Button>
            </Link>
            <Link to="/einstellungen">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
