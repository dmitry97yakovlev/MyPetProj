export function toApiDeadline(isoDate: string | null): string | undefined {
  if (!isoDate) return undefined;
  return new Date(isoDate).toISOString();
}

export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
