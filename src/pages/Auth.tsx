import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, Scan, UserCircle } from "lucide-react";
import { FaceCapture } from "@/components/FaceCapture";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthMode = "admin-login" | "admin-signup" | "staff-login" | "staff-signup";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("admin-login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceMode, setFaceMode] = useState<"register" | "verify">("verify");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndApproval();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if this is an admin user (has real email, not @staff.local)
        const isAdmin = session.user.email && !session.user.email.endsWith('@staff.local');
        
        if (isAdmin) {
          // For admin login via magic link, trigger face verification
          setPendingUserId(session.user.id);
          setFaceMode("verify");
          setShowFaceCapture(true);
        } else {
          // For staff, proceed with normal flow
          await checkAuthAndApproval();
        }
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
            ? "Your face has been registered. Awaiting admin approval." 
            : "Face verification successful!",
        });
        setShowFaceCapture(false);
        if (faceMode === "verify") {
          await checkAuthAndApproval();
        } else {
          // After registration, sign out and show success
          await supabase.auth.signOut();
          toast({
            title: "Registration Complete",
            description: "Please wait for admin approval before logging in.",
          });
        }
      } else {
        toast({
          title: "Verification Failed",
          description: data?.message || "Face verification failed. Please try again.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      console.error('Face verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Face verification failed",
        variant: "destructive",
      });
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For admin, use magic link (passwordless)
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) throw error;

      toast({
        title: "Check Your Email",
        description: "We sent you a login link. Click it to continue with face verification.",
      });
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

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create account with temporary password
      const tempPassword = Math.random().toString(36).slice(-12);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup failed");

      setPendingUserId(data.user.id);
      setFaceMode("register");
      setShowFaceCapture(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Staff uses username stored as email (username@staff.local)
      const staffEmail = `${username}@staff.local`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: staffEmail,
        password,
      });

      if (error) throw error;
      await checkAuthAndApproval();
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

  const handleStaffSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Staff uses username stored as email (username@staff.local)
      const staffEmail = `${username}@staff.local`;
      const { error } = await supabase.auth.signUp({
        email: staffEmail,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "Please wait for admin approval before logging in.",
      });
      setMode("staff-login");
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-2" style={{ boxShadow: 'var(--shadow-glow)' }}>
            <QrCode className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Guest Check-In System</CardTitle>
          <CardDescription>
            Secure access with role-based authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode.includes("admin") ? "admin" : "staff"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin" onClick={() => setMode("admin-login")}>
                <Scan className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="staff" onClick={() => setMode("staff-login")}>
                <UserCircle className="w-4 h-4 mr-2" />
                Staff
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 mt-4">
              {mode === "admin-login" ? (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Passwordless login with face verification
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Login Link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("admin-signup")}
                    disabled={loading}
                  >
                    Apply as Admin
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleAdminSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-email">Email</Label>
                    <Input
                      id="admin-signup-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue to Face Registration
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("admin-login")}
                    disabled={loading}
                  >
                    Back to Login
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="staff" className="space-y-4 mt-4">
              {mode === "staff-login" ? (
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-password">Password</Label>
                    <Input
                      id="staff-password"
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
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("staff-signup")}
                    disabled={loading}
                  >
                    Create Staff Account
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleStaffSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-username">Username</Label>
                    <Input
                      id="new-username"
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
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
                    Sign Up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("staff-login")}
                    disabled={loading}
                  >
                    Back to Login
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
