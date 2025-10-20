import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Crown, User, LogOut, QrCode as QrCodeIcon, Check, Users } from "lucide-react";
import QRCode from "qrcode";

type Guest = {
  id: string;
  name: string;
  guest_type: "vip" | "regular";
  checked_in: boolean;
  checked_in_at: string | null;
  qr_code: string;
};

const GuestList = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [qrCodeData, setQrCodeData] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    guest_type: "regular" as "vip" | "regular",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchGuests();
    fetchUserRole();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is approved
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("approved")
      .eq("user_id", session.user.id)
      .single();

    if (roleData && !roleData.approved) {
      navigate("/approval-pending");
    }
  };

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setUserRole(data.role);
      }
    }
  };

  const fetchGuests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch guests",
        variant: "destructive",
      });
    } else {
      setGuests(data || []);
    }
    setLoading(false);
  };

  const handleAddGuest = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    const qrCode = `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { error } = await supabase.from("guests").insert({
      ...formData,
      qr_code: qrCode,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Guest added successfully",
      });
      setDialogOpen(false);
      setFormData({ name: "", guest_type: "regular" });
      fetchGuests();
    }
  };

  const handleDeleteGuest = async (id: string) => {
    const { error } = await supabase.from("guests").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete guest",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Guest deleted successfully",
      });
      fetchGuests();
    }
  };

  const handleManualCheckIn = async (guest: Guest) => {
    if (guest.checked_in) {
      toast({
        title: "Already Checked In",
        description: `${guest.name} is already checked in`,
      });
      return;
    }

    const { error } = await supabase
      .from("guests")
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", guest.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to check in guest",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: `${guest.name} checked in successfully`,
      });
      fetchGuests();
    }
  };

  const handleShowQR = async (guest: Guest) => {
    setSelectedGuest(guest);
    const qrDataUrl = await QRCode.toDataURL(guest.qr_code, {
      width: 400,
      margin: 2,
      color: {
        dark: guest.guest_type === "vip" ? "#f59e0b" : "#8b5cf6",
        light: "#ffffff",
      },
    });
    setQrCodeData(qrDataUrl);
    setQrDialogOpen(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const vipGuests = guests.filter((g) => g.guest_type === "vip");
  const regularGuests = guests.filter((g) => g.guest_type === "regular");

  const GuestCard = ({ guest }: { guest: Guest }) => (
    <Card className={`${guest.guest_type === "vip" ? "border-vip/30 bg-vip/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${guest.guest_type === "vip" ? "bg-gradient-to-br from-vip to-amber-400" : "bg-primary"}`} style={guest.guest_type === "vip" ? { boxShadow: 'var(--shadow-vip-glow)' } : {}}>
              {guest.guest_type === "vip" ? (
                <Crown className="w-5 h-5 text-vip-foreground" />
              ) : (
                <User className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground">{guest.name}</h3>
                <Badge variant={guest.guest_type === "vip" ? "default" : "secondary"} className={guest.guest_type === "vip" ? "bg-vip text-vip-foreground" : ""}>
                  {guest.guest_type.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${guest.checked_in ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  {guest.checked_in ? "✓ Checked In" : "Not Checked In"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!guest.checked_in && (
              <Button
                size="sm"
                variant="default"
                onClick={() => handleManualCheckIn(guest)}
                className="bg-green-600 hover:bg-green-700"
                title="Check in guest"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleShowQR(guest)}
            >
              <QrCodeIcon className="w-4 h-4" />
            </Button>
            {userRole === 'admin' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteGuest(guest.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-vip/5">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold mb-2">Guest Management</h1>
              {userRole && (
                <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                  {userRole.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Manage your event guest list</p>
          </div>
          <div className="flex gap-2">
            {userRole === 'admin' && (
              <Button onClick={() => navigate("/user-management")} variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
            )}
            <Button onClick={() => navigate("/check-in")} variant="outline">
              <QrCodeIcon className="w-4 h-4 mr-2" />
              Check-In
            </Button>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {userRole === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mb-6">
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Guest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Guest Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter guest name"
                />
              </div>
              <div>
                <Label htmlFor="guest_type">Guest Type</Label>
                <Select
                  value={formData.guest_type}
                  onValueChange={(value: "vip" | "regular") => setFormData({ ...formData, guest_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddGuest}>Add Guest</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedGuest?.name}'s QR Code</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              {qrCodeData && (
                <img src={qrCodeData} alt="QR Code" className="rounded-lg" />
              )}
              <p className="text-sm text-muted-foreground text-center">
                Scan this code at check-in
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({guests.length})</TabsTrigger>
              <TabsTrigger value="vip">
                <Crown className="w-4 h-4 mr-2" />
                VIP ({vipGuests.length})
              </TabsTrigger>
              <TabsTrigger value="regular">Regular ({regularGuests.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4 mt-6">
              {guests.map((guest) => (
                <GuestCard key={guest.id} guest={guest} />
              ))}
              {guests.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No guests added yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="vip" className="space-y-4 mt-6">
              {vipGuests.map((guest) => (
                <GuestCard key={guest.id} guest={guest} />
              ))}
              {vipGuests.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No VIP guests added yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="regular" className="space-y-4 mt-6">
              {regularGuests.map((guest) => (
                <GuestCard key={guest.id} guest={guest} />
              ))}
              {regularGuests.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No regular guests added yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default GuestList;
