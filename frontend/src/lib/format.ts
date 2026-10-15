export interface MoneyPrefs {
  currency_code: string;
  locale: string;
}

export function formatMoney(amount: number, prefs: MoneyPrefs, opts?: { whole?: boolean }): string {
  const whole = opts?.whole ?? false;
  try {
    return new Intl.NumberFormat(prefs.locale, {
      style: 'currency',
      currency: prefs.currency_code,
      minimumFractionDigits: whole ? 0 : undefined,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${prefs.currency_code} ${amount.toFixed(whole ? 0 : 2)}`;
  }
}

export function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
