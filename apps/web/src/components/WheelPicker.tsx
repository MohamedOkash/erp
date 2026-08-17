import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Clock, X, Check, RotateCcw } from 'lucide-react';

const ARABIC_MONTHS = [
  { value: 1, name: 'يناير (01)' },
  { value: 2, name: 'فبراير (02)' },
  { value: 3, name: 'مارس (03)' },
  { value: 4, name: 'أبريل (04)' },
  { value: 5, name: 'مايو (05)' },
  { value: 6, name: 'يونيو (06)' },
  { value: 7, name: 'يوليو (07)' },
  { value: 8, name: 'أغسطس (08)' },
  { value: 9, name: 'سبتمبر (09)' },
  { value: 10, name: 'أكتوبر (10)' },
  { value: 11, name: 'نوفمبر (11)' },
  { value: 12, name: 'ديسمبر (12)' },
];

const ITEM_HEIGHT = 40; // Height of each item in px
const VISIBLE_COUNT = 5; // 5 items visible (2 above, 1 selected in middle, 2 below)
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 200px
const PADDING_OFFSET = ITEM_HEIGHT * 2; // 80px top & bottom padding

interface WheelColumnProps<T> {
  items: Array<{ value: T; label: string | number }>;
  selectedValue: T;
  onSelect: (value: T) => void;
  ariaLabel: string;
}

function WheelColumn<T extends string | number>({
  items,
  selectedValue,
  onSelect,
  ariaLabel,
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === selectedValue),
  );

  // Scroll to selected position
  const scrollToSelected = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      const targetScrollTop = index * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > 1) {
        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    [],
  );

  // Initial and update scroll
  useEffect(() => {
    scrollToSelected(selectedIndex, false);
  }, [selectedIndex, scrollToSelected]);

  // Handle scroll snap selection
  const handleScroll = () => {
    if (!containerRef.current) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    isScrollingRef.current = true;
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const safeIndex = Math.max(0, Math.min(items.length - 1, index));
      const targetItem = items[safeIndex];
      if (targetItem && targetItem.value !== selectedValue) {
        onSelect(targetItem.value);
      }
      isScrollingRef.current = false;
    }, 80);
  };

  const handleItemClick = (index: number) => {
    const targetItem = items[index];
    if (targetItem) {
      onSelect(targetItem.value);
      scrollToSelected(index, true);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        height: `${CONTAINER_HEIGHT}px`,
        flex: 1,
        overflow: 'hidden',
      }}
      aria-label={ariaLabel}
    >
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          paddingTop: `${PADDING_OFFSET}px`,
          paddingBottom: `${PADDING_OFFSET}px`,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = Math.min(items.length - 1, selectedIndex + 1);
            handleItemClick(nextIdx);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = Math.max(0, selectedIndex - 1);
            handleItemClick(prevIdx);
          }
        }}
      >
        {items.map((item, idx) => {
          const isSelected = item.value === selectedValue;
          return (
            <div
              key={String(item.value)}
              onClick={() => handleItemClick(idx)}
              style={{
                height: `${ITEM_HEIGHT}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'center',
                cursor: 'pointer',
                fontSize: isSelected ? '15px' : '13px',
                fontWeight: isSelected ? 800 : 500,
                color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                transform: isSelected ? 'scale(1.08)' : 'scale(0.95)',
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1) Wheel Date Picker
// -------------------------------------------------------------
export interface WheelDatePickerProps {
  value?: string | null; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  id?: string;
  name?: string;
}

export const WheelDatePicker: React.FC<WheelDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'اختر التاريخ...',
  disabled = false,
  minYear = new Date().getFullYear() - 6,
  maxYear = new Date().getFullYear() + 6,
  style,
  required,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse initial date
  const parseDate = (dateStr?: string | null) => {
    if (!dateStr) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      };
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      };
    }
    return { year: y, month: m, day: d };
  };

  const [tempYear, setTempYear] = useState<number>(() => parseDate(value).year);
  const [tempMonth, setTempMonth] = useState<number>(() => parseDate(value).month);
  const [tempDay, setTempDay] = useState<number>(() => parseDate(value).day);

  // Sync state when external value changes
  useEffect(() => {
    if (value) {
      const { year, month, day } = parseDate(value);
      setTempYear(year);
      setTempMonth(month);
      setTempDay(day);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Calculate days in month
  const daysInMonth = new Date(tempYear, tempMonth, 0).getDate();
  const adjustedDay = Math.min(tempDay, daysInMonth);

  // Generate item arrays
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    value: i + 1,
    label: String(i + 1).padStart(2, '0'),
  }));

  const months = ARABIC_MONTHS.map((m) => ({
    value: m.value,
    label: m.name,
  }));

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
    const y = minYear + i;
    return { value: y, label: String(y) };
  });

  const handleApply = (y = tempYear, m = tempMonth, d = adjustedDay) => {
    const safeDay = Math.min(d, new Date(y, m, 0).getDate());
    const formatted = `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    setTempYear(y);
    setTempMonth(m);
    setTempDay(d);
    handleApply(y, m, d);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Formatted display value
  const displayValue = value ? value : '';

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        ...style,
      }}
    >
      {/* Hidden input for form validations */}
      {required && (
        <input
          type="text"
          id={id}
          name={name}
          value={displayValue}
          required={required}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
          tabIndex={-1}
        />
      )}

      {/* Styled Input Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 0.85rem',
          background: disabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.3)',
          border: isOpen
            ? '1px solid var(--accent-primary, #3b82f6)'
            : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--radius-md, 8px)',
          color: displayValue ? '#ffffff' : 'var(--text-muted, #94a3b8)',
          fontSize: '0.85rem',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'right',
          direction: 'rtl',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontWeight: displayValue ? 600 : 400, fontFamily: displayValue ? 'monospace, Cairo' : 'inherit' }}>
          {displayValue || placeholder}
        </span>
        <Calendar size={16} style={{ color: isOpen ? 'var(--accent-primary, #3b82f6)' : 'var(--text-muted, #94a3b8)' }} />
      </button>

      {/* Popover Wheel Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 9999,
            minWidth: '320px',
            maxWidth: '380px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '14px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            padding: '16px',
            direction: 'rtl',
            animation: 'fadeInScale 0.15s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#60a5fa" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>تحديد التاريخ</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Wheel Columns Container with Center Highlight Strip */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Center Selection Indicator Strip */}
            <div
              style={{
                position: 'absolute',
                top: `${PADDING_OFFSET}px`,
                left: '6px',
                right: '6px',
                height: `${ITEM_HEIGHT}px`,
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.25) 50%, rgba(59, 130, 246, 0.15) 100%)',
                borderTop: '1px solid rgba(96, 165, 250, 0.5)',
                borderBottom: '1px solid rgba(96, 165, 250, 0.5)',
                borderRadius: '6px',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            {/* Day Column */}
            <WheelColumn
              items={days}
              selectedValue={adjustedDay}
              onSelect={setTempDay}
              ariaLabel="اليوم"
            />

            {/* Month Column */}
            <WheelColumn
              items={months}
              selectedValue={tempMonth}
              onSelect={setTempMonth}
              ariaLabel="الشهر"
            />

            {/* Year Column */}
            <WheelColumn
              items={years}
              selectedValue={tempYear}
              onSelect={setTempYear}
              ariaLabel="السنة"
            />
          </div>

          {/* Column Header Titles (RTL: Day | Month | Year) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: '6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            <span>اليوم</span>
            <span>الشهر</span>
            <span>السنة</span>
          </div>

          {/* Quick Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleToday}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#93c5fd',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={12} />
                اليوم
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                مسح
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleApply()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Check size={14} />
              تأكيد
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 2) Wheel Time Picker
// -------------------------------------------------------------
export interface WheelTimePickerProps {
  value?: string | null; // HH:mm (e.g. "08:30")
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minuteStep?: number; // default: 5 or 1
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  id?: string;
  name?: string;
}

export const WheelTimePicker: React.FC<WheelTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'اختر الوقت...',
  disabled = false,
  minuteStep = 5,
  style,
  required,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const parseTime = (timeStr?: string | null) => {
    if (!timeStr) {
      return { hour: 8, minute: 0 };
    }
    const [h, m] = timeStr.split(':').map(Number);
    return {
      hour: isNaN(h) ? 8 : Math.max(0, Math.min(23, h)),
      minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
    };
  };

  const [tempHour, setTempHour] = useState<number>(() => parseTime(value).hour);
  const [tempMinute, setTempMinute] = useState<number>(() => parseTime(value).minute);

  useEffect(() => {
    if (value) {
      const { hour, minute } = parseTime(value);
      setTempHour(hour);
      setTempMinute(minute);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${String(i).padStart(2, '0')}:00 ${i < 12 ? 'ص' : 'م'}`,
  }));

  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => {
    const m = i * minuteStep;
    return {
      value: m,
      label: String(m).padStart(2, '0') + ' دقيقة',
    };
  });

  const handleApply = (h = tempHour, m = tempMinute) => {
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleNow = () => {
    const now = new Date();
    const h = now.getHours();
    const rawM = now.getMinutes();
    const m = Math.round(rawM / minuteStep) * minuteStep % 60;
    setTempHour(h);
    setTempMinute(m);
    handleApply(h, m);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const displayValue = value || '';

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        ...style,
      }}
    >
      {required && (
        <input
          type="text"
          id={id}
          name={name}
          value={displayValue}
          required={required}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
          tabIndex={-1}
        />
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 0.85rem',
          background: disabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.3)',
          border: isOpen
            ? '1px solid var(--accent-primary, #3b82f6)'
            : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--radius-md, 8px)',
          color: displayValue ? '#ffffff' : 'var(--text-muted, #94a3b8)',
          fontSize: '0.85rem',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'right',
          direction: 'rtl',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontWeight: displayValue ? 600 : 400, fontFamily: displayValue ? 'monospace, Cairo' : 'inherit' }}>
          {displayValue || placeholder}
        </span>
        <Clock size={16} style={{ color: isOpen ? 'var(--accent-primary, #3b82f6)' : 'var(--text-muted, #94a3b8)' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 9999,
            minWidth: '280px',
            maxWidth: '340px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '14px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            padding: '16px',
            direction: 'rtl',
            animation: 'fadeInScale 0.15s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#60a5fa" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>تحديد الوقت</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              display: 'flex',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: `${PADDING_OFFSET}px`,
                left: '6px',
                right: '6px',
                height: `${ITEM_HEIGHT}px`,
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.25) 50%, rgba(59, 130, 246, 0.15) 100%)',
                borderTop: '1px solid rgba(96, 165, 250, 0.5)',
                borderBottom: '1px solid rgba(96, 165, 250, 0.5)',
                borderRadius: '6px',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            <WheelColumn
              items={hours}
              selectedValue={tempHour}
              onSelect={setTempHour}
              ariaLabel="الساعة"
            />

            <WheelColumn
              items={minutes}
              selectedValue={tempMinute}
              onSelect={setTempMinute}
              ariaLabel="الدقيقة"
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: '6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            <span>الساعة</span>
            <span>الدقيقة</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleNow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#93c5fd',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={12} />
                الآن
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                مسح
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleApply()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Check size={14} />
              تأكيد
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
