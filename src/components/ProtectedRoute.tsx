import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }

    setCheckingOnboarding(true);
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Onboarding check error:", error);
          setOnboardingCompleted(null);
        } else {
          setOnboardingCompleted(data?.onboarding_completed ?? false);
        }
        setCheckingOnboarding(false);
      });
  }, [user?.id]);

  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Optional onboarding: if already completed, keep /willkommen out of the way.
  if (onboardingCompleted === true && location.pathname === "/willkommen") {
    return <Navigate to="/listen" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

