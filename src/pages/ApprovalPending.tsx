import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";

const ApprovalPending = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkApprovalStatus();
    
    // Check approval status every 5 seconds
    const interval = setInterval(checkApprovalStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkApprovalStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("approved, role")
      .eq("user_id", user.id)
      .single();

    if (data?.approved) {
      navigate("/guest-list");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-vip/5 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Approval Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Your account is waiting for admin approval.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the administrator to get access.
            </p>
          </div>
          <div className="pt-4 border-t">
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalPending;
