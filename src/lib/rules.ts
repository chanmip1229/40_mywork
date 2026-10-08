import {
  POLICY_LIMITS,
  QUALIFIED_RECEIPT_TYPES,
} from '@/constants/policyRules';
import { ExpenseItem, ViolationDetail, ViolationResult } from './types';

/**
 * 필수 입력값 누락 검증
 * - 제출자, 부서, 사용일, 사용시각, 항목, 가맹점, 금액, 증빙, 제출일 중 누락 항목 확인
 */
export function checkMissingRequiredFields(
  item: ExpenseItem
): ViolationDetail | null {
  const missingFields: string[] = [];

  if (!item.submitter) missingFields.push('제출자');
  if (!item.department) missingFields.push('부서');
  if (!item.usedDate) missingFields.push('사용일');
  if (!item.usedTime) missingFields.push('사용시각');
  if (!item.category) missingFields.push('항목');
  if (!item.merchant) missingFields.push('가맹점');
  if (item.amount <= 0) missingFields.push('금액');
  if (!item.receiptType) missingFields.push('증빙');
  if (!item.submittedDate) missingFields.push('제출일');

  if (missingFields.length === 0) return null;

  // 사용일, 항목, 가맹점, 금액 등 핵심 내역이 다수 비어있는 미완성 행 (예: 김연아 행)
  if (missingFields.length >= 3) {
    return {
      clause: '필수항목',
      title: '필수 항목 누락 (작성 미비)',
      reason: `필수 입력 항목이 다수 누락되었습니다 (미기재: ${missingFields.join(', ')})`,
    };
  }

  // 특정 필수값(예: 26번 김민지 님의 '사용시각')만 빠진 경우 별도 경고 표시
  const extraContext =
    !item.usedTime && item.category === '택시'
      ? ' — 택시비 심야(22:00 이후) 탑승 여부 확인을 위해 사용시각 기재 필수'
      : '';

  return {
    clause: '필수항목',
    title: '필수 입력값 누락',
    reason: `필수 입력값(${missingFields.join(', ')})이 누락되었습니다${extraContext}`,
  };
}

/**
 * 제5조 (식대) 검증
 * - 업무상 식대(야근 식대 포함)는 1인당 1회 12,000원 한도
 * - 여러 명이 함께 식사한 경우 금액을 인원수로 나눈 1인당 금액으로 판단
 */
export function checkArticle5Meal(item: ExpenseItem): ViolationDetail | null {
  if (item.category !== '식대' || item.amount <= 0) return null;

  const headcount = Math.max(1, item.headcount);
  const perPersonAmount = Math.round(item.amount / headcount);

  if (perPersonAmount > POLICY_LIMITS.MEAL_LIMIT_PER_PERSON) {
    const excessTotal =
      item.amount - POLICY_LIMITS.MEAL_LIMIT_PER_PERSON * headcount;
    return {
      clause: '제5조',
      title: '식대 한도 초과',
      reason: `1인당 ${perPersonAmount.toLocaleString('ko-KR')}원으로 식대 한도(12,000원) 초과 (${headcount}명 총 ${item.amount.toLocaleString('ko-KR')}원, 초과액 ${excessTotal.toLocaleString('ko-KR')}원)`,
    };
  }

  return null;
}

/**
 * 제6조 (교통비) 검증
 * - 택시비는 1) 22:00 이후 퇴근 또는 2) 업무상 외부 이동(메모에 이동 목적 기재)만 인정
 * - 22:00 이전 퇴근 택시비는 불인정
 */
export function checkArticle6Transport(
  item: ExpenseItem
): ViolationDetail | null {
  if (item.category !== '택시') return null;

  const timeStr = item.usedTime.trim();
  // 사용시각이 비어 있는 경우는 checkMissingRequiredFields에서 '필수 입력값 누락' 별도 경고로 처리
  if (!timeStr) return null;

  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = hourStr !== undefined && hourStr !== '' ? Number(hourStr) : NaN;
  const minute = Number(minuteStr ?? 0);

  const isNightTime =
    !Number.isNaN(hour) &&
    (hour >= POLICY_LIMITS.TAXI_NIGHT_START_HOUR ||
      hour < POLICY_LIMITS.TAXI_NIGHT_END_HOUR);

  const memo = item.memo.trim();
  const isCommuteHome = memo.includes('퇴근');
  const hasExternalBusinessPurpose =
    memo.length > 0 &&
    !isCommuteHome &&
    (memo.includes('이동') ||
      memo.includes('방문') ||
      memo.includes('현장') ||
      memo.includes('고객') ||
      memo.includes('외근') ||
      memo.includes('점검') ||
      memo.includes('미팅') ||
      memo.length >= 2);

  if (!isNightTime) {
    if (isCommuteHome) {
      return {
        clause: '제6조',
        title: '심야 시간 외 퇴근 택시',
        reason: `오후 10시(22:00) 이전 퇴근 택시비 불인정 (${item.usedTime} 탑승, 메모: ${memo})`,
      };
    }

    if (!hasExternalBusinessPurpose) {
      return {
        clause: '제6조',
        title: '택시 이동 목적 미기재',
        reason: `22:00 이전 택시 이용(${item.usedTime || `${hour}:${String(minute).padStart(2, '0')}`}) 시 업무상 외부 이동 목적을 메모란에 기재해야 함`,
      };
    }
  }

  return null;
}

/**
 * 제7조 (증빙) 검증
 * - 1건 30,000원 이상 지출은 적격증빙(법인카드 전표, 세금계산서, 현금영수증) 필수
 * - 간이영수증은 30,000원 미만 지출에만 인정
 */
export function checkArticle7Receipt(
  item: ExpenseItem
): ViolationDetail | null {
  if (item.amount < POLICY_LIMITS.QUALIFIED_RECEIPT_MIN_AMOUNT) {
    return null;
  }

  const isQualified = (QUALIFIED_RECEIPT_TYPES as readonly string[]).includes(
    item.receiptType
  );

  if (item.receiptType === '간이영수증' || !isQualified) {
    return {
      clause: '제7조',
      title: '적격증빙 미비',
      reason: `1건 30,000원 이상 지출(${item.amount.toLocaleString('ko-KR')}원)에 '${item.receiptType || '미기재'}' 사용 불가 (적격증빙 필요)`,
    };
  }

  return null;
}

/**
 * 제8조 (접대비) 검증
 * - 거래처 접대비가 1건 300,000원을 넘는 경우 사전 품의를 받고 품의번호를 적어야 함
 */
export function checkArticle8Entertainment(
  item: ExpenseItem
): ViolationDetail | null {
  if (item.category !== '접대비') return null;

  if (
    item.amount > POLICY_LIMITS.ENTERTAINMENT_APPROVAL_MIN_AMOUNT &&
    !item.approvalNumber.trim()
  ) {
    return {
      clause: '제8조',
      title: '사전 품의번호 누락',
      reason: `300,000원 초과 접대비(${item.amount.toLocaleString('ko-KR')}원) 지출 건 사전 품의번호 미기재`,
    };
  }

  return null;
}

function parseDateUtcMs(dateStr: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return Date.UTC(year, month, day);
}

/**
 * 제9조 제1항 (제출 기한) 검증
 * - 사용일로부터 30일 이내에 제출해야 하며, 30일이 지난 건은 처리하지 않음
 */
export function checkArticle9Deadline(
  item: ExpenseItem
): ViolationDetail | null {
  const usedMs = parseDateUtcMs(item.usedDate);
  const submittedMs = parseDateUtcMs(item.submittedDate);

  if (usedMs === null || submittedMs === null) return null;

  const diffDays = Math.round((submittedMs - usedMs) / (1000 * 60 * 60 * 24));

  if (diffDays > POLICY_LIMITS.SUBMISSION_DEADLINE_DAYS) {
    return {
      clause: '제9조',
      title: '제출 기한(30일) 초과',
      reason: `사용일(${item.usedDate})로부터 ${diffDays}일 경과 후 제출됨 (제출일: ${item.submittedDate}, 30일 이내 규정 위반)`,
    };
  }

  return null;
}

/**
 * 제9조 제2항 (중복 제출) 검증
 * - 같은 지출(사용일·가맹점·금액이 모두 같은 건)을 두 번 이상 제출할 수 없음
 */
export function checkArticle9Duplicate(
  item: ExpenseItem,
  originalItem: ExpenseItem | undefined
): ViolationDetail | null {
  if (!originalItem || originalItem.id === item.id) return null;

  return {
    clause: '제9조',
    title: '중복 제출 의심',
    reason: `#${originalItem.id}번 내역(${originalItem.submitter}, ${originalItem.usedDate}, ${originalItem.merchant}, ${originalItem.amount.toLocaleString('ko-KR')}원)과 동일 지출 중복 제출`,
  };
}

export function getDuplicateSignature(item: ExpenseItem): string | null {
  if (!item.usedDate || !item.merchant.trim() || item.amount <= 0) {
    return null;
  }
  return `${item.usedDate}|${item.merchant.trim()}|${item.amount}`;
}

/**
 * 전체 경비 목록에 대해 필수값 누락 및 제5조~제9조 룰 엔진을 일괄 실행하는 순수 함수
 */
export function auditExpenseItems(items: ExpenseItem[]): ViolationResult[] {
  const seenBySignature = new Map<string, ExpenseItem>();

  return items.map((item) => {
    const violations: ViolationDetail[] = [];

    const vMissing = checkMissingRequiredFields(item);
    if (vMissing) violations.push(vMissing);

    const v5 = checkArticle5Meal(item);
    if (v5) violations.push(v5);

    const v6 = checkArticle6Transport(item);
    if (v6) violations.push(v6);

    const v7 = checkArticle7Receipt(item);
    if (v7) violations.push(v7);

    const v8 = checkArticle8Entertainment(item);
    if (v8) violations.push(v8);

    const v9Deadline = checkArticle9Deadline(item);
    if (v9Deadline) violations.push(v9Deadline);

    const signature = getDuplicateSignature(item);
    if (signature) {
      const firstSeen = seenBySignature.get(signature);
      if (firstSeen) {
        const v9Dup = checkArticle9Duplicate(item, firstSeen);
        if (v9Dup) violations.push(v9Dup);
      } else {
        seenBySignature.set(signature, item);
      }
    }

    return {
      ...item,
      isViolation: violations.length > 0,
      violations,
    };
  });
}
