export function zonedParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; localDate: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    localDate: `${map.year}-${map.month}-${map.day}`,
  };
}

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Inclusive start, exclusive end, local clock. */
export function isInLocalWindow(
  date: Date,
  startHhmm: string,
  endHhmm: string,
  timeZone: string,
): boolean {
  const { hour, minute } = zonedParts(date, timeZone);
  const current = hour * 60 + minute;
  return current >= toMinutes(startHhmm) && current < toMinutes(endHhmm);
}

export function localDateKey(date: Date, timeZone: string): string {
  return zonedParts(date, timeZone).localDate;
}
