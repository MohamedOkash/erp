import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

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
  zIndex?: number;
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
  zIndex = 1010,
}) => {
  const { direction, t } = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Lock background body scroll, bind Escape key, and trap focus
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element inside modal
    const timer = setTimeout(() => {
      if (modalContainerRef.current) {
        const focusable = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
        return;
      }

      // Trap focus
      if (e.key === 'Tab' && modalContainerRef.current) {
        const focusables = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
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
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex,
        overflow: 'hidden',
        transition: 'opacity 0.2s var(--ease-apple-spring)',
      }}
      dir={direction}
    >
      <div
        ref={modalContainerRef}
        className="glass-card animate-fade-in-up"
        style={{
          width: '100%',
          maxWidth: widthStyle,
          maxHeight,
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sheet)',
          borderRadius: 'var(--radius-xl, 22px)',
          background: 'var(--bg-surface)',
          color: 'var(--text-main)',
          transformOrigin: 'center center',
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
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-elevated)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {icon && (
                <div
                  style={{
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(30, 64, 175, 0.3) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
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
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, lineHeight: 1.3 }}>
                  {title}
                </h3>
                {subtitle && (
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
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
                aria-label={t('common.close')}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body (Internal scroll only) */}
        <div
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            padding: '1.5rem 1.75rem',
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
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-elevated)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
