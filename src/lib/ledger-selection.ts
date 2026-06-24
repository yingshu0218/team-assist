export function resolveLedgerSelection(
  availableLedgerIds: number[],
  selectedLedgerId: number | null,
  activeLedgerId: number | null,
): number | null {
  if (selectedLedgerId !== null && availableLedgerIds.includes(selectedLedgerId)) {
    return selectedLedgerId;
  }

  if (activeLedgerId !== null && availableLedgerIds.includes(activeLedgerId)) {
    return activeLedgerId;
  }

  return availableLedgerIds[0] ?? null;
}
