import React from 'react';
import { StatsStripSkeleton } from './skeletons';

export interface StatItem {
  label: string;
  value: string | number;
  helper?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

interface StatsStripProps {
  items: StatItem[];
  isLoading?: boolean;
  minWidth?: string;
}

export const StatsStrip: React.FC<StatsStripProps> = ({
  items,
  isLoading = false,
  minWidth = '200px',
}) => {
  if (isLoading) {
    return <StatsStripSkeleton count={items.length || 4} />;
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {items.map((item, idx) => {
        const accentColor = item.color || '#3b82f6';
        return (
          <div
            key={idx}
            className="glass-card"
            style={{
              padding: '1.1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.85rem',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            {/* Left Accent Glow Line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '3px',
                background: accentColor,
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  marginBottom: '0.25rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {item.value}
              </div>

              {item.helper && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.helper}
                </div>
              )}

              {item.trend && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: item.trend.isPositive ? '#34d399' : '#f87171',
                    marginTop: '0.2rem',
                  }}
                >
                  {item.trend.isPositive ? '↑' : '↓'} {item.trend.value}
                </div>
              )}
            </div>

            {item.icon && (
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${accentColor}18`,
                  border: `1px solid ${accentColor}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentColor,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
