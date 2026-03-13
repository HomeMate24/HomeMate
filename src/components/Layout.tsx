import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

const Layout = ({ children, isAuthenticated = false }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
