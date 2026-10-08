export interface HolidayItem {
  locdate: string; // YYYY-MM-DD
  dateName: string; // 공휴일 명칭
  isHoliday: boolean;
}

export interface DayCalendarInfo {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  dayOfWeek: number; // 0(일) ~ 6(토)
  dayOfWeekLabel: string;
  isWeekend: boolean;
  isPublicHoliday: boolean;
  isRedDay: boolean; // 주말 또는 공휴일 (차트 빨간색 음영 대상)
  holidayName?: string;
}

export interface MonthlyHolidaySummary {
  month: string; // YYYY-MM
  publicHolidayCount: number; // 법정공휴일 수 (평일+주말 포함 특일 수)
  weekdayHolidayCount: number; // 평일 공휴일 수
  totalRedDays: number; // 주말 + 공휴일 총 휴일 수
  holidays: HolidayItem[];
}

// 2026년 대한민국 법정공휴일 및 대체공휴일 데이터 (공공데이터포털 특일 정보 기준)
export const KOREA_HOLIDAYS_2026: HolidayItem[] = [
  { locdate: "2026-01-01", dateName: "1월1일(신정)", isHoliday: true },
  { locdate: "2026-02-16", dateName: "설날 연휴", isHoliday: true },
  { locdate: "2026-02-17", dateName: "설날", isHoliday: true },
  { locdate: "2026-02-18", dateName: "설날 연휴", isHoliday: true },
  { locdate: "2026-03-01", dateName: "삼일절", isHoliday: true },
  { locdate: "2026-03-02", dateName: "대체공휴일(삼일절)", isHoliday: true },
  { locdate: "2026-05-05", dateName: "어린이날", isHoliday: true },
  { locdate: "2026-05-24", dateName: "부처님오신날", isHoliday: true },
  { locdate: "2026-05-25", dateName: "대체공휴일(부처님오신날)", isHoliday: true },
  { locdate: "2026-06-03", dateName: "제9회 전국동시지방선거", isHoliday: true },
  { locdate: "2026-06-06", dateName: "현충일", isHoliday: true },
  { locdate: "2026-08-15", dateName: "광복절", isHoliday: true },
  { locdate: "2026-08-17", dateName: "대체공휴일(광복절)", isHoliday: true },
  { locdate: "2026-09-24", dateName: "추석 연휴", isHoliday: true },
  { locdate: "2026-09-25", dateName: "추석", isHoliday: true },
  { locdate: "2026-09-26", dateName: "추석 연휴", isHoliday: true },
  { locdate: "2026-10-03", dateName: "개천절", isHoliday: true },
  { locdate: "2026-10-05", dateName: "대체공휴일(개천절)", isHoliday: true },
  { locdate: "2026-10-09", dateName: "한글날", isHoliday: true },
  { locdate: "2026-12-25", dateName: "기독탄신일(성탄절)", isHoliday: true },
];

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function getMonthCalendar(
  year: number,
  month: number,
  customHolidays: HolidayItem[] = KOREA_HOLIDAYS_2026
): DayCalendarInfo[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const holidayMap = new Map<string, string>();

  for (const h of customHolidays) {
    if (h.locdate.startsWith(monthStr)) {
      const existing = holidayMap.get(h.locdate);
      holidayMap.set(h.locdate, existing ? `${existing}, ${h.dateName}` : h.dateName);
    }
  }

  const result: DayCalendarInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holidayName = holidayMap.get(dateStr);
    const isPublicHoliday = Boolean(holidayName);

    result.push({
      date: dateStr,
      dayOfMonth: d,
      dayOfWeek,
      dayOfWeekLabel: DAY_LABELS[dayOfWeek],
      isWeekend,
      isPublicHoliday,
      isRedDay: isWeekend || isPublicHoliday,
      holidayName,
    });
  }

  return result;
}

export function getMonthlyHolidaySummary(
  year: number,
  month: number,
  customHolidays: HolidayItem[] = KOREA_HOLIDAYS_2026
): MonthlyHolidaySummary {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const calendar = getMonthCalendar(year, month, customHolidays);
  const holidays = customHolidays.filter((h) => h.locdate.startsWith(monthStr));
  const publicHolidayCount = holidays.length;
  const weekdayHolidayCount = calendar.filter(
    (c) => c.isPublicHoliday && !c.isWeekend
  ).length;
  const totalRedDays = calendar.filter((c) => c.isRedDay).length;

  return {
    month: monthStr,
    publicHolidayCount,
    weekdayHolidayCount,
    totalRedDays,
    holidays,
  };
}
