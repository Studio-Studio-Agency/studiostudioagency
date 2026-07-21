/**
 * Standalone-Einstieg für den Klimapartner-Teil (ohne GoodGoods-App).
 * Build: `npm run build:klimapartner` → dist-klimapartner/, gedacht fürs
 * Hosting unter https://<domain>/klimapartner/ (siehe
 * docs/klimapartner-deployment.md).
 *
 * Die Routen sind identisch mit der Haupt-App (/klimapartner,
 * /klimapartner/leads), damit interne Links unverändert funktionieren.
 */
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import KlimapartnerPage from "./pages/KlimapartnerPage";
import KlimaLeadsPage from "./pages/KlimaLeadsPage";
import KlimaAuthGate from "./components/klima/KlimaAuthGate";
import "./index.css";

const queryClient = new QueryClient();

const KlimaApp = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/klimapartner" element={<KlimapartnerPage />} />
        <Route
          path="/klimapartner/leads"
          element={
            <KlimaAuthGate>
              <KlimaLeadsPage />
            </KlimaAuthGate>
          }
        />
        {/* alles andere (inkl. "/") auf die Chat-Seite */}
        <Route path="*" element={<Navigate to="/klimapartner" replace />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<KlimaApp />);
