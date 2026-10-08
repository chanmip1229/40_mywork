'use client';

import React, { useMemo, useState } from 'react';
import { ViolationResult } from '@/lib/types';
import {
  Table,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Copy,
} from 'lucide-react';

interface ExpenseTableProps {
  items: ViolationResult[];
  onOpenRejectModal: () => void;
}

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  식대: 'bg-amber-50 text-amber-800 border-amber-200',
  택시: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  교통비: 'bg-sky-50 text-sky-700 border-sky-200',
  소모품: 'bg-teal-50 text-teal-700 border-teal-200',
  접대비: 'bg-purple-50 text-purple-700 border-purple-200',
  회의비: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  자재: 'bg-slate-100 text-slate-700 border-slate-300',
};

export default function ExpenseTable({
  items,
  onOpenRejectModal,
}: ExpenseTableProps) {
  const [showViolationsOnly, setShowViolationsOnly] = useState(false);

  const violationCount = useMemo(
    () => items.filter((item) => item.isViolation).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!showViolationsOnly) return items;
    return items.filter((item) => item.isViolation);
  }, [items, showViolationsOnly]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-xs">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Table className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">표시할 경비 내역이 없습니다</h3>
        <p className="mt-1 text-sm text-slate-500">
          상단 업로드 영역에 경비 내역 CSV 파일을 드래그 앤 드롭하면 실시간 테이블 및 규정 위반 검증 결과가 표시됩니다.
        </p>
      </div>
    );
  }

  const displayedTotalAmount = filteredItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <section
      aria-label="경비 내역 및 규정 검증 데이터 테이블"
      className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900">경비 정산 내역 및 규정 검증</h2>
            {violationCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                위반 {violationCount}건 검출
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                전체 적격
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {showViolationsOnly ? '필터링된 위반 내역 ' : '전체 내역 '}
            <span className="font-semibold text-slate-800">{filteredItems.length}건</span> · 합계 금액{' '}
            <span className="font-semibold text-slate-800">
              {displayedTotalAmount.toLocaleString('ko-KR')}원
            </span>
          </p>
        </div>

        {/* 3.4 필터링 토글 및 제출자별 반려 사유 원클릭 복사 버튼 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={showViolationsOnly}
            onClick={() => setShowViolationsOnly((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              showViolationsOnly
                ? 'border-rose-300 bg-rose-600 text-white shadow-xs'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>위반 건만 보기</span>
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                showViolationsOnly
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {violationCount}
            </span>
          </button>

          {violationCount > 0 && (
            <button
              type="button"
              onClick={onOpenRejectModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>제출자별 반려 사유 복사</span>
            </button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">
          조건에 해당하는 규정 위반 내역이 없습니다.
        </div>
      ) : (
        <div className="expense-table-wrapper">
          <table className="expense-table w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap border-b border-slate-200">
                  번호 / 제출자
                </th>
                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap border-b border-slate-200">
                  부서
                </th>
                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap border-b border-slate-200">
                  사용일시
                </th>
                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap border-b border-slate-200">
                  항목
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap border-b border-slate-200">
                  가맹점
                </th>
                <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap border-b border-slate-200">
                  금액
                </th>
                <th scope="col" className="px-3 py-3.5 text-center whitespace-nowrap border-b border-slate-200">
                  인원
                </th>
                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap border-b border-slate-200">
                  증빙
                </th>
                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap border-b border-slate-200">
                  품의번호
                </th>
                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap border-b border-slate-200">
                  제출일
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap border-b border-slate-200">
                  메모
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap border-b border-slate-200">
                  규정 검증 및 위반 사유
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => {
                const badgeClass =
                  CATEGORY_BADGE_STYLES[item.category] ??
                  'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <tr
                    key={`${item.id}-${item.submitter}-${item.usedDate}-${item.amount}`}
                    className={
                      item.isViolation
                        ? 'is-violation bg-rose-50/70 transition-colors hover:bg-rose-100/60'
                        : 'transition-colors hover:bg-slate-50/90'
                    }
                  >
                    <th
                      scope="row"
                      className={`px-4 py-3.5 font-semibold whitespace-nowrap ${
                        item.isViolation
                          ? 'border-l-4 border-l-rose-500 text-rose-950'
                          : 'text-slate-900'
                      }`}
                    >
                      <span
                        className={`mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 font-mono text-xs ${
                          item.isViolation
                            ? 'bg-rose-200/80 font-bold text-rose-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{item.id}
                      </span>
                      {item.submitter || <span className="text-rose-500">미기재</span>}
                    </th>
                    <td className="px-3.5 py-3.5 whitespace-nowrap text-slate-600">
                      {item.department || <span className="text-rose-400 text-xs">미기재</span>}
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-700">
                      {item.usedDate ? (
                        <>
                          <span>{item.usedDate}</span>
                          {item.usedTime ? (
                            <span className="ml-1.5 text-slate-500">{item.usedTime}</span>
                          ) : (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-amber-800">
                              시각 누락
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-sans text-xs text-rose-400">미기재</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      {item.category ? (
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                        >
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-xs text-rose-400">미기재</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      {item.merchant || <span className="text-xs font-normal text-rose-400">미기재</span>}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-semibold whitespace-nowrap ${
                        item.isViolation ? 'text-rose-700' : 'text-slate-900'
                      }`}
                    >
                      {item.amount > 0 ? (
                        `${item.amount.toLocaleString('ko-KR')}원`
                      ) : (
                        <span className="font-sans text-xs font-semibold text-rose-500">
                          금액 누락
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap text-slate-600">
                      {item.headcount}명
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      {item.receiptType ? (
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                            item.receiptType === '간이영수증'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.receiptType}
                        </span>
                      ) : (
                        <span className="text-xs text-rose-400">미기재</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                      {item.approvalNumber || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-500">
                      {item.submittedDate || <span className="font-sans text-xs text-rose-400">미기재</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {item.memo || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3.5 min-w-72">
                      {item.isViolation ? (
                        <div className="flex flex-col gap-1.5">
                          {item.violations.map((v, idx) => {
                            const isMissingField = v.clause === '필수항목';
                            return (
                              <div
                                key={`${item.id}-${v.clause}-${idx}`}
                                className={`rounded-lg border px-2.5 py-1.5 ${
                                  isMissingField
                                    ? 'border-amber-300 bg-amber-50/90'
                                    : 'border-rose-200 bg-rose-100/70'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold text-white ${
                                      isMissingField ? 'bg-amber-600' : 'bg-rose-600'
                                    }`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {isMissingField ? '필수값 누락' : `${v.clause} 위반`}
                                  </span>
                                  <span
                                    className={`text-xs font-bold ${
                                      isMissingField ? 'text-amber-950' : 'text-rose-900'
                                    }`}
                                  >
                                    {v.title}
                                  </span>
                                </div>
                                <p
                                  className={`mt-1 text-xs leading-relaxed ${
                                    isMissingField ? 'text-amber-900' : 'text-rose-800'
                                  }`}
                                >
                                  {v.reason}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          적격
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
