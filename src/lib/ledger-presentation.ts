export interface TransactionDisplay {
  title: string;
  category: string | null;
}

export function getTransactionDisplay(
  description: string | null,
  categoryName: string,
): TransactionDisplay {
  const title = description?.trim();
  return title ? { title, category: categoryName } : { title: categoryName, category: null };
}

export function getLedgerBalance(
  initialBalance: string,
  totalIncome: number,
  totalExpense: number,
): number {
  const parsedInitialBalance = Number.parseFloat(initialBalance);
  const safeInitialBalance = Number.isFinite(parsedInitialBalance) ? parsedInitialBalance : 0;
  return safeInitialBalance + totalIncome - totalExpense;
}
