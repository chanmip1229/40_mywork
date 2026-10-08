"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BRANCHES,
  BranchName,
  SalesRecord,
  SEPTEMBER_2026_REPORT_PRESET,
} from "@/lib/supabase";
import {
  Calculator,
  Calendar,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  FolderOpen,
  MessageSquarePlus,
  PlusCircle,
  RotateCcw,
  Save,
  Store,
  Upload,
} from "lucide-react";

interface SalesInputPanelProps {
  records: SalesRecord[];
  editingRecord: SalesRecord | null;
  selectedBranchFilter: BranchName | "ALL";
  onSaveRecord: (payload: {
    id?: number;
    period: string;
    branch_name: BranchName;
    sales_amount: number;
    customer_count: number;
    remarks: string;
  }) => Promise<void>;
  onBulkInsert: (
    rows: Array<{
      period: string;
      branch_name: BranchName;
      sales_amount: number;
      customer_count: number;
      remarks: string;
    }>
  ) => Promise<void>;
  onCancelEdit: () => void;
  onSelectEditRecord: (record: SalesRecord) => void;
}

export default function SalesInputPanel({
  records,
  editingRecord,
  selectedBranchFilter,
  onSaveRecord,
  onBulkInsert,
  onCancelEdit,
  onSelectEditRecord,
}: SalesInputPanelProps) {
  const [inputMode, setInputMode] = useState<"date" | "month">("date");
  const [branchName, setBranchName] = useState<BranchName>(
    selectedBranchFilter === "ALL" ? "용산역점" : selectedBranchFilter
  );
  const [dateValue, setDateValue] = useState<string>("2026-09-30");
  const [monthValue, setMonthValue] = useState<string>("2026-09");
  const [salesAmountStr, setSalesAmountStr] = useState<string>("54320000");
  const [customerCountStr, setCustomerCountStr] = useState<string>("6820");
  const [remarks, setRemarks] = useState<string>("");
  const [recordId, setRecordId] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  // 선택된 지점의 기존 데이터 목록 (최신순 정렬) - 지점을 선택해 기존 데이터를 바로 불러와 수정 가능
  const branchHistoryRecords = useMemo(() => {
    return records
      .filter((r) => r.branch_name === branchName)
      .sort((a, b) => b.period.localeCompare(a.period));
  }, [records, branchName]);

  // 상단 지점 필터 변경 시 동기화
  useEffect(() => {
    if (!editingRecord && selectedBranchFilter !== "ALL") {
      setBranchName(selectedBranchFilter);
    }
  }, [selectedBranchFilter, editingRecord]);

  // 수정할 레코드 선택 시 폼에 즉시 세팅
  useEffect(() => {
    if (editingRecord) {
      setRecordId(editingRecord.id);
      setBranchName(editingRecord.branch_name);
      if (editingRecord.isDaily) {
        setInputMode("date");
        setDateValue(editingRecord.period);
        setMonthValue(editingRecord.month);
      } else {
        setInputMode("month");
        setMonthValue(editingRecord.period);
        setDateValue(`${editingRecord.period}-01`);
      }
      setSalesAmountStr(String(editingRecord.sales_amount));
      setCustomerCountStr(String(editingRecord.customer_count));
      setRemarks(editingRecord.remarks || "");
      setFeedback({
        type: "info",
        message: `[데이터 수정 모드] ${editingRecord.branch_name} (${editingRecord.period}) 기존 데이터를 불러왔습니다. 값을 수정한 뒤 저장을 눌러 주세요.`,
      });
    }
  }, [editingRecord]);

  const activePeriod =
    inputMode === "date" ? dateValue.slice(0, 7) : monthValue;
  const exactMatchedRecord = records.find(
    (r) =>
      r.branch_name === branchName &&
      (r.period === (inputMode === "date" ? dateValue : monthValue) ||
        r.period === activePeriod)
  );

  const salesAmount = Number(salesAmountStr.replace(/,/g, "")) || 0;
  const customerCount = Number(customerCountStr.replace(/,/g, "")) || 0;
  // PRD 2.2 자동 계산 지표 (객단가): 매출액 ÷ 객수 실시간 계산
  const calculatedUnitPrice =
    customerCount > 0 ? Math.round(salesAmount / customerCount) : 0;

  const resetForm = () => {
    setRecordId(undefined);
    setSalesAmountStr("");
    setCustomerCountStr("");
    setRemarks("");
    setFeedback(null);
    onCancelEdit();
  };

  // 지점 변경 시 해당 지점의 가장 최근 데이터를 불러오거나 안내
  const handleBranchChange = (newBranch: BranchName) => {
    setBranchName(newBranch);
    const match = records.find(
      (r) => r.branch_name === newBranch && r.month === activePeriod
    );
    if (match) {
      setRecordId(match.id);
      setSalesAmountStr(String(match.sales_amount));
      setCustomerCountStr(String(match.customer_count));
      setRemarks(match.remarks || "");
      setFeedback({
        type: "info",
        message: `${newBranch}의 ${match.period} 기존 데이터를 자동으로 불러왔습니다. 바로 수정하거나 새 날짜를 선택해 입력할 수 있습니다.`,
      });
    } else {
      setRecordId(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const savePeriod =
      inputMode === "month"
        ? monthValue
        : exactMatchedRecord && !exactMatchedRecord.isDaily
        ? exactMatchedRecord.period
        : dateValue;

    if (!savePeriod || salesAmount <= 0 || customerCount <= 0) {
      setFeedback({
        type: "error",
        message:
          "날짜(Date picker), 매출액(1원 이상), 객수(1명 이상)를 모두 입력해 주세요.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const targetId = recordId ?? exactMatchedRecord?.id;
      await onSaveRecord({
        id: targetId,
        period: savePeriod,
        branch_name: branchName,
        sales_amount: salesAmount,
        customer_count: customerCount,
        remarks: remarks.trim(),
      });

      setFeedback({
        type: "success",
        message: targetId
          ? `✅ [수정 완료] ${branchName} (${savePeriod}) 데이터가 매출 ${salesAmount.toLocaleString()}원, 객수 ${customerCount.toLocaleString()}명(객당 매출액 ${calculatedUnitPrice.toLocaleString()}원)으로 수정되었습니다.`
          : `✅ [등록 완료] ${branchName} (${savePeriod}) 신규 데이터가 등록되었습니다. (객당 매출액 ${calculatedUnitPrice.toLocaleString()}원)`,
      });
      setRecordId(undefined);
      onCancelEdit();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "데이터 저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 9월 단톡방 보고분 단건 폼 채우기
  const handleFillSeptemberBranch = (
    item: (typeof SEPTEMBER_2026_REPORT_PRESET)[number]
  ) => {
    const existing = records.find(
      (r) => r.branch_name === item.branch_name && r.period === item.period
    );
    setRecordId(existing?.id);
    setBranchName(item.branch_name);
    setMonthValue(item.period);
    setDateValue(`${item.period}-30`);
    setSalesAmountStr(String(item.sales_amount));
    setCustomerCountStr(String(item.customer_count));
    setRemarks(item.remarks);
    setFeedback({
      type: "info",
      message: `${item.branch_name} 점장님의 9월 단톡방 보고 내용(${item.reported_at})을 불러왔습니다. 객당 매출액은 ${Math.round(
        item.sales_amount / item.customer_count
      ).toLocaleString()}원입니다.`,
    });
  };

  // 9월 단톡방 보고분 5개 지점 일괄 DB 반영
  const handleBulkSaveSeptemberReport = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      await onBulkInsert(
        SEPTEMBER_2026_REPORT_PRESET.map((item) => ({
          period: item.period,
          branch_name: item.branch_name,
          sales_amount: item.sales_amount,
          customer_count: item.customer_count,
          remarks: item.remarks,
        }))
      );
      setFeedback({
        type: "success",
        message:
          "✅ 9월 지점장 단톡방 매출 보고(5개 지점 전체)가 Supabase sales 테이블에 반영되었습니다!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "9월 데이터 일괄 저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // CSV 파일 일괄 업로드 처리 (PRD 2.4)
  const handleCsvFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setFeedback({
          type: "error",
          message: "CSV 파일에 데이터 행이 없습니다.",
        });
        return;
      }

      const parsedRows: Array<{
        period: string;
        branch_name: BranchName;
        sales_amount: number;
        customer_count: number;
        remarks: string;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (cols.length < 4) continue;
        const period = cols[0].trim();
        const branch = cols[1].trim() as BranchName;
        const sales = Number(cols[2].trim()) || 0;
        const customers = Number(cols[3].trim()) || 0;
        const note = cols.slice(4).join(",").trim();

        if (period && BRANCHES.includes(branch) && sales > 0 && customers > 0) {
          parsedRows.push({
            period,
            branch_name: branch,
            sales_amount: sales,
            customer_count: customers,
            remarks: note,
          });
        }
      }

      if (parsedRows.length === 0) {
        setFeedback({
          type: "error",
          message:
            "유효한 CSV 데이터를 찾을 수 없습니다. (형식: 월,지점,매출액,객수,비고)",
        });
        return;
      }

      setSubmitting(true);
      await onBulkInsert(parsedRows);
      setFeedback({
        type: "success",
        message: `✅ CSV 파일에서 총 ${parsedRows.length}건의 데이터를 읽어와 Supabase에 반영했습니다.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "CSV 업로드 중 오류가 발생했습니다.",
      });
    } finally {
      setSubmitting(false);
      e.target.value = "";
    }
  };

  return (
    <section
      aria-label="PRD 2.2 데이터 입력 및 관리"
      className="rounded-2xl border-2 border-amber-700/20 bg-white p-5 shadow-sm sm:p-6"
    >
      {/* 헤더 영역 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 text-white shadow-xs">
            {recordId || exactMatchedRecord ? (
              <Edit3 className="h-5 w-5" />
            ) : (
              <PlusCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                기능 2.2
              </span>
              <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                {recordId
                  ? `지점 매출 데이터 수정 (${branchName} · #${recordId})`
                  : "지점별 매출 데이터 입력 및 수정"}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-stone-500">
              날짜(Date picker), 매출액, 객수, 특이사항을 입력하면{" "}
              <strong className="font-semibold text-amber-800">
                객당 매출액(매출액 ÷ 객수)
              </strong>
              이 실시간으로 계산되며, 기존 지점 데이터를 불러와 즉시 수정할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Date Picker 모드 전환 & CSV 업로드 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setInputMode("date")}
              className={`rounded-md px-2.5 py-1 font-semibold transition ${
                inputMode === "date"
                  ? "bg-white text-amber-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              날짜 선택 (Date Picker)
            </button>
            <button
              type="button"
              onClick={() => setInputMode("month")}
              className={`rounded-md px-2.5 py-1 font-semibold transition ${
                inputMode === "month"
                  ? "bg-white text-amber-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              월 단위 선택 (YYYY-MM)
            </button>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100">
            <Upload className="h-3.5 w-3.5 text-stone-500" />
            <span>CSV 일괄 업로드</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileUpload}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* 기존 데이터 불러오기 및 수정 바 (PRD 2.2 데이터 수정 요구사항) */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <FolderOpen className="h-4 w-4 text-amber-800" />
              [{branchName}] 기존 데이터 불러와 수정하기
            </span>
            <span className="text-[11px] text-stone-500">
              클릭하면 아래 입력창에 기존 데이터가 로드됩니다
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {branchHistoryRecords.length === 0 ? (
              <span className="text-xs text-stone-400">
                해당 지점의 저장된 데이터가 없습니다.
              </span>
            ) : (
              branchHistoryRecords.map((rec) => {
                const isSelected = recordId === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectEditRecord(rec)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      isSelected
                        ? "border-amber-700 bg-amber-800 text-white shadow-xs"
                        : "border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50"
                    }`}
                  >
                    <span>{rec.period}</span>
                    <span
                      className={`text-[11px] ${
                        isSelected ? "text-amber-100" : "text-stone-400"
                      }`}
                    >
                      ({(rec.sales_amount / 10000).toLocaleString()}만)
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 9월 지점장 단톡방 보고분 빠른 불러오기 */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
              <MessageSquarePlus className="h-4 w-4 text-amber-700" />
              [받은자료] 9월 지점장 단톡방 매출 보고분 (35건 동기화 완료)
            </span>
            <button
              type="button"
              disabled={submitting}
              onClick={handleBulkSaveSeptemberReport}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-800 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-amber-900 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3 w-3" />
              9월 전체 DB 동기화
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SEPTEMBER_2026_REPORT_PRESET.map((item) => {
              const alreadySaved = records.some(
                (r) =>
                  r.branch_name === item.branch_name && r.period === item.period
              );
              return (
                <button
                  key={item.branch_name}
                  type="button"
                  onClick={() => handleFillSeptemberBranch(item)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    alreadySaved
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-amber-200 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50"
                  }`}
                >
                  <span>{item.branch_name}</span>
                  <span className="text-[11px] text-stone-400">
                    {(item.sales_amount / 10000).toLocaleString()}만
                  </span>
                  {alreadySaved && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 메인 입력 폼 (PRD 2.2: 지점 선택, 날짜 Date picker, 매출액, 객수, 실시간 객단가, 특이사항) */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. 지점 선택 드롭다운 */}
          <div>
            <label
              htmlFor="branch-select"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700"
            >
              <Store className="h-3.5 w-3.5 text-stone-500" />
              지점 선택 (5개 지점)
            </label>
            <select
              id="branch-select"
              value={branchName}
              onChange={(e) => handleBranchChange(e.target.value as BranchName)}
              className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* 2. 날짜 (Date Picker) */}
          <div>
            <label
              htmlFor="period-input"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700"
            >
              <Calendar className="h-3.5 w-3.5 text-stone-500" />
              {inputMode === "date"
                ? "날짜 선택 (Date Picker)"
                : "기준 월 선택 (Month)"}
            </label>
            {inputMode === "date" ? (
              <input
                id="period-input"
                type="date"
                value={dateValue}
                onChange={(e) => {
                  setDateValue(e.target.value);
                  if (e.target.value) {
                    setMonthValue(e.target.value.slice(0, 7));
                  }
                }}
                required
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
              />
            ) : (
              <input
                id="period-input"
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
              />
            )}
          </div>

          {/* 3. 매출액 (숫자, 원 단위) */}
          <div>
            <label
              htmlFor="sales-amount-input"
              className="mb-1.5 block text-xs font-semibold text-stone-700"
            >
              매출액 (숫자, 원 단위)
            </label>
            <input
              id="sales-amount-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder="예: 54320000"
              value={salesAmountStr}
              onChange={(e) => setSalesAmountStr(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            />
            {salesAmount > 0 && (
              <p className="mt-1 text-[11px] font-medium text-stone-500">
                {salesAmount.toLocaleString()}원 ({(salesAmount / 10000).toLocaleString()}
                만 원)
              </p>
            )}
          </div>

          {/* 4. 객수 (숫자, 명 단위) */}
          <div>
            <label
              htmlFor="customer-count-input"
              className="mb-1.5 block text-xs font-semibold text-stone-700"
            >
              객수 (숫자, 명 단위)
            </label>
            <input
              id="customer-count-input"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="예: 6820"
              value={customerCountStr}
              onChange={(e) => setCustomerCountStr(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            />
            {customerCount > 0 && (
              <p className="mt-1 text-[11px] font-medium text-stone-500">
                방문객 {customerCount.toLocaleString()}명
              </p>
            )}
          </div>

          {/* 5. 자동 계산 지표 (객단가): 매출액 ÷ 객수 */}
          <div>
            <span className="mb-1.5 flex items-center gap-1 text-xs font-bold text-amber-900">
              <Calculator className="h-3.5 w-3.5 text-amber-700" />
              객당 매출액 (실시간 자동 계산)
            </span>
            <div
              aria-live="polite"
              className="flex h-11 items-center justify-between rounded-xl border-2 border-amber-400 bg-amber-50 px-3.5 text-base font-extrabold text-amber-950"
            >
              <span>
                {calculatedUnitPrice > 0
                  ? `${calculatedUnitPrice.toLocaleString()}원`
                  : "- 원"}
              </span>
              <span className="text-[11px] font-semibold text-amber-700">
                매출 ÷ 객수
              </span>
            </div>
            {calculatedUnitPrice > 0 && (
              <p className="mt-1 text-[11px] font-medium text-amber-800">
                {salesAmount.toLocaleString()} ÷ {customerCount.toLocaleString()}{" "}
                = 약 {calculatedUnitPrice.toLocaleString()}원/인
              </p>
            )}
          </div>
        </div>

        {/* 특이사항 입력창 및 저장/수정 버튼 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="remarks-input"
              className="mb-1.5 block text-xs font-semibold text-stone-700"
            >
              특이사항 (텍스트 입력창 — 예: &quot;추석 연휴 단축 영업&quot;, &quot;공사 진행&quot; 등)
            </label>
            <input
              id="remarks-input"
              type="text"
              placeholder='예: "추석 연휴 3일 단축 영업", "매장 리뉴얼 오픈", "앞 도로 공사 시작" 등'
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {exactMatchedRecord && !recordId && (
              <button
                type="button"
                onClick={() => onSelectEditRecord(exactMatchedRecord)}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                <Edit3 className="h-4 w-4" />
                기존 값 불러오기
              </button>
            )}

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              <RotateCcw className="h-4 w-4" />
              입력 초기화
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting
                ? "저장 중..."
                : recordId || exactMatchedRecord
                ? "기존 데이터 수정 저장"
                : "신규 매출 데이터 저장"}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={`rounded-xl px-4 py-3 text-xs font-semibold ${
              feedback.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : feedback.type === "error"
                ? "border border-red-200 bg-red-50 text-red-900"
                : "border border-amber-200 bg-amber-50 text-amber-950"
            }`}
          >
            {feedback.message}
          </div>
        )}
      </form>
    </section>
  );
}
