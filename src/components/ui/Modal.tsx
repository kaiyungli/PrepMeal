import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
  header?: React.ReactNode;
  floating?: React.ReactNode;
}

const colors = {
  brown: '#264653',
};

export default function Modal({ 
  isOpen, 
  title, 
  children, 
  onClose,
  maxWidth = '500px',
  header,
  floating
}: ModalProps) {
  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Close button - fixed at top right */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            fontSize: '16px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
        
        {/* Header - fixed */}
        {title && (
          <div style={{
            padding: '20px 24px 0 24px',
            flexShrink: 0
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: colors.brown,
              marginBottom: '16px'
            }}>
              {title}
            </h2>
          </div>
        )}
        
        {/* Custom header */}
        {header && (
          <div style={{ 
            padding: '16px 24px 0 24px',
            flexShrink: 0
          }}>
            {header}
          </div>
        )}
        
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px'
        }}>
          {children}
        </div>
        
        {/* Floating element - absolute positioned at bottom right */}
        {floating && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10
          }}>
            {floating}
          </div>
        )}
      </div>
    </div>
  );
}
