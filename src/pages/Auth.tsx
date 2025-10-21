import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, Scan } from "lucide-react";
import { FaceCapture } from "@/components/FaceCapture";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceMode, setFaceMode] = useState<"register" | "verify">("verify");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const ADMIN_EMAIL = "naoe31.dev@proton.me";

  useEffect(() => {
    checkAuthAndApproval();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await checkAuthAndApproval();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndApproval = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data } = await supabase
        .from("user_roles")
        .select("approved, role")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        if (!data.approved) {
          navigate("/approval-pending");
        } else {
          navigate("/guest-list");
        }
      }
    }
  };

  const handleFaceCapture = async (imageData: string) => {
    if (!pendingUserId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-face', {
        body: { 
          capturedImage: imageData, 
          userId: pendingUserId,
          action: faceMode
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: faceMode === "register" ? "Face Registered!" : "Face Verified!",
          description: faceMode === "register" 
            ? "Your face has been registered successfully." 
            : "Face verification successful. Welcome back!",
        });
        setShowFaceCapture(false);
        if (faceMode === "verify") {
          await checkAuthAndApproval();
        }
      } else {
        toast({
          title: "Verification Failed",
          description: data?.message || "Face verification failed. Please try again.",
          variant: "destructive",
        });
        if (faceMode === "verify") {
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      console.error('Face verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Face verification failed",
        variant: "destructive",
      });
      if (faceMode === "verify") {
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Restrict to admin email only
    if (email !== ADMIN_EMAIL) {
      toast({
        title: "Access Denied",
        description: "Only the administrator can access this system.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Check if face is registered
        const { data: faceData } = await supabase
          .from('admin_face_auth')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        setPendingUserId(data.user.id);

        if (!faceData) {
          // First time login - register face
          setFaceMode("register");
          setShowFaceCapture(true);
          toast({
            title: "Face Registration Required",
            description: "Please register your face for secure authentication.",
          });
        } else {
          // Face already registered - verify
          setFaceMode("verify");
          setShowFaceCapture(true);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Please sign in to register your face authentication.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showFaceCapture) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-vip/5">
        <Card className="w-full max-w-2xl shadow-xl border-border/50">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-2" style={{ boxShadow: 'var(--shadow-glow)' }}>
              <Scan className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Face Authentication</CardTitle>
            <CardDescription>
              {faceMode === "register" 
                ? "Register your face for secure biometric authentication"
                : "Verify your identity using facial recognition"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FaceCapture 
              onCapture={handleFaceCapture} 
              onCancel={() => {
                setShowFaceCapture(false);
                supabase.auth.signOut();
              }}
              mode={faceMode}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-vip/5">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-2" style={{ boxShadow: 'var(--shadow-glow)' }}>
            <QrCode className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Guest Check-In System</CardTitle>
          <CardDescription>
            {isLogin ? "Administrator access with facial recognition" : "Create administrator account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="naoe31.dev@proton.me"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only {ADMIN_EMAIL} can access this system
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
