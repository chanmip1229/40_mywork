"use client";

import React from "react";
import { Coffee, ShieldCheck, Users, Sparkles } from "lucide-react";

interface AccessControlWrapperProps {
  activeRole: "executive" | "manager";
  onRoleChange: (role: "executive" | "manager") => void;
  children: React.ReactNode;
}

/**
 * PRD 2.1 사용자 접근 및 권한 (Phase 1 무인증 오픈 & 추후 확장성 모듈화)
 * 향후 Phase 2에서 비밀번호/지점별 PIN 인증을 추가할 때 이 래퍼 내부에만 인증 게이트를 결합하면 됩니다.
 */
export default function AccessControlWrapper({
  activeRole,
  onRoleChange,
  children,
}: AccessControlWrapperProps) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* 지점 매출 대시보드 상단 헤더 */}
      <header className="border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 text-white shadow-sm">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-stone-900 sm:text-xl">
                  오늘의원두
                </h1>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  지점 매출 통합 대시보드
                </span>
              </div>
              <p className="text-xs text-stone-500">
                실시간 지점 매출·객단가 및 공공데이터 공휴일 영향 분석 시스템
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Phase 1 오픈 액세스 상태 표시 배지 */}
            <div
              className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 md:flex"
              title="Phase 1: 별도 로그인 없이 링크로 즉시 접속 및 입력 가능 (RLS 정책 적용)"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Phase 1 무인증 오픈 모드 (Supabase 실시간 연동)</span>
            </div>

            {/* 사용자 모드 빠른 전환 탭 */}
            <div
              className="inline-flex rounded-xl bg-stone-100 p-1"
              role="tablist"
              aria-label="사용자 화면 모드 전환"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeRole === "executive"}
                onClick={() => onRoleChange("executive")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeRole === "executive"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                본사·경영진 대시보드
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeRole === "manager"}
                onClick={() => onRoleChange("manager")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeRole === "manager"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                지점장 매출 입력·수정
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
