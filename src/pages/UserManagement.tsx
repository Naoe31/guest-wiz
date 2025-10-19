import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Crown, User as UserIcon, Loader2 } from "lucide-react";

type User = {
  user_id: string;
  role: 'admin' | 'staff';
  approved: boolean;
  created_at: string;
  email?: string;
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role, approved")
      .eq("user_id", user.id)
      .single();

    if (!roleData?.approved) {
      navigate("/approval-pending");
      return;
    }

    if (roleData.role !== 'admin') {
      navigate("/guest-list");
      return;
    }

    setUserRole(roleData.role);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Get all user roles with auth data
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select(`
        *,
        email:user_id
      `)
      .order("created_at", { ascending: false });

    if (rolesError) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Since we can't access auth.users directly from client,
    // we'll show user_id as identifier
    const usersWithEmails: User[] = rolesData.map(role => ({
      ...role,
      email: role.user_id.substring(0, 8) + '...' // Show partial ID
    }));

    setUsers(usersWithEmails);
    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ approved: true })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User approved successfully",
      });
      fetchUsers();
    }
  };

  const handleReject = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ approved: false })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User access revoked",
      });
      fetchUsers();
    }
  };

  const pendingUsers = users.filter(u => !u.approved && u.role === 'staff');
  const approvedUsers = users.filter(u => u.approved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-vip/5">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/guest-list")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guest List
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">Approve and manage staff access</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {pendingUsers.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Pending Approval ({pendingUsers.length})
                </h2>
                <div className="space-y-3">
                  {pendingUsers.map((user) => (
                    <Card key={user.user_id} className="border-amber-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                              <UserIcon className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <p className="font-medium">{user.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Role: {user.role}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(user.user_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-4">
                Approved Users ({approvedUsers.length})
              </h2>
              <div className="space-y-3">
                {approvedUsers.map((user) => (
                  <Card key={user.user_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${user.role === 'admin' ? 'bg-gradient-to-br from-vip to-amber-400' : 'bg-primary'}`}>
                            {user.role === 'admin' ? (
                              <Crown className="w-5 h-5 text-vip-foreground" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-primary-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{user.email}</p>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Joined: {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(user.user_id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
