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
      className={`bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-${
        onClick ? 'pointer' : 'default'
      } ${className}`}
    >
      <div className="h-40 relative">
        {image ? (
          <Image src={image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} alt={title || 'recipe'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
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
        <h3 className="text-base font-semibold text-brown mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
        {tags && tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {tags.map((tag, i) => (
              <span key={i} className="bg-yellow text-white px-2 py-0.5 rounded text-xs">
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
