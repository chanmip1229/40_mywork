'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ExpenseItem } from '@/lib/types';
import { parseExpenseCsvFile } from '@/lib/parser';

interface FileUploaderProps {
  onDataLoaded: (items: ExpenseItem[], fileName: string) => void;
  onClear: () => void;
  currentFileName: string | null;
  totalRows: number;
}

export default function FileUploader({
  onDataLoaded,
  onClear,
  currentFileName,
  totalRows,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErrorMsg(null);

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMsg('CSV 파일(.csv)만 업로드할 수 있습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const items = await parseExpenseCsvFile(file);
      if (items.length === 0) {
        setErrorMsg('CSV 파일에 유효한 경비 내역 데이터가 없습니다.');
        return;
      }
      onDataLoaded(items, file.name);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'CSV 파싱 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
    e.target.value = '';
  };

  return (
    <section aria-label="CSV 파일 업로드" className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleInputChange}
        className="hidden"
      />

      {currentFileName ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{currentFileName}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  로드 완료
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">
                총 <strong className="font-semibold text-slate-900">{totalRows}건</strong>의 경비 내역이 브라우저 메모리에 로드되었습니다. (서버 저장 없음)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
            >
              다른 파일 업로드
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
              aria-label="업로드 초기화"
            >
              <X className="h-4 w-4" />
              초기화
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition cursor-pointer ${
            isDragging
              ? 'border-blue-600 bg-blue-50/80 scale-[0.995]'
              : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-slate-50/80'
          }`}
        >
          <div
            className={`mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl transition ${
              isDragging
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white'
            }`}
          >
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-slate-900">
            {isLoading
              ? 'CSV 파일을 분석하고 있습니다...'
              : '경비 정산 CSV 파일을 이곳에 드래그하거나 클릭하여 업로드하세요'}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            지원 형식: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">.csv</code> (번호, 제출자, 부서, 사용일, 사용시각, 항목, 가맹점, 금액, 인원, 증빙, 품의번호, 제출일, 메모)
          </p>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
    </section>
  );
}
