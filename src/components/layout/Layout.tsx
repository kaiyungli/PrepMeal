import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg font-sans">
      <Header showNav={showNav} />
      {children}
      <Footer />
    </div>
  );
}
