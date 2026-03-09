import { Link } from "react-router-dom";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";

const AppFooter = () => {
  return (
    <footer className="border-t bg-card text-muted-foreground">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={goodgoodsLogo} alt="GoodGoods" className="h-4 w-auto opacity-60" />
          <span className="text-xs">© 2026 Studio Studio Agency</span>
        </div>
        <div className="flex gap-6 text-sm">
          <Link to="/impressum" className="hover:text-gray-900 transition-colors">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-gray-900 transition-colors">Datenschutz</Link>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;