export type TransactionType = 'EXPENSE' | 'INCOME';

export type DebtType = 'RECEIVABLE' | 'PAYABLE';

export interface FinancialMonth {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  rawExpression: string; // e.g. "1000 + 150"
  category: string;
  type: TransactionType;
  financialMonthId?: string;
  createdAt?: string;
}

export interface Debt {
  id: string;
  date: string; // YYYY-MM-DD
  person: string;
  amount: number;
  rawExpression: string; // e.g. "15000 + 1000 + 1000"
  type: DebtType;
  settled: boolean;
  notes?: string;
  financialMonthId?: string;
  createdAt?: string;
}

export const CATEGORIES = [
  'Food & Drinks',
  'Transport',
  'Utilities & Mobile',
  'Education',
  'Shopping & Gifts',
  'Health & Fitness',
  'Others',
] as const;

export type Category = typeof CATEGORIES[number];
