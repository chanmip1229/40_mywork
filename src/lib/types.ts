export interface RawExpenseRow {
  번호?: string;
  제출자?: string;
  부서?: string;
  사용일?: string;
  사용시각?: string;
  항목?: string;
  가맹점?: string;
  금액?: string;
  인원?: string;
  증빙?: string;
  품의번호?: string;
  제출일?: string;
  메모?: string;
}

export interface ExpenseItem {
  id: number;
  submitter: string;
  department: string;
  usedDate: string;
  usedTime: string;
  category: string;
  merchant: string;
  amount: number;
  headcount: number;
  receiptType: string;
  approvalNumber: string;
  submittedDate: string;
  memo: string;
}

export type PolicyClause =
  | '제5조'
  | '제6조'
  | '제7조'
  | '제8조'
  | '제9조'
  | '필수항목';

export interface ViolationDetail {
  clause: PolicyClause;
  title: string;
  reason: string;
}

export interface ViolationResult extends ExpenseItem {
  isViolation: boolean;
  violations: ViolationDetail[];
}
