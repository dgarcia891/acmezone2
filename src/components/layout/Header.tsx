import { Link, NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight">
          Acme Zone
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink to="/" className={({ isActive }) => isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>Home</NavLink>
          <NavLink to="/products" className={({ isActive }) => isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>Products</NavLink>
          <NavLink to="/contact" className={({ isActive }) => isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>Contact</NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
