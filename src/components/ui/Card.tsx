interface CardProps {
  title: string;
  description?: string;
  image?: string;
  tags?: string[];
  children?: React.ReactNode;
  onClick?: () => void;
  favorite?: boolean;
  onFavorite?: () => void;
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
  favorite,
  onFavorite,
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
      <div style={{ 
        height: '160px', 
        background: image ? `url(${image})` : '#f5f5f5', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        {!image && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: '48px' }}>🍳</span>
          </div>
        )}
        {onFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            <span style={{ fontSize: '16px' }}>{favorite ? '❤️' : '🤍'}</span>
          </button>
        )}
      </div>
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
