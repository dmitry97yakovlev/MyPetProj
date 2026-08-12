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

/** Целое число дней до дедлайна (может быть отрицательным, если просрочено). */
export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** Короткая метка "сколько осталось" для виджета скиллов на главном экране. */
export function formatDaysLeft(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) return `просрочено на ${-days} дн.`;
  if (days === 0) return "дедлайн сегодня";
  return `осталось ${days} дн.`;
}

/** Доля оставшегося времени (0..1) между началом (createdAt) и дедлайном — для второй полосы в виджете скиллов. */
export function timeRemainingFraction(createdAtIso: string, deadlineIso: string): number {
  const start = new Date(createdAtIso).getTime();
  const end = new Date(deadlineIso).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  return Math.max(0, Math.min(1, (end - now) / (end - start)));
}

/** 7 дат (YYYY-MM-DD) для ячеек last7Days, от самой старой к сегодняшней (см. DailyTaskDto.last7Days). */
export function last7DayDates(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
