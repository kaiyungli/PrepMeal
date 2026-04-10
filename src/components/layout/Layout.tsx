import Header from './Header';
import Footer from './Footer';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const { isAuthenticated, loading, loggingOut, navLinks, isActiveRoute, handleLogout } = useHeaderController();

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Header 
        showNav={showNav}
        navLinks={navLinks}
        isAuthenticated={isAuthenticated}
        loading={loading}
        loggingOut={loggingOut}
        isActiveRoute={isActiveRoute}
        handleLogout={handleLogout}
      />
      {children}
      <Footer />
    </div>
  );
}
