export const MONTH_NAMES: Record<string, string[]> = {
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

export const WEEKDAY_NAMES: Record<string, string[]> = {
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

export const I18N_TEXTS: Record<
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

export const QUICK_TIMES = ['09:00', '12:00', '15:00', '18:00', '21:00', '23:59'];

export function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

export function parseValue(value?: string): {
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

export function formatDisplayDate(dateStr: string, locale: string): string {
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

export interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
}

/** Monday-first month grid; `selected` is the currently chosen date, if any. */
export function buildCalendarCells(
  viewYear: number,
  viewMonth: number,
  selected: { date: Date | null; year: number; month: number; day: number },
  today = new Date(),
): CalendarCell[] {
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const startOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isPast: true,
      isToday: false,
      isSelected: false,
    });
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const isPast =
      viewYear < todayYear ||
      (viewYear === todayYear && viewMonth < todayMonth) ||
      (viewYear === todayYear && viewMonth === todayMonth && d < todayDay);
    cells.push({
      day: d,
      isCurrentMonth: true,
      isPast,
      isToday: viewYear === todayYear && viewMonth === todayMonth && d === todayDay,
      isSelected:
        Boolean(selected.date) &&
        selected.year === viewYear &&
        selected.month === viewMonth &&
        selected.day === d,
    });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++)
    cells.push({
      day: i,
      isCurrentMonth: false,
      isPast: false,
      isToday: false,
      isSelected: false,
    });
  return cells;
}
