import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Menu, X } from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";

interface HeaderProps {
  isAuthenticated?: boolean;
}

const Header = ({ isAuthenticated = false }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <Logo size="sm" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {isAuthenticated && (
            <Button
              variant="ghost"
              className="hover-invert gap-2"
              asChild
            >
              <Link to="/chat">
                <MessageCircle className="h-4 w-4" />
                Chat
              </Link>
            </Button>
          )}
          <ThemeToggle />
          {!isAuthenticated && location.pathname !== "/" && (
            <Button className="hover-invert" asChild>
              <Link to="/">Sign In</Link>
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hover-invert"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-effect border-b border-border animate-slide-up">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                className="hover-invert justify-start gap-2"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link to="/chat">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Link>
              </Button>
            )}
            {!isAuthenticated && location.pathname !== "/" && (
              <Button className="hover-invert" asChild>
                <Link to="/">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
