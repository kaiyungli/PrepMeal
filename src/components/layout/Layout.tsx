import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const colors = {
  cream: '#F8F3E8',
};

export default function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
      <Header showNav={showNav} />
      {children}
      <Footer />
    </div>
  );
}
