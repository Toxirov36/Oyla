import * as React from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { useI18n } from '../../i18n';
import { cn } from '@/lib/utils';
import {
  I18N_TEXTS,
  MONTH_NAMES,
  QUICK_TIMES,
  WEEKDAY_NAMES,
  buildCalendarCells,
  formatDisplayDate,
  padZero,
  parseValue,
} from './datetime-picker-utils';

export interface DateTimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(
  function DateTimePicker(
    {
      value = '',
      onChange,
      onBlur,
      placeholder,
      disabled = false,
      invalid = false,
      id,
      name,
      className,
    },
    ref,
  ) {
    const { locale } = useI18n();
    const texts = I18N_TEXTS[locale] || I18N_TEXTS.uz;
    const months = MONTH_NAMES[locale] || MONTH_NAMES.uz;
    const weekdays = WEEKDAY_NAMES[locale] || WEEKDAY_NAMES.uz;

    const [open, setOpen] = React.useState(false);

    const parsed = React.useMemo(() => parseValue(value), [value]);

    const [viewYear, setViewYear] = React.useState(parsed.year);
    const [viewMonth, setViewMonth] = React.useState(parsed.month);

    // Keep view synced when external value changes
    React.useEffect(() => {
      if (parsed.date) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      }
    }, [parsed.year, parsed.month, parsed.date]);

    // Active selected time or default 18:00
    const [selectedHours, setSelectedHours] = React.useState(parsed.hours);
    const [selectedMinutes, setSelectedMinutes] = React.useState(parsed.minutes);

    React.useEffect(() => {
      setSelectedHours(parsed.hours);
      setSelectedMinutes(parsed.minutes);
    }, [parsed.hours, parsed.minutes]);

    const buildDateTimeString = (
      year: number,
      month: number,
      day: number,
      h: number,
      m: number,
    ) => {
      return `${year}-${padZero(month + 1)}-${padZero(day)}T${padZero(h)}:${padZero(m)}`;
    };

    const handleSelectDay = (day: number) => {
      const newStr = buildDateTimeString(viewYear, viewMonth, day, selectedHours, selectedMinutes);
      onChange?.(newStr);
    };

    const handleTimeChange = (h: number, m: number) => {
      setSelectedHours(h);
      setSelectedMinutes(m);

      if (parsed.date) {
        const newStr = buildDateTimeString(parsed.year, parsed.month, parsed.day, h, m);
        onChange?.(newStr);
      } else {
        // Default to today or tomorrow
        const now = new Date();
        const newStr = buildDateTimeString(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
        onChange?.(newStr);
      }
    };

    const handleApplyPreset = (daysOffset: number, presetHours = 18, presetMinutes = 0) => {
      const target = new Date();
      target.setDate(target.getDate() + daysOffset);
      const newStr = buildDateTimeString(
        target.getFullYear(),
        target.getMonth(),
        target.getDate(),
        presetHours,
        presetMinutes,
      );
      setSelectedHours(presetHours);
      setSelectedMinutes(presetMinutes);
      setViewYear(target.getFullYear());
      setViewMonth(target.getMonth());
      onChange?.(newStr);
    };

    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    };

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    };

    const calendarCells = buildCalendarCells(viewYear, viewMonth, parsed);

    const displayValue = formatDisplayDate(value, locale);

    return (
      <div className="relative w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={ref}
              type="button"
              id={id}
              name={name}
              disabled={disabled}
              onBlur={onBlur}
              className={cn(
                'group flex h-[46px] w-full items-center justify-between rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-sm font-normal text-[var(--foreground)] outline-none transition-all duration-150 hover:border-[var(--primary)] focus:border-[var(--primary)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                invalid && 'border-[var(--destructive)] focus:border-[var(--destructive)]',
                className,
              )}
              aria-label={displayValue || placeholder || texts.placeholder}
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <div className="flex items-center gap-2.5 truncate">
                <CalendarIcon className="h-4 w-4 shrink-0 text-[var(--primary)] transition-transform duration-200 group-hover:scale-105" />
                <span
                  className={cn(
                    'truncate text-sm',
                    displayValue
                      ? 'font-medium text-[var(--foreground)]'
                      : 'text-[var(--muted)] font-normal',
                  )}
                >
                  {displayValue || placeholder || texts.placeholder}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {Boolean(value) && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange?.('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onChange?.('');
                      }
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-colors"
                    title={texts.clear}
                    aria-label={texts.clear}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <Clock className="h-4 w-4 text-[var(--muted)] transition-colors group-hover:text-[var(--primary)]" />
              </div>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-[330px] p-4 select-none datetime-picker-popover"
          >
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pb-3 border-b border-[var(--border)]">
              <button
                type="button"
                onClick={() => handleApplyPreset(0, 18, 0)}
                className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--blue-soft)] hover:text-[var(--primary)] transition-colors"
              >
                {texts.todayPreset}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(1, 18, 0)}
                className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--blue-soft)] hover:text-[var(--primary)] transition-colors"
              >
                {texts.tomorrowPreset}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(3, 18, 0)}
                className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--blue-soft)] hover:text-[var(--primary)] transition-colors"
              >
                {texts.threeDaysPreset}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(7, 18, 0)}
                className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--blue-soft)] hover:text-[var(--primary)] transition-colors"
              >
                {texts.oneWeekPreset}
              </button>
            </div>

            {/* Month & Year Navigation */}
            <div className="flex items-center justify-between py-2.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Oldingi oy"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-sm font-bold text-[var(--navy)]">
                {months[viewMonth]} {viewYear}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Keyingi oy"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center py-1 text-[11px] font-semibold text-[var(--muted)]">
              {weekdays.map((wd) => (
                <div key={wd} className="h-6 flex items-center justify-center">
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 text-center py-1">
              {calendarCells.map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="h-8 flex items-center justify-center text-xs text-[var(--muted)] opacity-30 select-none"
                    >
                      {cell.day}
                    </div>
                  );
                }

                if (cell.isPast) {
                  return (
                    <div
                      key={`past-${cell.day}`}
                      className="h-8 flex items-center justify-center text-xs text-[var(--muted)] opacity-30 cursor-not-allowed select-none"
                    >
                      {cell.day}
                    </div>
                  );
                }

                return (
                  <button
                    key={`day-${cell.day}`}
                    type="button"
                    onClick={() => handleSelectDay(cell.day)}
                    className={cn(
                      'relative h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-150',
                      cell.isSelected
                        ? 'bg-[var(--primary)] text-white font-semibold shadow-sm'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface)] hover:text-[var(--primary)]',
                      cell.isToday &&
                        !cell.isSelected &&
                        'font-bold text-[var(--primary)] ring-1 ring-[var(--primary)]/40',
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Time Picker Section */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--navy)]">
                  <Clock size={13} className="text-[var(--primary)]" />
                  <span>{texts.timeLabel}</span>
                </div>
                {/* Quick time chips */}
                <div className="flex items-center gap-1">
                  {QUICK_TIMES.slice(1, 5).map((qt) => {
                    const [h, m] = qt.split(':').map(Number);
                    const isCurrent = selectedHours === h && selectedMinutes === m;
                    return (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => handleTimeChange(h, m)}
                        className={cn(
                          'px-1.5 py-0.5 text-[11px] rounded font-medium transition-colors',
                          isCurrent
                            ? 'bg-[var(--primary)] text-white font-semibold'
                            : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--blue-soft)] hover:text-[var(--primary)]',
                        )}
                      >
                        {qt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hour & Minute Selectors */}
              <div className="flex items-center justify-center gap-2 bg-[var(--surface)] p-2 rounded-xl">
                <div className="flex items-center gap-1">
                  <label htmlFor={`${id || 'dtp'}-hour`} className="sr-only">
                    Soat
                  </label>
                  <select
                    id={`${id || 'dtp'}-hour`}
                    value={selectedHours}
                    onChange={(e) => handleTimeChange(Number(e.target.value), selectedMinutes)}
                    className="h-8 w-16 px-2 text-center text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-[var(--primary)] outline-none cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {padZero(i)}:00
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs font-bold text-[var(--muted)]">:</span>

                <div className="flex items-center gap-1">
                  <label htmlFor={`${id || 'dtp'}-minute`} className="sr-only">
                    Daqiqa
                  </label>
                  <select
                    id={`${id || 'dtp'}-minute`}
                    value={selectedMinutes}
                    onChange={(e) => handleTimeChange(selectedHours, Number(e.target.value))}
                    className="h-8 w-16 px-2 text-center text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-[var(--primary)] outline-none cursor-pointer"
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59].map((m) => (
                      <option key={m} value={m}>
                        {padZero(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onChange?.('');
                  setOpen(false);
                }}
                className="text-xs font-medium text-[var(--muted)] hover:text-[var(--destructive)] transition-colors px-1 py-1"
              >
                {texts.clear}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <Check size={14} />
                <span>{texts.done}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

DateTimePicker.displayName = 'DateTimePicker';
