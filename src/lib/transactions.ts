type TransactionCategoryJoin<TTransaction extends { category_id: number | null }> = {
  transaction: TTransaction;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
};

export function formatTransactions<TTransaction extends { category_id: number | null }>(
  data: TransactionCategoryJoin<TTransaction>[]
) {
  return data.map((row) => ({
    ...row.transaction,
    category: row.category_name
      ? {
          id: row.transaction.category_id,
          name: row.category_name,
          color: row.category_color,
          icon: row.category_icon,
        }
      : null,
  }));
}
