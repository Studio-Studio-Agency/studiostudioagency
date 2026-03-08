import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, List, Calendar } from "lucide-react";

const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between">
        <Link to={user ? "/listen" : "/"} className="flex items-center gap-2 font-bold text-lg">
          🥬 <span>FreshFresh AI</span>
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
