import { PolicyClause } from '@/lib/types';

export const POLICY_LIMITS = {
  MEAL_LIMIT_PER_PERSON: 12000,
  TAXI_NIGHT_START_HOUR: 22,
  TAXI_NIGHT_END_HOUR: 5,
  QUALIFIED_RECEIPT_MIN_AMOUNT: 30000,
  ENTERTAINMENT_APPROVAL_MIN_AMOUNT: 300000,
  SUBMISSION_DEADLINE_DAYS: 30,
} as const;

export const QUALIFIED_RECEIPT_TYPES = [
  '법인카드',
  '법인카드 전표',
  '세금계산서',
  '현금영수증',
] as const;

export interface PolicyRuleMeta {
  clause: PolicyClause;
  name: string;
  summary: string;
  description: string;
}

export const POLICY_RULES_META: Record<PolicyClause, PolicyRuleMeta> = {
  제5조: {
    clause: '제5조',
    name: '제5조 (식대)',
    summary: '1인당 1회 12,000원 한도',
    description:
      '업무상 식대(야근 식대 포함)는 1인당 1회 12,000원을 한도로 하며, 다인 식사 시 인원수로 나눈 금액으로 판단합니다.',
  },
  제6조: {
    clause: '제6조',
    name: '제6조 (교통비)',
    summary: '22시 이후 퇴근 또는 외근 목적 기재',
    description:
      '택시비는 22:00 이후 퇴근이거나 업무상 외부 이동(메모 필수)인 경우에만 인정하며, 22:00 이전 퇴근 택시비는 불인정합니다.',
  },
  제7조: {
    clause: '제7조',
    name: '제7조 (증빙)',
    summary: '3만 원 이상 적격증빙 필수',
    description:
      '1건 30,000원 이상 지출은 적격증빙(법인카드, 세금계산서, 현금영수증)을 갖추어야 하며 간이영수증은 30,000원 미만만 인정합니다.',
  },
  제8조: {
    clause: '제8조',
    name: '제8조 (접대비)',
    summary: '30만 원 초과 시 사전 품의번호 필수',
    description:
      '거래처 접대비가 1건 300,000원을 넘는 경우 사전 품의를 받고 품의번호를 기재해야 합니다.',
  },
  제9조: {
    clause: '제9조',
    name: '제9조 (제출)',
    summary: '30일 이내 제출 및 중복 제출 금지',
    description:
      '경비는 사용일로부터 30일 이내에 제출해야 하며, 사용일·가맹점·금액이 모두 같은 지출을 중복 제출할 수 없습니다.',
  },
  필수항목: {
    clause: '필수항목',
    name: '필수 입력값 누락',
    summary: '필수 기재 항목 작성 미비',
    description:
      '부서, 사용일, 사용시각, 항목, 가맹점, 금액, 증빙, 제출일 등 경비 정산 필수 입력값이 누락된 건입니다.',
  },
};

export const POLICY_CLAUSE_LIST: PolicyClause[] = [
  '제5조',
  '제6조',
  '제7조',
  '제8조',
  '제9조',
  '필수항목',
];
