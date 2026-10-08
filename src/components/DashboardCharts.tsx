"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from "recharts";
import {
  BRANCHES,
  BRANCH_COLORS,
  BranchName,
  SalesRecord,
} from "@/lib/supabase";
import {
  DayCalendarInfo,
  MonthlyHolidaySummary,
  getMonthCalendar,
} from "@/lib/holidays";
import {
  BarChart3,
  CalendarDays,
  Info,
  Layers,
  Store,
  TrendingUp,
} from "lucide-react";

interface DashboardChartsProps {
  records: SalesRecord[];
  selectedBranch: BranchName | "ALL";
  onSelectBranch: (branch: BranchName | "ALL") => void;
  holidaySummaries: MonthlyHolidaySummary[];
  calendars: Record<string, DayCalendarInfo[]>;
  holidaySource: "public_data_api" | "builtin_2026_official";
  onSelectEditRecord: (record: SalesRecord) => void;
}

export default function DashboardCharts({
  records,
  selectedBranch,
  onSelectBranch,
  holidaySummaries,
  calendars,
  holidaySource,
  onSelectEditRecord,
}: DashboardChartsProps) {
  const [holidayMetric, setHolidayMetric] = useState<"public" | "redDays">(
    "public"
  );
  const [selectedDailyMonth, setSelectedDailyMonth] =
    useState<string>("2026-08");
  const [dailyTargetBranch, setDailyTargetBranch] = useState<BranchName>(
    selectedBranch === "ALL" ? "용산역점" : selectedBranch
  );

  // 사용할 월 목록 추출 (예: 2026-03 ~ 2026-09)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.month) set.add(r.month);
    }
    const sorted = Array.from(set).sort();
    return sorted.length > 0
      ? sorted
      : ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
  }, [records]);

  // 공휴일 요약 맵
  const holidaySummaryMap = useMemo(() => {
    const map = new Map<string, MonthlyHolidaySummary>();
    for (const s of holidaySummaries) {
      map.set(s.month, s);
    }
    return map;
  }, [holidaySummaries]);

  // 1) 월별 데이터 집계 (전체 지점 비교 & 단일 지점 조회용)
  const monthlyChartData = useMemo(() => {
    return availableMonths.map((month) => {
      const monthRows = records.filter((r) => r.month === month);
      const hSummary = holidaySummaryMap.get(month);
      const publicHolidayCount = hSummary?.publicHolidayCount ?? 0;
      const totalRedDays = hSummary?.totalRedDays ?? 8;
      const holidayNames =
        hSummary?.holidays.map((h) => h.dateName).join(", ") || "특일 없음";

      const entry: Record<string, any> = {
        month,
        monthLabel: `${Number(month.slice(5))}월`,
        publicHolidayCount,
        totalRedDays,
        holidayCount:
          holidayMetric === "public" ? publicHolidayCount : totalRedDays,
        holidayNames,
      };

      let totalSales = 0;
      let totalCustomers = 0;
      const branchRemarks: string[] = [];

      for (const branch of BRANCHES) {
        const bRows = monthRows.filter((r) => r.branch_name === branch);
        const bSales = bRows.reduce((acc, cur) => acc + cur.sales_amount, 0);
        const bCustomers = bRows.reduce(
          (acc, cur) => acc + cur.customer_count,
          0
        );
        const bUnitPrice =
          bCustomers > 0 ? Math.round(bSales / bCustomers) : 0;
        const bNote = bRows
          .map((r) => r.remarks)
          .filter(Boolean)
          .join(" / ");

        entry[`${branch}_sales`] = bSales;
        entry[`${branch}_customers`] = bCustomers;
        entry[`${branch}_unitPrice`] = bUnitPrice;
        entry[`${branch}_remarks`] = bNote;

        if (selectedBranch === "ALL" || selectedBranch === branch) {
          totalSales += bSales;
          totalCustomers += bCustomers;
          if (bNote) {
            branchRemarks.push(
              selectedBranch === "ALL" ? `${branch}: ${bNote}` : bNote
            );
          }
        }
      }

      entry.totalSales = totalSales;
      entry.totalCustomers = totalCustomers;
      entry.avgUnitPrice =
        totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0;
      entry.combinedRemarks = branchRemarks.join(" | ");

      return entry;
    });
  }, [availableMonths, records, holidaySummaryMap, holidayMetric, selectedBranch]);

  // 2) 일별 데이터 차트용 데이터 생성 (주말 및 공휴일 빨간색 음영 강조)
  const effectiveDailyBranch: BranchName =
    selectedBranch === "ALL" ? dailyTargetBranch : selectedBranch;

  const dailyChartBundle = useMemo(() => {
    const [yStr, mStr] = selectedDailyMonth.split("-");
    const year = Number(yStr) || 2026;
    const month = Number(mStr) || 8;
    const calendar =
      calendars[selectedDailyMonth] || getMonthCalendar(year, month);

    // 해당 지점 & 해당 월의 실제 일별 레코드('YYYY-MM-DD') 확인
    const dailyRecordsMap = new Map<string, SalesRecord>();
    for (const r of records) {
      if (
        r.isDaily &&
        r.month === selectedDailyMonth &&
        r.branch_name === effectiveDailyBranch
      ) {
        dailyRecordsMap.set(r.period, r);
      }
    }

    // 월별 집계 레코드 확인 (일별 데이터가 없는 날짜에 현실적인 일별 추이 시뮬레이션 제공)
    const monthlyRow = records.find(
      (r) =>
        !r.isDaily &&
        r.month === selectedDailyMonth &&
        r.branch_name === effectiveDailyBranch
    );

    const baseMonthlySales = monthlyRow?.sales_amount || 42000000;
    const baseMonthlyCustomers = monthlyRow?.customer_count || 5200;

    // 지점별 특성에 따른 요일/공휴일 가중치 (이태원/한남은 주말 강세, 용산역/삼각지/효창공원은 평일·출퇴근 및 고른 분포)
    const isWeekendStrongBranch =
      effectiveDailyBranch === "이태원점" || effectiveDailyBranch === "한남점";

    const rawWeights = calendar.map((day, idx) => {
      // 결정론적 미세 변동 (날짜 + 지점명 코드 기반)
      const seed =
        day.dayOfMonth * 13 + effectiveDailyBranch.charCodeAt(0) * 7 + idx;
      const wave = 0.92 + ((seed % 17) / 17) * 0.16;
      if (day.isRedDay) {
        return (isWeekendStrongBranch ? 1.24 : 0.88) * wave;
      }
      return (isWeekendStrongBranch ? 0.91 : 1.05) * wave;
    });

    const sumWeights = rawWeights.reduce((a, b) => a + b, 0) || 1;

    const points = calendar.map((day, idx) => {
      const actual = dailyRecordsMap.get(day.date);
      const ratio = rawWeights[idx] / sumWeights;

      const sales = actual
        ? actual.sales_amount
        : Math.round(baseMonthlySales * ratio / 1000) * 1000;
      const customers = actual
        ? actual.customer_count
        : Math.max(1, Math.round(baseMonthlyCustomers * ratio));
      const unitPrice = customers > 0 ? Math.round(sales / customers) : 0;

      return {
        date: day.date,
        dayLabel: `${day.dayOfMonth}일(${day.dayOfWeekLabel})`,
        dayNumber: day.dayOfMonth,
        dayOfWeekLabel: day.dayOfWeekLabel,
        isWeekend: day.isWeekend,
        isPublicHoliday: day.isPublicHoliday,
        isRedDay: day.isRedDay,
        holidayName: day.holidayName || (day.isWeekend ? "주말" : ""),
        sales_amount: sales,
        customer_count: customers,
        unit_price: unitPrice,
        isActualDailyRecord: Boolean(actual),
        remarks: actual?.remarks || "",
      };
    });

    // 연속된 주말/공휴일(isRedDay) 구간을 묶어 ReferenceArea 빨간색 배경 음영 구간 생성
    const redZones: Array<{ startLabel: string; endLabel: string; label: string }> =
      [];
    for (const pt of points) {
      if (pt.isRedDay) {
        redZones.push({
          startLabel: pt.dayLabel,
          endLabel: pt.dayLabel,
          label: pt.holidayName,
        });
      }
    }

    return {
      points,
      redZones,
      hasActualDaily: dailyRecordsMap.size > 0,
      monthlyRemark: monthlyRow?.remarks || "",
    };
  }, [
    selectedDailyMonth,
    calendars,
    records,
    effectiveDailyBranch,
  ]);

  // 전체 지점 비교 툴팁 (매출액, 객수, 객당 매출액 필수 표기)
  const renderAllBranchesTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload;
    if (!row) return null;

    return (
      <div className="min-w-[300px] rounded-2xl border border-stone-200 bg-white/98 p-4 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <div>
            <p className="text-sm font-bold text-stone-900">
              {row.month} 지점별 매출 · 객단가 비교
            </p>
            <p className="text-xs text-red-600">
              법정공휴일 {row.publicHolidayCount}일 ({row.holidayNames}) · 총
              휴일(주말포함) {row.totalRedDays}일
            </p>
          </div>
        </div>

        <div className="mt-2.5 space-y-2">
          {BRANCHES.map((branch) => {
            const bSales = row[`${branch}_sales`] || 0;
            const bCustomers = row[`${branch}_customers`] || 0;
            const bUnitPrice = row[`${branch}_unitPrice`] || 0;
            const bRemarks = row[`${branch}_remarks`];

            return (
              <div
                key={branch}
                className="rounded-xl bg-stone-50 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-stone-900">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: BRANCH_COLORS[branch] }}
                    />
                    {branch}
                  </span>
                  <span>{(bSales / 10000).toLocaleString()}만 원</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-stone-600">
                  <span>객수: {bCustomers.toLocaleString()}명</span>
                  <span className="font-semibold text-amber-800">
                    객당 매출액: {bUnitPrice.toLocaleString()}원
                  </span>
                </div>
                {bRemarks && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700">
                    📌 특이사항: {bRemarks}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-2.5 text-xs font-bold text-stone-900">
          <span>5개 지점 합계 / 평균 객단가</span>
          <span>
            {(row.totalSales / 10000).toLocaleString()}만 원 ·{" "}
            <span className="text-amber-800">
              {row.avgUnitPrice.toLocaleString()}원/인
            </span>
          </span>
        </div>
      </div>
    );
  };

  // 단일 지점 툴팁 (매출액, 객수, 객당 매출액, 공휴일, 특이사항 표기)
  const renderSingleBranchTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload;
    if (!row) return null;

    return (
      <div className="min-w-[260px] rounded-2xl border border-stone-200 bg-white p-4 shadow-xl">
        <p className="border-b border-stone-100 pb-2 text-sm font-bold text-stone-900">
          {row.month} ({selectedBranch})
        </p>
        <div className="mt-2.5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500">총 매출액</span>
            <span className="font-bold text-stone-900">
              {row.totalSales.toLocaleString()}원 (
              {(row.totalSales / 10000).toLocaleString()}만)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">방문 객수</span>
            <span className="font-semibold text-stone-800">
              {row.totalCustomers.toLocaleString()}명
            </span>
          </div>
          <div className="flex justify-between rounded-lg bg-amber-50 px-2 py-1">
            <span className="font-semibold text-amber-900">객당 매출액</span>
            <span className="font-bold text-amber-900">
              {row.avgUnitPrice.toLocaleString()}원
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-red-600">해당 월 공휴일</span>
            <span className="font-semibold text-red-600">
              법정공휴일 {row.publicHolidayCount}일 (주말포함 {row.totalRedDays}일)
            </span>
          </div>
          <p className="text-[11px] text-stone-500">특일: {row.holidayNames}</p>
          {row.combinedRemarks && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-[11px] font-medium text-amber-900">
              📌 특이사항: {row.combinedRemarks}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 일별 차트 툴팁
  const renderDailyTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const pt = payload[0]?.payload;
    if (!pt) return null;

    return (
      <div className="min-w-[240px] rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <span className="text-xs font-bold text-stone-900">
            {pt.date} ({pt.dayOfWeekLabel}요일)
          </span>
          {pt.isRedDay ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              🔴 {pt.holidayName}
            </span>
          ) : (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
              평일 영업일
            </span>
          )}
        </div>
        <div className="mt-2.5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500">일 매출액</span>
            <span className="font-bold text-stone-900">
              {pt.sales_amount.toLocaleString()}원
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">일 방문 객수</span>
            <span className="font-semibold text-stone-800">
              {pt.customer_count.toLocaleString()}명
            </span>
          </div>
          <div className="flex justify-between rounded-lg bg-amber-50 px-2 py-1">
            <span className="font-semibold text-amber-900">객당 매출액</span>
            <span className="font-bold text-amber-900">
              {pt.unit_price.toLocaleString()}원
            </span>
          </div>
          {pt.remarks && (
            <p className="mt-1 text-[11px] font-medium text-amber-800">
              📌 {pt.remarks}
            </p>
          )}
        </div>
      </div>
    );
  };

  // 단일 지점 선택 시 특이사항 기록 목록
  const singleBranchRemarks = useMemo(() => {
    if (selectedBranch === "ALL") return [];
    return records
      .filter((r) => r.branch_name === selectedBranch && r.remarks)
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [records, selectedBranch]);

  return (
    <div className="space-y-6">
      {/* 뷰(View) 옵션 컨트롤 바: 전체 지점 비교 vs 단일 지점 조회 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-bold text-stone-700">
            <Layers className="h-4 w-4 text-amber-800" />
            조회 뷰(View) 선택:
          </span>
          <button
            type="button"
            onClick={() => onSelectBranch("ALL")}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              selectedBranch === "ALL"
                ? "bg-amber-800 text-white shadow-xs"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            전체 지점 통합 비교 (5개 지점)
          </button>
          {BRANCHES.map((branch) => (
            <button
              key={branch}
              type="button"
              onClick={() => {
                onSelectBranch(branch);
                setDailyTargetBranch(branch);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                selectedBranch === branch
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: BRANCH_COLORS[branch] }}
              />
              {branch}
            </button>
          ))}
        </div>

        {/* 공휴일 지표 기준 스위치 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500">
            꺾은선 휴일 기준:
          </span>
          <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setHolidayMetric("public")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                holidayMetric === "public"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-stone-600"
              }`}
            >
              법정공휴일(특일) 수
            </button>
            <button
              type="button"
              onClick={() => setHolidayMetric("redDays")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                holidayMetric === "redDays"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-stone-600"
              }`}
            >
              주말+공휴일 총 휴일 수
            </button>
          </div>
        </div>
      </div>

      {/* 차트 1: 월별 매출(막대) + 공휴일 수(꺾은선) 복합 차트 */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-800" />
              <h3 className="text-base font-bold text-stone-900">
                {selectedBranch === "ALL"
                  ? "전체 지점 월별 매출 비교 (막대) & 월별 공휴일 수 (꺾은선) 복합 차트"
                  : `${selectedBranch} 월별 매출 추이 (막대) & 월별 공휴일 수 (꺾은선) 복합 차트`}
              </h3>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              막대 위에 마우스를 올리면 지점별{" "}
              <strong className="font-semibold text-stone-800">
                매출액 · 객수 · 객당 매출액(객단가)
              </strong>
              과 해당 월의 공휴일 내역을 함께 확인할 수 있습니다.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            <CalendarDays className="h-3.5 w-3.5" />
            {holidaySource === "public_data_api"
              ? "공공데이터포털 특일 API 실시간 연동"
              : "2026 대한민국 공휴일/특일 데이터 연동 (서버 Route Handler)"}
          </span>
        </div>

        <div className="mt-6 h-[390px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {selectedBranch === "ALL" ? (
              <ComposedChart
                data={monthlyChartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e7e5e4"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#44403c", fontWeight: 600 }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`}
                  tick={{ fontSize: 12, fill: "#57534e" }}
                  width={75}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, "auto"]}
                  tickFormatter={(v) => `${v}일`}
                  tick={{ fontSize: 12, fill: "#dc2626", fontWeight: 600 }}
                  width={48}
                />
                <Tooltip content={renderAllBranchesTooltip} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                {BRANCHES.map((branch) => (
                  <Bar
                    key={branch}
                    yAxisId="left"
                    dataKey={`${branch}_sales`}
                    name={branch}
                    fill={BRANCH_COLORS[branch]}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                ))}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="holidayCount"
                  name={
                    holidayMetric === "public"
                      ? "월간 법정공휴일 수(일)"
                      : "월간 주말+공휴일 수(일)"
                  }
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={monthlyChartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e7e5e4"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#44403c", fontWeight: 600 }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`}
                  tick={{ fontSize: 12, fill: "#57534e" }}
                  width={75}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, "auto"]}
                  tickFormatter={(v) => `${v}일`}
                  tick={{ fontSize: 12, fill: "#dc2626", fontWeight: 600 }}
                  width={48}
                />
                <Tooltip content={renderSingleBranchTooltip} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                <Bar
                  yAxisId="left"
                  dataKey="totalSales"
                  name={`${selectedBranch} 월 매출액`}
                  fill={BRANCH_COLORS[selectedBranch]}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={56}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="holidayCount"
                  name={
                    holidayMetric === "public"
                      ? "월간 법정공휴일 수(일)"
                      : "월간 주말+공휴일 수(일)"
                  }
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* 월별 공휴일 요약 바 */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {monthlyChartData.map((m) => (
            <div
              key={m.month}
              className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-2.5 text-xs"
            >
              <div className="flex items-center justify-between font-bold text-stone-800">
                <span>{m.month}</span>
                <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                  공휴일 {m.publicHolidayCount}일
                </span>
              </div>
              <p
                className="mt-1 truncate text-[11px] text-stone-500"
                title={m.holidayNames}
              >
                {m.holidayNames}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-stone-600">
                주말+공휴일 총 {m.totalRedDays}일
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 차트 2: 평균 객당 매출액(객단가) 추이 및 단일 지점 특이사항 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-800" />
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {selectedBranch === "ALL"
                    ? "5개 지점 월별 평균 객당 매출액(객단가) 비교 추이"
                    : `${selectedBranch} 월별 평균 객당 매출액(객단가) 및 객수 추이`}
                </h3>
                <p className="text-xs text-stone-500">
                  DB에 별도 저장하지 않고 실시간으로 계산된{" "}
                  <code>sales_amount ÷ customer_count</code> 지표입니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {selectedBranch === "ALL" ? (
                <ComposedChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e7e5e4"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#44403c", fontWeight: 600 }}
                  />
                  <YAxis
                    domain={["dataMin - 200", "dataMax + 200"]}
                    tickFormatter={(v) => `${v.toLocaleString()}원`}
                    tick={{ fontSize: 12, fill: "#57534e" }}
                    width={75}
                  />
                  <Tooltip content={renderAllBranchesTooltip} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  {BRANCHES.map((branch) => (
                    <Line
                      key={branch}
                      type="monotone"
                      dataKey={`${branch}_unitPrice`}
                      name={`${branch} 객단가`}
                      stroke={BRANCH_COLORS[branch]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  ))}
                </ComposedChart>
              ) : (
                <ComposedChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e7e5e4"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#44403c", fontWeight: 600 }}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={["dataMin - 200", "dataMax + 200"]}
                    tickFormatter={(v) => `${v.toLocaleString()}원`}
                    tick={{ fontSize: 12, fill: "#b45309", fontWeight: 600 }}
                    width={75}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${v.toLocaleString()}명`}
                    tick={{ fontSize: 12, fill: "#57534e" }}
                    width={68}
                  />
                  <Tooltip content={renderSingleBranchTooltip} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar
                    yAxisId="right"
                    dataKey="totalCustomers"
                    name="방문 객수(명)"
                    fill="#d6d3d1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgUnitPrice"
                    name="평균 객당 매출액(원)"
                    stroke={BRANCH_COLORS[selectedBranch]}
                    strokeWidth={3}
                    dot={{ r: 5, fill: BRANCH_COLORS[selectedBranch] }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        {/* 우측: 지점별 특이사항(비고) 및 주요 이슈 브리핑 */}
        <section className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3.5">
              <Info className="h-5 w-5 text-amber-800" />
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {selectedBranch === "ALL"
                    ? "전체 지점 특이사항(비고) 기록"
                    : `${selectedBranch} 특이사항 히스토리`}
                </h3>
                <p className="text-xs text-stone-500">
                  클릭하면 해당 데이터를 즉시 불러와 수정할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {(selectedBranch === "ALL"
                ? records.filter((r) => Boolean(r.remarks))
                : singleBranchRemarks
              ).length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
                  등록된 특이사항(비고)이 없습니다.
                </div>
              ) : (
                (selectedBranch === "ALL"
                  ? records.filter((r) => Boolean(r.remarks))
                  : singleBranchRemarks
                ).map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectEditRecord(rec)}
                    className="w-full rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: BRANCH_COLORS[rec.branch_name],
                          }}
                        />
                        {rec.branch_name} ({rec.period})
                      </span>
                      <span className="text-[11px] font-medium text-amber-800">
                        객단가 {rec.unit_price.toLocaleString()}원
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-amber-950">
                      “{rec.remarks}”
                    </p>
                    <p className="mt-1 text-[11px] text-stone-500">
                      매출 {(rec.sales_amount / 10000).toLocaleString()}만 원 · 객수{" "}
                      {rec.customer_count.toLocaleString()}명 (클릭하여 수정)
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-stone-100/80 p-3 text-[11px] leading-relaxed text-stone-600">
            💡 <strong>경영진 인사이트 요약:</strong> 한남점은 6월 매장 리뉴얼 오픈
            이후 매출이 4,641만 → 5,201만 원으로 급증했으며, 효창공원점은 7월 앞
            도로 공사 시작 이후 방문 객수 감소가 관찰됩니다.
          </div>
        </section>
      </div>

      {/* 차트 3: 일별 데이터 차트 (주말 및 공휴일 빨간색 배경 음영 강조) */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-red-600" />
              <h3 className="text-base font-bold text-stone-900">
                일별 매출 및 객당 매출액 추이 차트 (주말 · 공휴일 빨간색 음영 강조)
              </h3>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              일별 매출 추이 확인 시{" "}
              <strong className="font-semibold text-red-600">
                주말(토·일) 및 법정공휴일에 해당하는 날짜의 차트 배경에 빨간색 음영
              </strong>
              을 표시하여 휴일 영향을 직관적으로 구분합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 단일 지점 모드가 아닐 때 일별 차트 대상 지점 선택 */}
            {selectedBranch === "ALL" && (
              <div className="flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-stone-500" />
                <select
                  aria-label="일별 차트 조회 지점 선택"
                  value={dailyTargetBranch}
                  onChange={(e) =>
                    setDailyTargetBranch(e.target.value as BranchName)
                  }
                  className="rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <select
              aria-label="일별 차트 조회 월 선택"
              value={selectedDailyMonth}
              onChange={(e) => setSelectedDailyMonth(e.target.value)}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m} 일별 추이 보기
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 범례 배지 안내 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
              <span className="inline-block h-3 w-5 rounded-xs border border-red-300 bg-red-500/20" />
              빨간색 배경 음영 = 주말(토·일) 및 법정공휴일
            </span>
            {dailyChartBundle.monthlyRemark && (
              <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-900">
                📌 해당 월 지점 특이사항: {dailyChartBundle.monthlyRemark}
              </span>
            )}
          </div>
          <span className="text-[11px] text-stone-500">
            {dailyChartBundle.hasActualDaily
              ? "실제 입력된 일별 매출 데이터 포함"
              : `${effectiveDailyBranch} ${selectedDailyMonth} 월간 매출 기반 일별·휴일 가중치 분포 (일별 입력 시 즉시 실데이터 반영)`}
          </span>
        </div>

        <div className="mt-4 h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={dailyChartBundle.points}
              margin={{ top: 12, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e7e5e4"
              />
              {/* 주말 및 공휴일에 해당하는 날짜 배경에 빨간색 음영 처리 */}
              {dailyChartBundle.redZones.map((zone) => (
                <ReferenceArea
                  key={zone.startLabel}
                  x1={zone.startLabel}
                  x2={zone.endLabel}
                  yAxisId="left"
                  fill="#ef4444"
                  fillOpacity={0.16}
                  stroke="#fca5a5"
                  strokeOpacity={0.5}
                />
              ))}
              <XAxis
                dataKey="dayLabel"
                interval={1}
                tick={{ fontSize: 10, fill: "#57534e" }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => `${Math.round(v / 10000).toLocaleString()}만`}
                tick={{ fontSize: 11, fill: "#57534e" }}
                width={65}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={["dataMin - 300", "dataMax + 300"]}
                tickFormatter={(v) => `${v.toLocaleString()}원`}
                tick={{ fontSize: 11, fill: "#b45309" }}
                width={70}
              />
              <Tooltip content={renderDailyTooltip} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Bar
                yAxisId="left"
                dataKey="sales_amount"
                name={`${effectiveDailyBranch} 일별 매출액(원)`}
                fill={BRANCH_COLORS[effectiveDailyBranch]}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="unit_price"
                name="일별 평균 객당 매출액(원)"
                stroke="#1c1917"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#1c1917" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
