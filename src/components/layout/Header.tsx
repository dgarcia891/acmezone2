import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { LogOut, User, Shield, LayoutGrid, Youtube, Briefcase, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="font-display text-xl tracking-tight text-gradient-primary">
          Acme Zone
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink to="/" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>Home</NavLink>

          {/* My Apps Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors outline-none">
                <LayoutGrid className="h-4 w-4" />
                My Apps
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Product Dashboards</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/insightreel/dashboard')}>
                  <Youtube className="mr-2 h-4 w-4 text-destructive" />
                  InsightReel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <Briefcase className="mr-2 h-4 w-4 text-primary" />
                  Pre-Apply AI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <NavLink to="/products" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>Products</NavLink>
          <NavLink to="/contact" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>Contact</NavLink>
          
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <>
                      <NavLink to="/admin" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>
                        <span className="flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          Admin
                        </span>
                      </NavLink>
                      <NavLink to="/pod-pipeline" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>
                        <span className="flex items-center gap-1">
                          <Palette className="h-4 w-4" />
                          POD
                        </span>
                      </NavLink>
                    </>
                  )}
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Dashboard
                    </span>
                  </NavLink>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button size="sm">Sign In</Button>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
