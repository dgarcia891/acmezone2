import { Link } from "react-router-dom";
import { Github, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-background" role="contentinfo">
      <div className="container mx-auto py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="font-display font-semibold">Acme Zone</div>
            <p className="mt-2 text-sm text-muted-foreground">Custom software products and tools.</p>
          </div>
          <div>
            <h2 className="text-sm font-medium">Quick Links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/products" className="text-muted-foreground hover:text-foreground story-link">Products</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground story-link">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-medium">Legal</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground story-link">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-foreground story-link">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-medium">Follow Us</h2>
            <div className="mt-3 flex gap-3">
              <a href="https://x.com/acmezone" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://github.com/acmezone" target="_blank" rel="noopener noreferrer" aria-label="View our GitHub" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 text-xs text-muted-foreground">© {new Date().getFullYear()} Acme Zone. All rights reserved.</div>
      </div>
    </footer>
  );
};

export default Footer;
