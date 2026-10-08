"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AccessControlWrapper from "@/components/AccessControlWrapper";
import SalesInputPanel from "@/components/SalesInputPanel";
import DashboardCharts from "@/components/DashboardCharts";
import {
  BRANCHES,
  BRANCH_COLORS,
  BranchName,
  RawSalesRow,
  SalesRecord,
  isSupabaseConfigured,
  supabase,
  toSalesRecord,
} from "@/lib/supabase";
import {
  DayCalendarInfo,
  KOREA_HOLIDAYS_2026,
  MonthlyHolidaySummary,
  getMonthCalendar,
  getMonthlyHolidaySummary,
} from "@/lib/holidays";
import {
  Award,
  Calculator,
  Edit3,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from "lucide-react";

export default function SalesDashboardPage() {
  const [activeRole, setActiveRole] = useState<"executive" | "manager">(
    "manager"
  );
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchName | "ALL">(
    "ALL"
  );
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  const [tableSearchMonth, setTableSearchMonth] = useState<string>("ALL");

  const [holidaySummaries, setHolidaySummaries] = useState<
    MonthlyHolidaySummary[]
  >(() =>
    Array.from({ length: 12 }, (_, i) =>
      getMonthlyHolidaySummary(2026, i + 1, KOREA_HOLIDAYS_2026)
    )
  );
  const [calendars, setCalendars] = useState<Record<string, DayCalendarInfo[]>>(
    () => {
      const map: Record<string, DayCalendarInfo[]> = {};
      for (let m = 1; m <= 12; m++) {
        const key = `2026-${String(m).padStart(2, "0")}`;
        map[key] = getMonthCalendar(2026, m, KOREA_HOLIDAYS_2026);
      }
      return map;
    }
  );
  const [holidaySource, setHolidaySource] = useState<
    "public_data_api" | "builtin_2026_official"
  >("public_data_api");

  const formRef = useRef<HTMLDivElement>(null);

  const fetchSalesRecords = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!isSupabaseConfigured) {
        setLoadError("불러오지 못했습니다");
        setRecords([]);
        return;
      }

      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("월", { ascending: true })
        .order("id", { ascending: true });

      if (error || !data) {
        setLoadError("불러오지 못했습니다");
        setRecords([]);
        return;
      }

      const mapped = ((data as RawSalesRow[]) || []).map(toSalesRecord);
      setRecords(mapped);
    } catch (err) {
      console.error("Failed to fetch sales data:", err);
      setLoadError("불러오지 못했습니다");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHolidaysFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/holidays?year=2026", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.summaries) setHolidaySummaries(data.summaries);
      if (data.calendars) setCalendars(data.calendars);
      if (data.source) setHolidaySource(data.source);
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
    }
  }, []);

  useEffect(() => {
    fetchSalesRecords();
    fetchHolidaysFromServer();
  }, [fetchSalesRecords, fetchHolidaysFromServer]);

  const handleSaveRecord = async (payload: {
    id?: number;
    period: string;
    branch_name: BranchName;
    sales_amount: number;
    customer_count: number;
    remarks: string;
  }) => {
    const dbRow = {
      월: payload.period,
      지점: payload.branch_name,
      매출액: payload.sales_amount,
      객수: payload.customer_count,
      비고: payload.remarks || null,
    };

    if (payload.id) {
      const { error } = await supabase
        .from("sales")
        .update(dbRow)
        .eq("id", payload.id);
      if (error) throw new Error(error.message);
    } else {
      const existing = records.find(
        (r) =>
          r.branch_name === payload.branch_name && r.period === payload.period
      );
      if (existing) {
        const { error } = await supabase
          .from("sales")
          .update(dbRow)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("sales").insert([dbRow]);
        if (error) throw new Error(error.message);
      }
    }

    await fetchSalesRecords();
  };

  const handleBulkInsert = async (
    rows: Array<{
      period: string;
      branch_name: BranchName;
      sales_amount: number;
      customer_count: number;
      remarks: string;
    }>
  ) => {
    for (const row of rows) {
      const existing = records.find(
        (r) => r.branch_name === row.branch_name && r.period === row.period
      );
      const dbRow = {
        월: row.period,
        지점: row.branch_name,
        매출액: row.sales_amount,
        객수: row.customer_count,
        비고: row.remarks || null,
      };
      if (existing) {
        const { error } = await supabase
          .from("sales")
          .update(dbRow)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("sales").insert([dbRow]);
        if (error) throw new Error(error.message);
      }
    }
    await fetchSalesRecords();
  };

  const handleSelectEditRecord = (record: SalesRecord) => {
    setEditingRecord(record);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedBranch !== "ALL" && r.branch_name !== selectedBranch) {
        return false;
      }
      if (tableSearchMonth !== "ALL" && r.month !== tableSearchMonth) {
        return false;
      }
      return true;
    });
  }, [records, selectedBranch, tableSearchMonth]);

  const kpiStats = useMemo(() => {
    const scopeRecords =
      selectedBranch === "ALL"
        ? records
        : records.filter((r) => r.branch_name === selectedBranch);

    const totalSales = scopeRecords.reduce((acc, r) => acc + r.sales_amount, 0);
    const totalCustomers = scopeRecords.reduce(
      (acc, r) => acc + r.customer_count,
      0
    );
    const avgUnitPrice =
      totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0;

    const branchTotals = BRANCHES.map((branch) => {
      const sum = records
        .filter((r) => r.branch_name === branch)
        .reduce((acc, r) => acc + r.sales_amount, 0);
      return { branch, sum };
    }).sort((a, b) => b.sum - a.sum);

    return {
      totalSales,
      totalCustomers,
      avgUnitPrice,
      recordCount: scopeRecords.length,
      topBranch: branchTotals[0],
    };
  }, [records, selectedBranch]);

  const distinctMonths = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.month))).sort();
  }, [records]);

  return (
    <AccessControlWrapper
      activeRole={activeRole}
      onRoleChange={setActiveRole}
    >
      <div className="space-y-6">
        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {loadError}
          </div>
        )}

        {/* 상단 핵심 요약 KPI 카드 4종 */}
        <section
          aria-label="핵심 성과 지표 요약"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">
                {selectedBranch === "ALL"
                  ? "전체 지점 누적 매출액"
                  : `${selectedBranch} 누적 매출액`}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-stone-900">
              {loadError
                ? "불러오지 못했습니다"
                : `${(kpiStats.totalSales / 100000000).toFixed(2)}억 원`}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {loadError
                ? "-"
                : `정확히 ${kpiStats.totalSales.toLocaleString()}원 (${kpiStats.recordCount}건 집계)`}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">
                {selectedBranch === "ALL"
                  ? "전체 지점 누적 방문 객수"
                  : `${selectedBranch} 누적 방문 객수`}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-stone-900">
              {loadError
                ? "불러오지 못했습니다"
                : `${kpiStats.totalCustomers.toLocaleString()}명`}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {loadError
                ? "-"
                : `건당 평균 ${
                    kpiStats.recordCount > 0
                      ? Math.round(
                          kpiStats.totalCustomers / kpiStats.recordCount
                        ).toLocaleString()
                      : 0
                  }명 방문`}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">
                평균 객당 매출액 (객단가)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-800 text-white">
                <Calculator className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-amber-950">
              {loadError
                ? "불러오지 못했습니다"
                : `${kpiStats.avgUnitPrice.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-amber-800">
              실시간 계산 (총 매출액 ÷ 총 객수)
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">
                최고 매출 지점 (Top Branch)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-stone-900">
              {loadError
                ? "불러오지 못했습니다"
                : kpiStats.topBranch?.branch || "-"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              누적{" "}
              {!loadError && kpiStats.topBranch
                ? `${(kpiStats.topBranch.sum / 10000).toLocaleString()}만 원`
                : "-"}
            </p>
          </div>
        </section>

        {/* PRD 2.2: 데이터 입력 및 관리 패널 */}
        {activeRole === "manager" && (
          <div ref={formRef}>
            <SalesInputPanel
              records={records}
              editingRecord={editingRecord}
              selectedBranchFilter={selectedBranch}
              onSaveRecord={handleSaveRecord}
              onBulkInsert={handleBulkInsert}
              onCancelEdit={() => setEditingRecord(null)}
              onSelectEditRecord={handleSelectEditRecord}
            />
          </div>
        )}

        {/* PRD 2.3: 대시보드 시각화 차트 영역 */}
        <DashboardCharts
          records={records}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          holidaySummaries={holidaySummaries}
          calendars={calendars}
          holidaySource={holidaySource}
          onSelectEditRecord={handleSelectEditRecord}
        />

        {activeRole === "executive" && (
          <div ref={formRef}>
            <SalesInputPanel
              records={records}
              editingRecord={editingRecord}
              selectedBranchFilter={selectedBranch}
              onSaveRecord={handleSaveRecord}
              onBulkInsert={handleBulkInsert}
              onCancelEdit={() => setEditingRecord(null)}
              onSelectEditRecord={handleSelectEditRecord}
            />
          </div>
        )}

        {/* 하단: 전체 매출 데이터 테이블 및 즉시 수정 선택 */}
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Supabase `sales` 테이블 실시간 데이터 내역 ({filteredRecords.length}건)
              </h2>
              <p className="text-xs text-stone-500">
                오타나 수정할 내역이 있으면 우측의 <strong>[수정]</strong> 버튼을
                눌러 즉시 수정할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-stone-400" />
                <select
                  aria-label="테이블 기준월 필터"
                  value={tableSearchMonth}
                  onChange={(e) => setTableSearchMonth(e.target.value)}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800"
                >
                  <option value="ALL">전체 기간 보기</option>
                  {distinctMonths.map((m) => (
                    <option key={m} value={m}>
                      {m} 데이터만 보기
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchSalesRecords}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                새로고침
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                  <th className="px-3.5 py-3 font-semibold">기준월/일자</th>
                  <th className="px-3.5 py-3 font-semibold">지점명</th>
                  <th className="px-3.5 py-3 text-right font-semibold">
                    총 매출액 (원)
                  </th>
                  <th className="px-3.5 py-3 text-right font-semibold">
                    방문 객수 (명)
                  </th>
                  <th className="px-3.5 py-3 text-right font-semibold text-amber-900">
                    객당 매출액 (자동계산)
                  </th>
                  <th className="px-3.5 py-3 font-semibold">특이사항 (비고)</th>
                  <th className="px-3.5 py-3 text-center font-semibold">
                    데이터 수정
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-stone-400"
                    >
                      Supabase에서 데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm font-semibold text-red-600"
                    >
                      {loadError}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-stone-400"
                    >
                      조건에 해당하는 매출 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      className={`transition hover:bg-amber-50/40 ${
                        editingRecord?.id === rec.id ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="px-3.5 py-3 font-semibold text-stone-800">
                        {rec.period}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-stone-900">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                BRANCH_COLORS[rec.branch_name] || "#78716c",
                            }}
                          />
                          {rec.branch_name}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-semibold text-stone-900">
                        {rec.sales_amount.toLocaleString()}원
                      </td>
                      <td className="px-3.5 py-3 text-right text-stone-700">
                        {rec.customer_count.toLocaleString()}명
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-amber-900">
                        {rec.unit_price.toLocaleString()}원
                      </td>
                      <td className="px-3.5 py-3 text-stone-600">
                        {rec.remarks ? (
                          <span className="inline-flex items-center rounded-md bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                            {rec.remarks}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectEditRecord(rec)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-2xs transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900"
                        >
                          <Edit3 className="h-3 w-3" />
                          수정
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AccessControlWrapper>
  );
}
