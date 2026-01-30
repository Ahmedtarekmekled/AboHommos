import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          navigate("/login?error=auth_failed");
          return;
        }

        if (data.session) {
          // Successfully authenticated
          navigate("/");
        } else {
          navigate("/login");
        }
      } catch (err) {
        console.error("Callback error:", err);
        navigate("/login?error=callback_failed");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center"
      dir="rtl"
    >
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-lg text-muted-foreground">جاري تسجيل الدخول...</p>
      </div>
    </div>
  );
}
