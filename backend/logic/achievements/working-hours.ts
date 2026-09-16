const UK_TIME_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const START_MINUTES = 9 * 60;
const END_MINUTES = 17 * 60 + 30;

/** True Mon–Fri between 09:00 (inclusive) and 17:30 (exclusive) UK time. */
export function isUkWorkingHours(date: Date): boolean {
  const parts = Object.fromEntries(
    UK_TIME_PARTS.formatToParts(date).map((p) => [p.type, p.value]),
  );
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= START_MINUTES && minutes < END_MINUTES;
}
