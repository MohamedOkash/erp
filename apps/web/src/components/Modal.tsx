import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | string;
  maxHeight?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  headerActions?: React.ReactNode;
}

const maxWidthMap: Record<string, string> = {
  sm: '480px',
  md: '600px',
  lg: '750px',
  xl: '850px',
  '2xl': '950px',
  '3xl': '1050px',
  '4xl': '1180px',
  '5xl': '1320px',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = '3xl',
  maxHeight = '90vh',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  headerActions,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock background body scroll and bind Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const widthStyle = maxWidthMap[maxWidth] || maxWidth;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 1000,
        overflow: 'hidden',
      }}
      dir="rtl"
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: widthStyle,
          maxHeight,
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: 0, // Padding handled individually on Header, Body, and Footer
          overflow: 'hidden',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(59, 130, 246, 0.15)',
          borderRadius: 'var(--radius-xl, 16px)',
          background: 'rgba(15, 23, 42, 0.95)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        {(title || icon) && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              background: 'rgba(30, 41, 59, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {icon && (
                <div
                  style={{
                    padding: '0.55rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(30, 64, 175, 0.4) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {icon}
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>
                  {title}
                </h3>
                {subtitle && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94a3b8)', marginTop: '0.2rem' }}>
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '0.45rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-muted, #94a3b8)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body (Internal scroll only) */}
        <div
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            padding: '1.75rem',
          }}
        >
          {children}
        </div>

        {/* Fixed Footer */}
        {footer && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              background: 'rgba(15, 23, 42, 0.85)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
