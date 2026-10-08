import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Supabase 클라이언트 (지점 매출 관리판 `sales` 테이블 & 리뷰 분석기 `review_analysis` 테이블 공용)
 * Next.js에 조회 결과를 캐시하지 않고 매번 새로 읽어오도록(cache: "no-store") 설정합니다.
 */
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
  }
);

export const BRANCHES = [
  "용산역점",
  "삼각지점",
  "이태원점",
  "효창공원점",
  "한남점",
] as const;

export type BranchName = (typeof BRANCHES)[number];

export const BRANCH_COLORS: Record<BranchName, string> = {
  용산역점: "#b45309", // Amber 700 (시그니처 원두 브라운)
  이태원점: "#2563eb", // Blue 600
  한남점: "#059669",   // Emerald 600
  삼각지점: "#7c3aed", // Violet 600
  효창공원점: "#ea580c", // Orange 600
};

// Supabase `public.sales` 테이블 원본 행 타입
export interface RawSalesRow {
  id: number;
  월: string; // 'YYYY-MM' 또는 'YYYY-MM-DD'
  지점: string;
  매출액: number;
  객수: number;
  비고: string | null;
}

// 프론트엔드 통합 매출 데이터 모델 (객당 매출액은 실시간 계산)
export interface SalesRecord {
  id: number;
  period: string; // 'YYYY-MM' 또는 'YYYY-MM-DD'
  month: string; // 'YYYY-MM'
  isDaily: boolean; // 'YYYY-MM-DD' 여부
  branch_name: BranchName;
  sales_amount: number;
  customer_count: number;
  unit_price: number; // 실시간 계산: Math.round(sales_amount / customer_count)
  remarks: string;
}

export function toSalesRecord(row: RawSalesRow): SalesRecord {
  const period = String(row.월 || "").trim();
  const isDaily = /^\d{4}-\d{2}-\d{2}$/.test(period);
  const month = period.slice(0, 7);
  const salesAmount = Number(row.매출액) || 0;
  const customerCount = Number(row.객수) || 0;
  const unitPrice =
    customerCount > 0 ? Math.round(salesAmount / customerCount) : 0;

  return {
    id: row.id,
    period,
    month,
    isDaily,
    branch_name: row.지점 as BranchName,
    sales_amount: salesAmount,
    customer_count: customerCount,
    unit_price: unitPrice,
    remarks: row.비고 ? String(row.비고) : "",
  };
}

// 받은자료/9월_지점장_매출보고.txt 데이터 프리셋 (38_지점매출관리판 원본 유지)
export const SEPTEMBER_2026_REPORT_PRESET: Array<{
  period: string;
  branch_name: BranchName;
  sales_amount: number;
  customer_count: number;
  remarks: string;
  reported_at: string;
}> = [
  {
    period: "2026-09",
    branch_name: "용산역점",
    sales_amount: 54320000,
    customer_count: 6820,
    remarks: "",
    reported_at: "10/1 오전 9:02",
  },
  {
    period: "2026-09",
    branch_name: "삼각지점",
    sales_amount: 32480000,
    customer_count: 4011,
    remarks: "",
    reported_at: "10/1 오전 9:15",
  },
  {
    period: "2026-09",
    branch_name: "이태원점",
    sales_amount: 45870000,
    customer_count: 5690,
    remarks: "추석 연휴 3일 단축 영업",
    reported_at: "10/1 오전 10:40",
  },
  {
    period: "2026-09",
    branch_name: "효창공원점",
    sales_amount: 18900000,
    customer_count: 2380,
    remarks: "앞 도로 공사 진행 중 (미완)",
    reported_at: "10/1 오후 1:10",
  },
  {
    period: "2026-09",
    branch_name: "한남점",
    sales_amount: 46100000,
    customer_count: 5520,
    remarks: "",
    reported_at: "10/2 오전 8:55",
  },
];

// Supabase `public.review_analysis` 테이블 행 타입 (39_리뷰분석기 원본 유지)
export interface ReviewAnalysisRow {
  id?: number;
  created_at?: string;
  analyzed_on?: string;
  review_no: number;
  written_on: string;
  rating: number;
  review_text: string;
  sentiment: string;
  categories: string;
  improvement_request: string;
  is_safety_issue: boolean;
  model_used: string;
}
