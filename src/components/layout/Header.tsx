import { Link, NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="font-display text-xl tracking-tight text-gradient-primary">
          Acme Zone
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink to="/" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>Home</NavLink>
          <NavLink to="/products" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>Products</NavLink>
          <NavLink to="/contact" className={({ isActive }) => isActive ? "text-foreground story-link" : "text-muted-foreground hover:text-foreground story-link"}>Contact</NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
