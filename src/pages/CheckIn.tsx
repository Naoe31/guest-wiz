import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, Crown, User, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

type Guest = {
  id: string;
  name: string;
  email: string | null;
  guest_type: "vip" | "regular";
  checked_in: boolean;
};

const CheckIn = () => {
  const [scanning, setScanning] = useState(false);
  const [checkedInGuest, setCheckedInGuest] = useState<Guest | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setCheckedInGuest(null);

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await html5QrCode.stop();
          await handleCheckIn(decodedText);
        },
        (errorMessage) => {
          // Silent error handling for continuous scanning
        }
      );
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to start camera. Please check permissions.",
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  const handleCheckIn = async (qrCode: string) => {
    try {
      const { data: guest, error: fetchError } = await supabase
        .from("guests")
        .select("*")
        .eq("qr_code", qrCode)
        .single();

      if (fetchError || !guest) {
        toast({
          title: "Error",
          description: "Guest not found",
          variant: "destructive",
        });
        setScanning(false);
        return;
      }

      if (guest.checked_in) {
        toast({
          title: "Already Checked In",
          description: `${guest.name} has already been checked in`,
        });
        setCheckedInGuest(guest);
        setScanning(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("guests")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", guest.id);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to check in guest",
          variant: "destructive",
        });
      } else {
        setCheckedInGuest({ ...guest, checked_in: true });
        toast({
          title: "Success!",
          description: `${guest.name} checked in successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during check-in",
        variant: "destructive",
      });
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-vip/5">
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guest List
          </Button>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold">QR Check-In</CardTitle>
            <p className="text-muted-foreground">Scan guest QR codes to check them in</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!scanning && !checkedInGuest && (
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center" style={{ boxShadow: 'var(--shadow-glow)' }}>
                  <CheckCircle className="w-16 h-16 text-primary-foreground" />
                </div>
                <Button size="lg" onClick={startScanner} className="w-full max-w-xs">
                  Start Scanning
                </Button>
              </div>
            )}

            {scanning && (
              <div className="space-y-4">
                <div
                  id="qr-reader"
                  className="rounded-lg overflow-hidden border-2 border-primary"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const html5QrCode = new Html5Qrcode("qr-reader");
                    html5QrCode.stop();
                    setScanning(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {checkedInGuest && (
              <div className="space-y-6 py-4">
                <div className={`p-8 rounded-2xl text-center ${checkedInGuest.guest_type === "vip" ? "bg-gradient-to-br from-vip/10 to-amber-400/10 border-2 border-vip/30" : "bg-primary/10 border-2 border-primary/30"}`}>
                  <div className="flex justify-center mb-4">
                    <div className={`p-4 rounded-2xl ${checkedInGuest.guest_type === "vip" ? "bg-gradient-to-br from-vip to-amber-400" : "bg-primary"}`} style={checkedInGuest.guest_type === "vip" ? { boxShadow: 'var(--shadow-vip-glow)' } : {}}>
                      {checkedInGuest.guest_type === "vip" ? (
                        <Crown className="w-12 h-12 text-vip-foreground" />
                      ) : (
                        <User className="w-12 h-12 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{checkedInGuest.name}</h3>
                  {checkedInGuest.email && (
                    <p className="text-muted-foreground mb-4">{checkedInGuest.email}</p>
                  )}
                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${checkedInGuest.guest_type === "vip" ? "bg-vip text-vip-foreground" : "bg-primary text-primary-foreground"}`}>
                    {checkedInGuest.guest_type === "vip" ? "VIP Guest" : "Regular Guest"}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setCheckedInGuest(null);
                    startScanner();
                  }}
                >
                  Scan Next Guest
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckIn;
