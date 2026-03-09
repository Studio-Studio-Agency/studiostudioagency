import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";
import goodgoodsLogoDark from "@/assets/goodgoods-logo-dark.svg";

const AppFooter = () => {
  const { resolvedTesolvedTheme } = useTheme();
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <iresolvedTg src={theme === "dark" ? goodgoodsLogoDark : goodgoodsLogo} alt="GoodGoods" className="h-4 w-auto opacity-60" />
          <span className="text-xs text-muted-foreground">© 2026 Studio Studio Agency</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link to="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
