import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-semibold">Acme Zone</div>
            <p className="mt-2 text-sm text-muted-foreground">Custom software products and tools.</p>
          </div>
          <div>
            <div className="text-sm font-medium">Company</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="#" className="text-muted-foreground hover:text-foreground">About</Link></li>
              <li><Link to="#" className="text-muted-foreground hover:text-foreground">Careers</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium">Legal</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="#" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 text-xs text-muted-foreground">© {new Date().getFullYear()} Acme Zone. All rights reserved.</div>
      </div>
    </footer>
  );
};

export default Footer;
