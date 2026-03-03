const colors = {
  lightBg: '#faf8f5',
  textLight: '#6b7280',
};

export default function Footer() {
  return (
    <footer style={{ 
      textAlign: 'center', 
      padding: '40px', 
      color: colors.textLight, 
      borderTop: '1px solid #e5e5e5', 
      background: colors.lightBg 
    }}>
      <p>© 2026 今晚食乜 Made with ❤️</p>
    </footer>
  );
}
