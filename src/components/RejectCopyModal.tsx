'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  Check,
  X,
  MessageSquareWarning,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import { ViolationResult } from '@/lib/types';

interface RejectCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ViolationResult[];
}

interface SubmitterGroup {
  submitter: string;
  department: string;
  violations: ViolationResult[];
  totalViolationAmount: number;
  formattedText: string;
}

export function buildSubmitterRejectText(
  submitter: string,
  department: string,
  violations: ViolationResult[]
): string {
  const lines: string[] = [
    `[경비 정산 반려 안내 - ${submitter}님 (${department})]`,
    `안녕하세요, 경영지원팀입니다.`,
    `제출해주신 경비 내역 중 사내 경비 처리 규정에 따라 확인 및 보완이 필요한 ${violations.length}건을 안내드립니다.`,
    '',
  ];

  violations.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. [#${item.id}] ${item.usedDate} ${item.usedTime} | ${item.category} | ${item.merchant} (${item.amount.toLocaleString('ko-KR')}원)`
    );
    item.violations.forEach((v) => {
      lines.push(`   • 위반 조항: ${v.clause} (${v.title})`);
      lines.push(`   • 상세 사유: ${v.reason}`);
    });
    lines.push('');
  });

  lines.push('위 내역 확인 후 증빙 보완 또는 금액 수정하여 재제출 부탁드립니다. 감사합니다.');
  return lines.join('\n');
}

export default function RejectCopyModal({
  isOpen,
  onClose,
  items,
}: RejectCopyModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedSubmitter, setSelectedSubmitter] = useState<string>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const submitterGroups = useMemo<SubmitterGroup[]>(() => {
    const map = new Map<string, ViolationResult[]>();

    for (const item of items) {
      if (!item.isViolation) continue;
      const list = map.get(item.submitter) ?? [];
      list.push(item);
      map.set(item.submitter, list);
    }

    return Array.from(map.entries()).map(([submitter, list]) => {
      const department = list[0]?.department ?? '';
      const totalViolationAmount = list.reduce((sum, i) => sum + i.amount, 0);
      return {
        submitter,
        department,
        violations: list,
        totalViolationAmount,
        formattedText: buildSubmitterRejectText(submitter, department, list),
      };
    });
  }, [items]);

  const allCombinedText = useMemo(() => {
    return submitterGroups
      .map((group) => group.formattedText)
      .join('\n\n----------------------------------------\n\n');
  }, [submitterGroups]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback for browsers without <dialog closedby="any"> support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    const handleBackdropClick = (event: MouseEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isDialogContent) {
        dialog.close();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Fallback textarea copy if clipboard permission fails
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    }
  };

  const activeGroup =
    selectedSubmitter === 'ALL'
      ? null
      : submitterGroups.find((g) => g.submitter === selectedSubmitter) ?? null;

  const previewText = activeGroup ? activeGroup.formattedText : allCombinedText;
  const activeCopyKey = activeGroup ? `sub-${activeGroup.submitter}` : 'ALL';

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="reject-modal-title"
      className="reject-dialog m-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <MessageSquareWarning className="h-5 w-5" />
            </div>
            <div>
              <h2 id="reject-modal-title" className="text-base font-bold text-slate-900">
                제출자별 반려 사유 메시지 복사
              </h2>
              <p className="text-xs text-slate-500">
                사내 메신저(Slack, 카카오톡)나 이메일에 바로 붙여넣을 수 있는 안내문입니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            aria-label="모달 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {submitterGroups.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              반려 대상 규정 위반 내역이 없습니다.
            </div>
          ) : (
            <>
              {/* 제출자 선택 탭 및 개별 원클릭 복사 카드 */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    대상자 선택 및 원클릭 복사 ({submitterGroups.length}명)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmitter('ALL')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      selectedSubmitter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    전체 모아보기
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {submitterGroups.map((group) => {
                    const isSelected = selectedSubmitter === group.submitter;
                    const copyKey = `card-${group.submitter}`;
                    const isCopied = copiedKey === copyKey;

                    return (
                      <div
                        key={group.submitter}
                        onClick={() => setSelectedSubmitter(group.submitter)}
                        className={`flex items-center justify-between rounded-xl border p-3 transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                            : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900">
                              {group.submitter}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({group.department})
                            </span>
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                              {group.violations.length}건
                            </span>
                          </div>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            반려 합계: {group.totalViolationAmount.toLocaleString('ko-KR')}원
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubmitter(group.submitter);
                            handleCopy(group.formattedText, copyKey);
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              복사됨
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              복사
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 생성된 반려 메시지 미리보기 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {activeGroup
                      ? `${activeGroup.submitter} (${activeGroup.department}) 반려 안내문 미리보기`
                      : `전체 제출자(${submitterGroups.length}명) 일괄 반려 안내문 미리보기`}
                  </span>
                </div>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
                  {previewText}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-500">
            클립보드에 복사한 뒤 메신저 대화창에 <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px]">⌘+V</kbd> 또는 <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px]">Ctrl+V</kbd>로 붙여넣으세요.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
            >
              닫기
            </button>
            {submitterGroups.length > 0 && (
              <button
                type="button"
                onClick={() => handleCopy(previewText, activeCopyKey)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition cursor-pointer ${
                  copiedKey === activeCopyKey
                    ? 'bg-emerald-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {copiedKey === activeCopyKey ? (
                  <>
                    <ClipboardCheck className="h-4 w-4" />
                    클립보드에 복사 완료!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {activeGroup
                      ? `${activeGroup.submitter}님 반려 사유 복사`
                      : '전체 반려 사유 일괄 복사'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
