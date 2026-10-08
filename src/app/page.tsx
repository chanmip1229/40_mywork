import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Coffee,
  MessageSquareText,
  ArrowRight,
  Briefcase,
} from "lucide-react";

const TOOL_CARDS = [
  {
    title: "경비 정산 검사기",
    badge: "한결인테리어 · 제5조~제9조",
    href: "/expense",
    description:
      "경비 내역 CSV 파일을 업로드하면 사내 규정(식대 한도, 심야 택시, 적격증빙, 접대비 사전 품의, 제출 기한 및 중복 제출)을 즉시 검증하고 제출자별 반려 사유를 원클릭 복사합니다.",
    features: [
      "브라우저 로컬 CSV 파싱 (서버 저장 없음)",
      "제5조~제9조 및 필수항목 누락 실시간 검출",
      "위반 건만 보기 필터 & 제출자별 반려 사유 복사",
    ],
    icon: ShieldCheck,
    accentBg: "bg-blue-600",
    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
    hoverBorder: "hover:border-blue-500",
    buttonStyle: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    title: "지점 매출 관리판",
    badge: "오늘의원두 · 5개 지점",
    href: "/sales",
    description:
      "용산역점·삼각지점·이태원점·효창공원점·한남점의 매출액과 객수를 입력·수정하고, 실시간 객당 매출액(객단가)과 공공데이터 공휴일 영향을 복합 차트로 확인합니다.",
    features: [
      "Supabase sales 테이블 실시간 조회 · 입력 · 수정",
      "객당 매출액(매출액 ÷ 객수) 실시간 자동 계산",
      "공공데이터포털 공휴일 연동 & 주말·공휴일 빨간색 음영 차트",
    ],
    icon: Coffee,
    accentBg: "bg-amber-800",
    badgeStyle: "bg-amber-50 text-amber-900 border-amber-200",
    hoverBorder: "hover:border-amber-600",
    buttonStyle: "bg-amber-800 hover:bg-amber-900 text-white",
  },
  {
    title: "리뷰 분석기",
    badge: "하루살림 · 클린핏 미니",
    href: "/reviews",
    description:
      "월간 리뷰 CSV를 Gemini AI로 한 번에 분석해 광고를 제외한 긍정·부정 비율, 14개 불만 유형, 개선 요청, 안전 이슈를 뽑아내고 한국소비자원 청소기 사고 현황과 나란히 비교합니다.",
    features: [
      "Gemini 3.8 Flash 단일 요청 분석 (503 시 3.5 Flash-Lite 재시도)",
      "한국소비자원 가정용 진공청소기 사고 건수 및 위해원인 1~3위",
      "Supabase review_analysis 저장 및 분석일별 이력 비교",
    ],
    icon: MessageSquareText,
    accentBg: "bg-indigo-600",
    badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
    hoverBorder: "hover:border-indigo-500",
    buttonStyle: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* 상단 타이틀 영역 */}
      <section className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
              <span>통합 업무 포털 · 단일 주소에서 모든 도구 실행</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              내 업무 도구함
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              자주 쓰는 세 가지 업무 도구(<strong>경비 정산 검사기</strong>,{" "}
              <strong>지점 매출 관리판</strong>, <strong>리뷰 분석기</strong>)를
              하나의 주소에서 바로 골라 쓰세요. 상단 메뉴바를 통해 언제든 다른
              도구로 즉시 이동할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 세 도구로 가는 카드 3장 */}
      <section
        aria-label="업무 도구 바로가기 카드 목록"
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {TOOL_CARDS.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.href}
              className="tool-card-container flex"
            >
              <Link
                href={card.href}
                className={`group flex w-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${card.hoverBorder}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs ${card.accentBg}`}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${card.badgeStyle}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h2>

                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                    {card.description}
                  </p>

                  <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                    {card.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <span
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-2xs transition ${card.buttonStyle}`}
                  >
                    <span>{card.title} 열기</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </div>
          );
        })}
      </section>
    </main>
  );
}
