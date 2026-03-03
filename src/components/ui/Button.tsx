interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}

const colors = {
  brown: '#264653',
  yellow: '#E76F51',
};

export default function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  onClick, 
  disabled = false,
  type = 'button',
  style = {}
}: ButtonProps) {
  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '13px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '16px' }
  };

  const variantStyles = {
    primary: { background: colors.yellow, color: 'white', border: 'none' },
    secondary: { background: 'transparent', color: colors.brown, border: `1px solid ${colors.brown}` },
    danger: { background: '#dc3545', color: 'white', border: 'none' }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        borderRadius: '8px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style
      }}
    >
      {children}
    </button>
  );
}
