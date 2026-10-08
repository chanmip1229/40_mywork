"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
}

/**
 * 상단 공통 메뉴 항목 배열
 * 추후 새로운 업무 도구 페이지를 만들 때 이 배열에 한 칸만 추가하면 모든 페이지 상단 메뉴에 반영됩니다.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "홈", href: "/" },
  { label: "경비 정산", href: "/expense" },
  { label: "지점 매출", href: "/sales" },
  { label: "리뷰 분석", href: "/reviews" },
];

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-base font-extrabold tracking-tight text-white transition hover:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Briefcase className="h-4 w-4" />
          </span>
          <span>내 업무 도구함</span>
        </Link>

        <nav aria-label="주요 업무 도구 메뉴" className="flex items-center gap-1.5 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
