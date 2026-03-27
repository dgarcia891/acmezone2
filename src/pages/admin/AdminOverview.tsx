import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Shield, Activity, Calendar, Mail, RefreshCw } from "lucide-react";

interface UserStats {
  totalUsers: number;
  recentSignups: number;
  adminCount: number;
  pendingReports: number;
}

interface UserInfo {
  id: string;
  email: string;
  created_at: string;
  role: string;
}

export default function AdminOverview() {
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats>({ 
    totalUsers: 0, 
    recentSignups: 0, 
    adminCount: 0,
    pendingReports: 0
  });
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [rolesResponse, reportsResponse] = await Promise.all([
        supabase
          .from("az_user_roles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("sa_user_reports" as any)
          .select("id", { count: "exact", head: true })
          .eq("review_status", "pending")
      ]);

      if (rolesResponse.error) throw rolesResponse.error;
      if (reportsResponse.error) throw reportsResponse.error;

      const roles = (rolesResponse.data as unknown as Array<{ id: string; user_id: string; role: string; created_at: string }>) || [];
      const totalUsers = roles.length;
      const adminCount = roles.filter((r) => r.role === "admin").length;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentSignups = roles.filter((r) => new Date(r.created_at) > weekAgo).length;

      setStats({ 
        totalUsers, 
        recentSignups, 
        adminCount,
        pendingReports: reportsResponse.count || 0
      });
      setUsers(
        roles.map((r) => ({
          id: r.user_id,
          email: "User ID: " + r.user_id.slice(0, 8) + "...",
          created_at: r.created_at,
          role: r.role,
        }))
      );
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({ title: "Error", description: "Failed to load admin data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Overview</h1>
          <p className="text-muted-foreground">Site overview and user management</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>
        <Card className="elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentSignups}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="elevated ring-2 ring-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Mail className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">Hydra Guard submissions</p>
          </CardContent>
        </Card>
        <Card className="elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.adminCount}</div>
            <p className="text-xs text-muted-foreground">Admin accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="elevated">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Registered Users</span>
          </CardTitle>
          <CardDescription>All users registered on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users registered yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((userInfo) => (
                <div key={userInfo.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{userInfo.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Joined {formatDate(userInfo.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={userInfo.role === "admin" ? "default" : "secondary"}>{userInfo.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
