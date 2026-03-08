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
  useSidebar,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Dashboard",
    items: [
      { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Security",
    items: [
      { title: "Detections", url: "/admin/security/detections", icon: Eye },
      { title: "Corrections", url: "/admin/security/corrections", icon: MessageSquare },
      { title: "Patterns", url: "/admin/security/patterns", icon: Database },
      { title: "User Reports", url: "/admin/security/reports", icon: FileWarning },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "POD Pipeline", url: "/admin/pod-pipeline", icon: Palette },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url, item.end)}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
