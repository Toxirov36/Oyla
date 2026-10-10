import * as React from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { useI18n } from '../../i18n';
import { cn } from '@/lib/utils';

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

const MONTH_NAMES: Record<string, string[]> = {
  uz: [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ],
  ru: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

const WEEKDAY_NAMES: Record<string, string[]> = {
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

const I18N_TEXTS: Record<
  string,
  {
    todayPreset: string;
    tomorrowPreset: string;
    threeDaysPreset: string;
    oneWeekPreset: string;
    timeLabel: string;
    clear: string;
    done: string;
    placeholder: string;
  }
> = {
  uz: {
    todayPreset: 'Bugun 18:00',
    tomorrowPreset: 'Ertaga 18:00',
    threeDaysPreset: '+3 kun',
    oneWeekPreset: '+1 hafta',
    timeLabel: 'Topshirish vaqti',
    clear: 'Tozalash',
    done: 'Tayyor',
    placeholder: 'Muddatni tanlang…',
  },
  ru: {
    todayPreset: 'Сегодня 18:00',
    tomorrowPreset: 'Завтра 18:00',
    threeDaysPreset: '+3 дня',
    oneWeekPreset: '+1 неделя',
    timeLabel: 'Время сдачи',
    clear: 'Очистить',
    done: 'Готово',
    placeholder: 'Укажите срок…',
  },
  en: {
    todayPreset: 'Today 18:00',
    tomorrowPreset: 'Tomorrow 18:00',
    threeDaysPreset: '+3 days',
    oneWeekPreset: '+1 week',
    timeLabel: 'Due time',
    clear: 'Clear',
    done: 'Done',
    placeholder: 'Select deadline…',
  },
};

const QUICK_TIMES = ['09:00', '12:00', '15:00', '18:00', '21:00', '23:59'];

function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

function parseValue(value?: string): {
  date: Date | null;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  if (!value) {
    const now = new Date();
    return {
      date: null,
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hours: 18,
      minutes: 0,
    };
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: null,
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hours: 18,
      minutes: 0,
    };
  }

  return {
    date: d,
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  };
}

function formatDisplayDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());

  if (locale === 'uz') {
    const uzMonths = [
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentabr',
      'oktabr',
      'noyabr',
      'dekabr',
    ];
    return `${day}-${uzMonths[monthIdx]} ${year}, ${hours}:${minutes}`;
  }
  if (locale === 'ru') {
    const ruMonths = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];
    return `${day} ${ruMonths[monthIdx]} ${year}, ${hours}:${minutes}`;
  }
  const enMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${day} ${enMonths[monthIdx]} ${year}, ${hours}:${minutes}`;
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

    const buildDateTimeString = (year: number, month: number, day: number, h: number, m: number) => {
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

    // Calendar grid calculations
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    // Shift so Monday is index 0
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const calendarCells: Array<{
      day: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      calendarCells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPast: true,
        isToday: false,
        isSelected: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const isPast =
        viewYear < todayYear ||
        (viewYear === todayYear && viewMonth < todayMonth) ||
        (viewYear === todayYear && viewMonth === todayMonth && d < todayDay);

      const isToday = viewYear === todayYear && viewMonth === todayMonth && d === todayDay;

      const isSelected =
        Boolean(parsed.date) &&
        parsed.year === viewYear &&
        parsed.month === viewMonth &&
        parsed.day === d;

      calendarCells.push({
        day: d,
        isCurrentMonth: true,
        isPast,
        isToday,
        isSelected,
      });
    }

    // Next month padding to fill a complete 7-column grid
    const remaining = (7 - (calendarCells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      calendarCells.push({
        day: i,
        isCurrentMonth: false,
        isPast: false,
        isToday: false,
        isSelected: false,
      });
    }

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
                      cell.isToday && !cell.isSelected && 'font-bold text-[var(--primary)] ring-1 ring-[var(--primary)]/40',
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
