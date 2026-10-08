'use client';

import React, { useMemo, useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { ExpenseItem } from '@/lib/types';
import { auditExpenseItems } from '@/lib/rules';
import FileUploader from '@/components/FileUploader';
import SummaryCards from '@/components/SummaryCards';
import ExpenseTable from '@/components/ExpenseTable';
import RejectCopyModal from '@/components/RejectCopyModal';

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const auditedExpenses = useMemo(
    () => auditExpenseItems(expenses),
    [expenses]
  );

  const handleDataLoaded = (items: ExpenseItem[], uploadedFileName: string) => {
    setExpenses(items);
    setFileName(uploadedFileName);
  };

  const handleClear = () => {
    setExpenses([]);
    setFileName(null);
    setIsRejectModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  경비 정산 검사기
                </h1>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  한결인테리어
                </span>
              </div>
              <p className="text-xs text-slate-500">
                사내 경비 처리 규정(제5조~제9조) 자동 검증 대시보드
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Zero Persistence · 브라우저 로컬 메모리 전용</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <FileUploader
          onDataLoaded={handleDataLoaded}
          onClear={handleClear}
          currentFileName={fileName}
          totalRows={expenses.length}
        />

        <SummaryCards items={auditedExpenses} />

        <ExpenseTable
          items={auditedExpenses}
          onOpenRejectModal={() => setIsRejectModalOpen(true)}
        />
      </main>

      <RejectCopyModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        items={auditedExpenses}
      />
    </div>
  );
}
