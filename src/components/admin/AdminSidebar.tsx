import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  Eye,
  MessageSquare,
  Database,
  FileWarning,
  Palette,
  Settings,
  Shield,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('sa_user_reports' as any)
        .select('id', { count: 'exact', head: true })
        .eq('review_status', 'pending');
      setPendingCount(count || 0);
    };
    
    fetchPending();

    const channel = supabase
      .channel('sidebar-reports-check')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sa_user_reports' }, () => fetchPending())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const hydraGuardItems = [
    { title: "Detections", url: "/admin/security/detections", icon: Eye },
    { title: "Corrections", url: "/admin/security/corrections", icon: MessageSquare },
    { title: "Patterns", url: "/admin/security/patterns", icon: Database },
    { 
      title: "User Reports", 
      url: "/admin/security/reports", 
      icon: FileWarning,
      badge: pendingCount > 0 ? pendingCount : undefined
    },
  ];
  const isActive = (url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  const hydraGuardOpen = location.pathname.startsWith("/admin/security");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin", true)}>
                  <Link to="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Overview</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content */}
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/users")}>
                  <Link to="/admin/users"><Users className="h-4 w-4" />{!collapsed && <span>Users</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/products")}>
                  <Link to="/admin/products"><Package className="h-4 w-4" />{!collapsed && <span>Products</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/analytics")}>
                  <Link to="/admin/analytics"><BarChart3 className="h-4 w-4" />{!collapsed && <span>Analytics</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/pod-pipeline")}>
                  <Link to="/admin/pod-pipeline"><Palette className="h-4 w-4" />{!collapsed && <span>POD Pipeline</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen={hydraGuardOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={hydraGuardOpen}>
                      <Shield className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>Hydra Guard</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {hydraGuardItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span className="flex-1">{item.title}</span>
                              {item.badge && (
                                <Badge variant="destructive" className="ml-auto h-5 px-1.5 py-0 text-[10px] min-w-[1.25rem] flex items-center justify-center">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/settings")}>
                  <Link to="/admin/settings"><Settings className="h-4 w-4" />{!collapsed && <span>Settings</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
