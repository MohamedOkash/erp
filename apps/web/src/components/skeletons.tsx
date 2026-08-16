import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number | { width?: string; align?: 'left' | 'right' | 'center' }[];
  rowHeight?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 6,
  columns = 6,
  rowHeight = '52px',
}) => {
  const colCount = typeof columns === 'number' ? columns : columns.length;
  const colConfigs =
    typeof columns === 'number'
      ? Array.from({ length: columns }).map(() => ({ width: 'auto', align: 'right' as const }))
      : columns;

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead>
          <tr style={{ background: 'rgba(15, 23, 42, 0.65)', borderBottom: '1px solid var(--border-subtle)' }}>
            {colConfigs.map((col, idx) => (
              <th key={idx} style={{ padding: '0.85rem 1rem', width: col.width }}>
                <div
                  className="skeleton-shimmer"
                  style={{
                    height: '16px',
                    width: idx === 0 ? '70%' : idx === colCount - 1 ? '40%' : '55%',
                    borderRadius: '4px',
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr
              key={rIdx}
              style={{
                height: rowHeight,
                borderBottom: rIdx < rows - 1 ? '1px solid rgba(148, 163, 184, 0.06)' : 'none',
                background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
              }}
            >
              {colConfigs.map((_, cIdx) => (
                <td key={cIdx} style={{ padding: '0.75rem 1rem' }}>
                  <div
                    className="skeleton-shimmer"
                    style={{
                      height: '14px',
                      width:
                        cIdx === 0
                          ? '80%'
                          : cIdx === colCount - 1
                          ? '50%'
                          : cIdx % 2 === 0
                          ? '60%'
                          : '40%',
                      borderRadius: '4px',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface CardsSkeletonProps {
  count?: number;
  minWidth?: string;
  height?: string;
}

export const CardsSkeleton: React.FC<CardsSkeletonProps> = ({
  count = 6,
  minWidth = '300px',
  height = '180px',
}) => {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
        gap: '1.25rem',
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass-card"
          style={{
            minHeight: height,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="skeleton-shimmer" style={{ width: '45%', height: '20px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer" style={{ width: '20%', height: '18px', borderRadius: '9999px' }} />
            </div>
            <div className="skeleton-shimmer" style={{ width: '80%', height: '14px', marginBottom: '0.5rem' }} />
            <div className="skeleton-shimmer" style={{ width: '60%', height: '14px' }} />
          </div>

          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton-shimmer" style={{ width: '30%', height: '14px' }} />
            <div className="skeleton-shimmer" style={{ width: '25%', height: '14px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

interface StatsStripSkeletonProps {
  count?: number;
}

export const StatsStripSkeleton: React.FC<StatsStripSkeletonProps> = ({ count = 4 }) => {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="skeleton-shimmer"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div className="skeleton-shimmer" style={{ width: '50%', height: '12px', marginBottom: '0.5rem' }} />
            <div className="skeleton-shimmer" style={{ width: '70%', height: '22px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};
