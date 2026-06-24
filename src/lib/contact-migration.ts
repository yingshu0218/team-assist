export function requiresGlobalContactMigration(columnNames: string[]): boolean {
  return columnNames.includes("ledger_id");
}
