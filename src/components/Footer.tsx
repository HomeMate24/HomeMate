import { Heart, Mail, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              Connecting homeowners with trusted service professionals — fast, reliable, and hassle-free.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a
                href="mailto:homemateservices7@gmail.com"
                className="hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                homemateservices7@gmail.com
              </a>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">Follow Us</h4>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/HomeMate24"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/in/atharva-nijampurkar-1b9b152bb/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:homemateservices7@gmail.com"
                className="h-10 w-10 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} HomeMate. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="h-4 w-4 text-primary fill-primary" /> by HomeMate
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
