import { Link, useLocation } from "react-router-dom";
import { List, StickyNote, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { path: "/listen", icon: List, label: "Listen" },
  { path: "/notizen", icon: StickyNote, label: "Notizen" },
  { path: "/kalender", icon: Calendar, label: "Kalender" },
  { path: "/inspiration", icon: Sparkles, label: "Inspiration" },
];

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 px-2">
        {tabs.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground transition-colors",
              isActive(path) && "text-primary"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
