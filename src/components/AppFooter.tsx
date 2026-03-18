import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import BlingLogo from "@/components/BlingLogo";

const AppFooter = () => {
  return (
    <footer className="border-t bg-card text-card-foreground theme-inverted">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BlingLogo size={20} iconOnly className="opacity-60" />
          <span className="text-xs">© 2026 Studio Studio Agency</span>
        </div>
        <div className="flex gap-6 text-sm">
          <Link to="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
