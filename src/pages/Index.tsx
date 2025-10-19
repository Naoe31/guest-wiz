import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { QrCode, Users, Crown } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-vip/5 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-vip rounded-3xl flex items-center justify-center" style={{ boxShadow: 'var(--shadow-glow)' }}>
              <QrCode className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Guest Check-In System</h1>
          <p className="text-xl text-muted-foreground">Manage your events with ease</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-primary/20 hover:border-primary/40 transition-all">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-vip to-amber-400">
                  <Crown className="w-5 h-5 text-vip-foreground" />
                </div>
                <CardTitle>For Administrators</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Manage guest lists</li>
                <li>• Add VIP and regular guests</li>
                <li>• Generate QR codes</li>
                <li>• Approve staff members</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-all">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <CardTitle>For Staff</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• View guest lists</li>
                <li>• Check in guests via QR scan</li>
                <li>• Manual check-in option</li>
                <li>• Real-time status updates</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-lg px-8"
              >
                Sign In
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth?mode=signup")}
                className="text-lg px-8"
              >
                Sign Up
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              First user becomes the admin. New users need admin approval.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
