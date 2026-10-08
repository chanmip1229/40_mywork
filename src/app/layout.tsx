import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "내 업무 도구함 | 경비 정산 · 지점 매출 · 리뷰 분석",
  description:
    "경비 정산 검사기, 지점 매출 관리판, 리뷰 분석기를 하나의 주소에서 통합 관리하는 내 업무 도구함 웹 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col">
        <TopNav />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
