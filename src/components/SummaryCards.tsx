'use client';

import React, { useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { PolicyClause, ViolationResult } from '@/lib/types';
import {
  POLICY_CLAUSE_LIST,
  POLICY_RULES_META,
} from '@/constants/policyRules';

interface SummaryCardsProps {
  items: ViolationResult[];
}

export default function SummaryCards({ items }: SummaryCardsProps) {
  const stats = useMemo(() => {
    const totalCount = items.length;
    const violationItems = items.filter((item) => item.isViolation);
    const violationCount = violationItems.length;
    const validCount = totalCount - violationCount;

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const violationAmount = violationItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const validAmount = totalAmount - violationAmount;

    const clauseCounts: Record<PolicyClause, number> = {
      제5조: 0,
      제6조: 0,
      제7조: 0,
      제8조: 0,
      제9조: 0,
      필수항목: 0,
    };

    for (const item of items) {
      for (const v of item.violations) {
        clauseCounts[v.clause] = (clauseCounts[v.clause] ?? 0) + 1;
      }
    }

    return {
      totalCount,
      validCount,
      violationCount,
      totalAmount,
      validAmount,
      violationAmount,
      clauseCounts,
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  const validRatio =
    stats.totalCount > 0
      ? Math.round((stats.validCount / stats.totalCount) * 100)
      : 0;
  const violationRatio =
    stats.totalCount > 0
      ? Math.round((stats.violationCount / stats.totalCount) * 100)
      : 0;

  return (
    <section aria-label="대시보드 요약 지표 및 조항별 위반 통계" className="space-y-4">
      {/* 핵심 지표 카드 3종 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 전체 건수 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              전체 청구 건수
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {stats.totalCount.toLocaleString('ko-KR')}
            </span>
            <span className="text-sm font-semibold text-slate-500">건</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            총 청구액{' '}
            <span className="font-mono font-semibold text-slate-800">
              {stats.totalAmount.toLocaleString('ko-KR')}원
            </span>
          </p>
        </div>

        {/* 정상 건수 */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              정상 (적격) 건수
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-700">
              {stats.validCount.toLocaleString('ko-KR')}
            </span>
            <span className="text-sm font-semibold text-emerald-600">건</span>
            <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {validRatio}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            적격 승인 가능액{' '}
            <span className="font-mono font-semibold text-emerald-700">
              {stats.validAmount.toLocaleString('ko-KR')}원
            </span>
          </p>
        </div>

        {/* 총 위반 건수 */}
        <div
          className={`rounded-2xl border p-5 shadow-xs ${
            stats.violationCount > 0
              ? 'border-rose-200 bg-rose-50/40'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                stats.violationCount > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}
            >
              총 위반 건수
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                stats.violationCount > 0
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                stats.violationCount > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {stats.violationCount.toLocaleString('ko-KR')}
            </span>
            <span
              className={`text-sm font-semibold ${
                stats.violationCount > 0 ? 'text-rose-600' : 'text-slate-500'
              }`}
            >
              건
            </span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                stats.violationCount > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {violationRatio}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            위반 대상 금액{' '}
            <span
              className={`font-mono font-semibold ${
                stats.violationCount > 0 ? 'text-rose-700' : 'text-slate-800'
              }`}
            >
              {stats.violationAmount.toLocaleString('ko-KR')}원
            </span>
          </p>
        </div>
      </div>

      {/* 조항별 위반 통계 배지 칩 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:px-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <Scale className="h-4 w-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            사내 규정 조항별 위반 현황 (제5조 ~ 제9조)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {POLICY_CLAUSE_LIST.map((clause) => {
            const meta = POLICY_RULES_META[clause];
            const count = stats.clauseCounts[clause] ?? 0;
            const hasViolation = count > 0;

            return (
              <div
                key={clause}
                title={meta.description}
                className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs transition ${
                  hasViolation
                    ? 'border-rose-200 bg-rose-50/80 text-rose-950'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold">{meta.name}</span>
                  <span
                    className={`text-[11px] ${
                      hasViolation ? 'text-rose-700/90' : 'text-slate-400'
                    }`}
                  >
                    {meta.summary}
                  </span>
                </div>
                <span
                  className={`ml-1 inline-flex h-6 min-w-9 items-center justify-center rounded-full px-2 font-mono text-xs font-bold ${
                    hasViolation
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}건
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
