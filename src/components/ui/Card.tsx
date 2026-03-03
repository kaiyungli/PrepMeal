interface CardProps {
  title: string;
  description?: string;
  image?: string;
  tags?: string[];
  children?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const colors = {
  brown: '#264653',
  yellow: '#E76F51',
  textLight: '#6b7280',
};

export default function Card({ 
  title, 
  description, 
  image, 
  tags, 
  children,
  onClick,
  style = {} 
}: CardProps) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        ...style
      }}
    >
      {image && (
        <div style={{ 
          height: '160px', 
          background: `url(${image})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }} />
      )}
      {!image && (
        <div style={{ 
          height: '160px', 
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '48px' }}>🍳</span>
        </div>
      )}
      <div style={{ padding: '16px' }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: colors.brown, 
          marginBottom: '8px' 
        }}>
          {title}
        </h3>
        {description && (
          <p style={{ 
            fontSize: '13px', 
            color: colors.textLight, 
            marginBottom: '12px' 
          }}>
            {description}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tags.map((tag, i) => (
              <span 
                key={i} 
                style={{ 
                  background: colors.yellow, 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '11px' 
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
