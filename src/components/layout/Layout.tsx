import Header from './Header';
import Footer from './Footer';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  home?: boolean;
  className?: string;
}

export default function Layout({ children, showNav = true, home = false, className = '' }: LayoutProps) {
  const { isAuthenticated, loading, loggingOut, navLinks, guideLinks, accountLinks, trustLinks, isActiveRoute, handleLogout, onFavoritesIntent, onMyPlansIntent } = useHeaderController();

  return (
    <div className={`min-h-screen bg-bg font-sans ${className}`}>
      <Header
        home={home}
        showNav={showNav}
        navLinks={navLinks}
        guideLinks={guideLinks}
        accountLinks={accountLinks}
        trustLinks={trustLinks}
        isAuthenticated={isAuthenticated}
        loading={loading}
        loggingOut={loggingOut}
        isActiveRoute={isActiveRoute}
        handleLogout={handleLogout}
        onFavoritesIntent={onFavoritesIntent}
        onMyPlansIntent={onMyPlansIntent}
      />
      {children}
      <Footer compact={home} />
    </div>
  );
}
