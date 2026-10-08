import Papa from 'papaparse';
import { ExpenseItem, RawExpenseRow } from './types';

const EXPECTED_HEADERS = ['번호', '제출자', '부서', '사용일', '항목', '가맹점', '금액'];

function normalizeText(value: string | undefined): string {
  if (!value) return '';
  return value.toString().normalize('NFC').trim();
}

function parseNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const cleaned = value.toString().replace(/[^\d.-]/g, '');
  if (!cleaned) return fallback;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * CSV 상단에 제목 행(예: "9월_경비내역")이나 빈 줄이 포함된 경우,
 * 실제 헤더 행("번호,제출자,부서,...")의 위치를 찾아 그 줄부터 반환합니다.
 */
function preprocessCsvContent(rawCsv: string): string {
  const normalized = rawCsv.replace(/^\uFEFF/, '').normalize('NFC');
  const lines = normalized.split(/\r?\n/);

  const headerLineIndex = lines.findIndex((line) => {
    const matchCount = EXPECTED_HEADERS.filter((header) =>
      line.includes(header)
    ).length;
    return matchCount >= 3;
  });

  if (headerLineIndex > 0) {
    return lines.slice(headerLineIndex).join('\n');
  }

  return normalized;
}

/**
 * 모든 셀이 완전히 비어 있는 행만 제외하고,
 * 제출자 이름 등 일부 값이라도 입력된 행(예: ",김연아,,,,,,,,,,,")은 유지하여
 * 룰 엔진에서 '필수 항목 누락(작성 미비)'으로 검출할 수 있게 합니다.
 */
function hasAnyValue(row: RawExpenseRow): boolean {
  return Object.values(row).some(
    (val) => val !== undefined && normalizeText(String(val)) !== ''
  );
}

function normalizeRow(row: RawExpenseRow, index: number): ExpenseItem {
  return {
    id: parseNumber(row.번호, index + 1),
    submitter: normalizeText(row.제출자),
    department: normalizeText(row.부서),
    usedDate: normalizeText(row.사용일),
    usedTime: normalizeText(row.사용시각),
    category: normalizeText(row.항목),
    merchant: normalizeText(row.가맹점),
    amount: parseNumber(row.금액, 0),
    headcount: Math.max(1, parseNumber(row.인원, 1)),
    receiptType: normalizeText(row.증빙),
    approvalNumber: normalizeText(row.품의번호),
    submittedDate: normalizeText(row.제출일),
    memo: normalizeText(row.메모),
  };
}

export function parseExpenseCsvText(csvText: string): ExpenseItem[] {
  const cleanedCsv = preprocessCsvContent(csvText);

  const results = Papa.parse<RawExpenseRow>(cleanedCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) =>
      header.replace(/^\uFEFF/, '').normalize('NFC').trim(),
  });

  return results.data
    .filter((row) => hasAnyValue(row))
    .map((row, idx) => normalizeRow(row, idx));
}

export async function parseExpenseCsvFile(file: File): Promise<ExpenseItem[]> {
  const rawText = await file.text();
  return parseExpenseCsvText(rawText);
}
