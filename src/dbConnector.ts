import type { Transaction, Debt, FinancialMonth } from './types';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';

// Local storage key constants
const KEY_MODE = 'budget_tracker_db_mode';
const KEY_MONTHS = 'budget_tracker_months';
const KEY_TRANSACTIONS = 'budget_tracker_transactions';
const KEY_DEBTS = 'budget_tracker_debts';

export type DBMode = 'local' | 'amplify';

// Helper to determine active database mode
export function getDBMode(): DBMode {
  const stored = localStorage.getItem(KEY_MODE);
  return (stored as DBMode) || 'local';
}

export function setDBMode(mode: DBMode) {
  localStorage.setItem(KEY_MODE, mode);
  window.dispatchEvent(new Event('db-mode-changed'));
}

// Generate the Amplify client dynamically
let clientInstance: any = null;
function getAmplifyClient() {
  if (!clientInstance) {
    try {
      clientInstance = generateClient<Schema>();
    } catch (e) {
      console.error('Amplify client initialization failed. Verify Amplify setup.', e);
    }
  }
  return clientInstance;
}

// --- LOCAL STORAGE DATA ENGINE ---

const localDB = {
  getFinancialMonths(): FinancialMonth[] {
    const data = localStorage.getItem(KEY_MONTHS);
    return data ? JSON.parse(data) : [];
  },

  saveFinancialMonths(months: FinancialMonth[]) {
    localStorage.setItem(KEY_MONTHS, JSON.stringify(months));
  },

  getTransactions(): Transaction[] {
    const data = localStorage.getItem(KEY_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransactions(txs: Transaction[]) {
    localStorage.setItem(KEY_TRANSACTIONS, JSON.stringify(txs));
  },

  getDebts(): Debt[] {
    const data = localStorage.getItem(KEY_DEBTS);
    return data ? JSON.parse(data) : [];
  },

  saveDebts(debts: Debt[]) {
    localStorage.setItem(KEY_DEBTS, JSON.stringify(debts));
  },
};

// --- BRIDGED DATA CONNECTOR API ---

export const dbConnector = {
  // --- FINANCIAL MONTHS API ---

  async fetchFinancialMonths(): Promise<FinancialMonth[]> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.FinancialMonth.list({
          limit: 1000,
        });

        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }

        return (response.data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate || undefined,
          active: item.active,
          createdAt: item.createdAt,
        })).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      } catch (err) {
        console.error('Amplify fetchFinancialMonths failed, falling back to local:', err);
        throw err;
      }
    }

    return localDB.getFinancialMonths().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createFinancialMonth(month: Omit<FinancialMonth, 'id' | 'createdAt'>): Promise<FinancialMonth> {
    const newMonth: FinancialMonth = {
      ...month,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };

    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.FinancialMonth.create(newMonth);
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return response.data as unknown as FinancialMonth;
      } catch (err) {
        console.error('Amplify createFinancialMonth failed:', err);
        throw err;
      }
    }

    const months = localDB.getFinancialMonths();
    months.push(newMonth);
    localDB.saveFinancialMonths(months);
    return newMonth;
  },

  async updateFinancialMonth(id: string, updatedFields: Partial<Omit<FinancialMonth, 'id'>>): Promise<FinancialMonth> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.FinancialMonth.update({
          id,
          ...updatedFields,
        });
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return response.data as unknown as FinancialMonth;
      } catch (err) {
        console.error('Amplify updateFinancialMonth failed:', err);
        throw err;
      }
    }

    const months = localDB.getFinancialMonths();
    const idx = months.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error(`FinancialMonth with id ${id} not found.`);

    const updatedMonth = { ...months[idx], ...updatedFields };
    months[idx] = updatedMonth;
    localDB.saveFinancialMonths(months);
    return updatedMonth;
  },

  // --- TRANSACTIONS API ---

  async fetchTransactions(): Promise<Transaction[]> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');
        
        const response = await client.models.Expense.list({
          limit: 1000,
        });
        
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }

        // Map Amplify models to standard App Transaction structures
        return (response.data || []).map((item: any) => ({
          id: item.id,
          date: item.date,
          description: item.description,
          amount: item.amount,
          rawExpression: item.rawExpression || String(item.amount),
          category: item.category,
          type: item.type as 'EXPENSE' | 'INCOME',
          financialMonthId: item.financialMonthId || undefined,
          createdAt: item.createdAt,
        })).sort((a: any, b: any) => b.date.localeCompare(a.date));
      } catch (err) {
        console.error('Amplify fetchTransactions failed, falling back to local:', err);
        throw err;
      }
    }

    // Default Local Storage
    return localDB.getTransactions().sort((a, b) => b.date.localeCompare(a.date));
  },

  async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTx: Transaction = {
      ...tx,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };

    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.Expense.create(newTx);
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return response.data as unknown as Transaction;
      } catch (err) {
        console.error('Amplify createTransaction failed:', err);
        throw err;
      }
    }

    const txs = localDB.getTransactions();
    txs.push(newTx);
    localDB.saveTransactions(txs);
    return newTx;
  },

  async updateTransaction(id: string, updatedFields: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.Expense.update({
          id,
          ...updatedFields,
        });
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return response.data as unknown as Transaction;
      } catch (err) {
        console.error('Amplify updateTransaction failed:', err);
        throw err;
      }
    }

    const txs = localDB.getTransactions();
    const idx = txs.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Transaction with id ${id} not found.`);
    
    const updatedTx = { ...txs[idx], ...updatedFields };
    txs[idx] = updatedTx;
    localDB.saveTransactions(txs);
    return updatedTx;
  },

  async deleteTransaction(id: string): Promise<void> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.Expense.delete({ id });
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return;
      } catch (err) {
        console.error('Amplify deleteTransaction failed:', err);
        throw err;
      }
    }

    const txs = localDB.getTransactions();
    const filtered = txs.filter((t) => t.id !== id);
    localDB.saveTransactions(filtered);
  },

  // --- DEBTS API ---

  async fetchDebts(): Promise<Debt[]> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.Debt.list({
          limit: 1000,
        });
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }

        return (response.data || []).map((item: any) => ({
          id: item.id,
          date: item.date,
          person: item.person,
          amount: item.amount,
          rawExpression: item.rawExpression || String(item.amount),
          type: item.type as 'RECEIVABLE' | 'PAYABLE',
          settled: item.settled,
          notes: item.notes || '',
          financialMonthId: item.financialMonthId || undefined,
          createdAt: item.createdAt,
        })).sort((a: any, b: any) => b.date.localeCompare(a.date));
      } catch (err) {
        console.error('Amplify fetchDebts failed, falling back to local:', err);
        throw err;
      }
    }

    return localDB.getDebts().sort((a, b) => b.date.localeCompare(a.date));
  },

  async createDebt(debt: Omit<Debt, 'id'>): Promise<Debt> {
    const newDebt: Debt = {
      ...debt,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };

    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.Debt.create(newDebt);
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return response.data as unknown as Debt;
      } catch (err) {
        console.error('Amplify createDebt failed:', err);
        throw err;
      }
    }

    const debts = localDB.getDebts();
    debts.push(newDebt);
    localDB.saveDebts(debts);
    return newDebt;
  },

  async updateDebt(id: string, updatedFields: Partial<Omit<Debt, 'id'>>): Promise<Debt> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.Debt.update({
          id,
          ...updatedFields,
        });
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return response.data as unknown as Debt;
      } catch (err) {
        console.error('Amplify updateDebt failed:', err);
        throw err;
      }
    }

    const debts = localDB.getDebts();
    const idx = debts.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error(`Debt with id ${id} not found.`);
    
    const updatedDebt = { ...debts[idx], ...updatedFields };
    debts[idx] = updatedDebt;
    localDB.saveDebts(debts);
    return updatedDebt;
  },

  async deleteDebt(id: string): Promise<void> {
    if (getDBMode() === 'amplify') {
      try {
        const client = getAmplifyClient();
        if (!client) throw new Error('Amplify API client not initialized.');

        const response = await client.models.Debt.delete({ id });
        if (response.errors) {
          throw new Error(response.errors.map((e: any) => e.message).join(', '));
        }
        return;
      } catch (err) {
        console.error('Amplify deleteDebt failed:', err);
        throw err;
      }
    }

    const debts = localDB.getDebts();
    const filtered = debts.filter((d) => d.id !== id);
    localDB.saveDebts(filtered);
  },
};
