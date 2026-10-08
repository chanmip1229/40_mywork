import { NextRequest, NextResponse } from "next/server";
import {
  KOREA_HOLIDAYS_2026,
  HolidayItem,
  getMonthlyHolidaySummary,
  getMonthCalendar,
} from "@/lib/holidays";

/**
 * 공공데이터포털 「특일 정보(공휴일)」 API 연동 서버 라우트 핸들러
 * API 키(HOLIDAY_API_KEY)가 브라우저 네트워크 탭에 노출되지 않도록 서버 사이드에서 호출합니다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") || "2026");
  const monthParam = searchParams.get("month");

  const apiKey = process.env.HOLIDAY_API_KEY;
  const isConfiguredKey =
    Boolean(apiKey) &&
    apiKey !== "your_decoded_public_data_api_key" &&
    apiKey!.trim().length > 10;

  let holidays: HolidayItem[] = [...KOREA_HOLIDAYS_2026];
  let source: "public_data_api" | "builtin_2026_official" = isConfiguredKey
    ? "public_data_api"
    : "builtin_2026_official";

  if (isConfiguredKey) {
    try {
      const targetMonths = monthParam
        ? [Number(monthParam)]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      const fetchedHolidays: HolidayItem[] = [];

      await Promise.all(
        targetMonths.map(async (m) => {
          const solMonth = String(m).padStart(2, "0");
          const endpoint = new URL(
            "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
          );
          endpoint.searchParams.set("serviceKey", decodeURIComponent(apiKey!));
          endpoint.searchParams.set("solYear", String(year));
          endpoint.searchParams.set("solMonth", solMonth);
          endpoint.searchParams.set("_type", "json");
          endpoint.searchParams.set("numOfRows", "50");

          const res = await fetch(endpoint.toString(), {
            next: { revalidate: 3600 },
          });

          if (!res.ok) return;
          const data = await res.json();
          const items = data?.response?.body?.items?.item;
          if (!items) return;

          const itemList = Array.isArray(items) ? items : [items];
          for (const item of itemList) {
            if (
              item?.locdate &&
              (item?.isHoliday === "Y" || item?.isHoliday === true)
            ) {
              const raw = String(item.locdate);
              const formattedDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
              fetchedHolidays.push({
                locdate: formattedDate,
                dateName: String(item.dateName || "공휴일"),
                isHoliday: true,
              });
            }
          }
        })
      );

      if (fetchedHolidays.length > 0) {
        holidays = fetchedHolidays.sort((a, b) =>
          a.locdate.localeCompare(b.locdate)
        );
      }
    } catch {
      // 공공데이터포털 게이트웨이 지연/동기화 대기 시에도 2026년 공식 특일 데이터를 중단 없이 제공
    }
  }

  const summaries = Array.from({ length: 12 }, (_, idx) =>
    getMonthlyHolidaySummary(year, idx + 1, holidays)
  );

  const calendars: Record<string, ReturnType<typeof getMonthCalendar>> = {};
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    calendars[key] = getMonthCalendar(year, m, holidays);
  }

  return NextResponse.json({
    year,
    source,
    apiKeyConfigured: isConfiguredKey,
    holidays,
    summaries,
    calendars,
  });
}
