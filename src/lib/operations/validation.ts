export const MACHINE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$/;

export function requiredText(value: FormDataEntryValue | null, label: string, maxLength = 255): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

export function optionalText(value: FormDataEntryValue | null, maxLength = 2000): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error(`This field must be ${maxLength} characters or fewer.`);
  return text;
}

export function requiredDate(value: FormDataEntryValue | null, label: string): string {
  const text = String(value ?? "").trim();
  const date = new Date(text);
  if (!text || Number.isNaN(date.getTime())) throw new Error(`${label} is required and must be a valid date/time.`);
  return date.toISOString();
}

export function machineId(value: FormDataEntryValue | null): string {
  const text = requiredText(value, "Machine ID", 32);
  if (!MACHINE_ID_PATTERN.test(text)) {
    throw new Error("Machine ID must be 2–32 characters and use only letters, numbers, dot, underscore or hyphen.");
  }
  return text.toUpperCase();
}

export function isOneOf<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
