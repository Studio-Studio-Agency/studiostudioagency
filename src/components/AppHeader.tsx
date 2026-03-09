import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, List, Calendar } from "lucide-react";
import FeedbackDialog from "@/components/FeedbackDialog";
import IOSWaitlistDialog from "@/components/IOSWaitlistDialog";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";

const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b bg-card">
      <div className="container flex items-center justify-center py-2">
        <Link to={user ? "/listen" : "/"} className="flex items-center">
          <img src={goodgoodsLogo} alt="GoodGoods Logo" className="h-8 w-auto" />
        </Link>
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
