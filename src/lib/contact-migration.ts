export function requiresGlobalContactMigration(columnNames: string[]): boolean {
  return columnNames.includes("ledger_id");
}

export function requiresContactRegionMigration(columnNames: string[]): boolean {
  return !columnNames.includes("region");
}
