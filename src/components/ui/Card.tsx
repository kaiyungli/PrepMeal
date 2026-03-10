import Image from 'next/image';

interface CardProps {
  title: string;
  description?: string;
  image?: string;
  tags?: string[];
  children?: React.ReactNode;
  onClick?: () => void;
  favorite?: boolean;
  onFavorite?: () => void;
  className?: string;
}

export default function Card({ 
  title, 
  description, 
  image, 
  tags, 
  children,
  onClick,
  favorite,
  onFavorite,
  className = '' 
}: CardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-${
        onClick ? 'pointer' : 'default'
      } ${className}`}
    >
      <div className="h-48 relative">
        {image ? (
          <Image src={image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} alt={title || 'recipe'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-200">
            <span className="text-5xl">🍳</span>
          </div>
        )}
        {onFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            className="absolute top-3 right-3 bg-white/95 border-2 border-red-400 rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10 hover:scale-105 transition-transform"
          >
            <span className="text-lg">{favorite ? '❤️' : '🤍'}</span>
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 text-[#3A2010]">{title}</h3>
        {description && (
          <p className="text-sm mb-3 text-[#AA7A50]">{description}</p>
        )}
        {tags && tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#14B8A6', color: 'white' }}>
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
