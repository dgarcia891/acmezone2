import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { LogOut, User, Shield, LayoutGrid, Youtube, Briefcase, Menu, X } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link";

  const NavItems = () => (
    <>
      <NavLink to="/" className={navLinkClass} onClick={closeMobile}>Home</NavLink>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors outline-none">
            <LayoutGrid className="h-4 w-4" />
            My Apps
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Product Dashboards</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { navigate('/insightreel/dashboard'); closeMobile(); }}>
              <Youtube className="mr-2 h-4 w-4 text-destructive" />
              InsightReel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { navigate('/dashboard'); closeMobile(); }}>
              <Briefcase className="mr-2 h-4 w-4 text-primary" />
              Pre-Apply AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <NavLink to="/products" className={navLinkClass} onClick={closeMobile}>Products</NavLink>
      <NavLink to="/contact" className={navLinkClass} onClick={closeMobile}>Contact</NavLink>

      {!loading && (
        <>
          {user ? (
            <>
              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass} onClick={closeMobile}>
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Admin
                  </span>
                </NavLink>
              )}
              <NavLink to="/dashboard" className={navLinkClass} onClick={closeMobile}>
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Dashboard
                </span>
              </NavLink>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth" onClick={closeMobile}>
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="banner">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-xl tracking-tight text-gradient-primary" aria-label="Acme Zone — Home">
          Acme Zone
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 text-sm">
          <NavItems />
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="md:hidden border-t bg-background px-4 pb-4 pt-2"
        >
          <div className="flex flex-col gap-3 text-sm">
            <NavItems />
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
