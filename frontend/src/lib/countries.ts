export type UnitsSystem = 'imperial' | 'metric';

export interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  locale: string;
  taxLabel: string;
  taxRate: number;
  units: UnitsSystem;
  hourly: number;
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', locale: 'en-US', taxLabel: 'Sales tax', taxRate: 7.5, units: 'imperial', hourly: 95 },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: '$', locale: 'en-CA', taxLabel: 'GST/HST', taxRate: 13, units: 'metric', hourly: 90 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', locale: 'en-GB', taxLabel: 'VAT', taxRate: 20, units: 'metric', hourly: 55 },
  { code: 'IE', name: 'Ireland', currency: 'EUR', symbol: '€', locale: 'en-IE', taxLabel: 'VAT', taxRate: 13.5, units: 'metric', hourly: 55 },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: '$', locale: 'en-AU', taxLabel: 'GST', taxRate: 10, units: 'metric', hourly: 95 },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', symbol: '$', locale: 'en-NZ', taxLabel: 'GST', taxRate: 15, units: 'metric', hourly: 85 },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', locale: 'en-IN', taxLabel: 'GST', taxRate: 18, units: 'metric', hourly: 600 },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', locale: 'de-DE', taxLabel: 'MwSt.', taxRate: 19, units: 'metric', hourly: 65 },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€', locale: 'fr-FR', taxLabel: 'TVA', taxRate: 20, units: 'metric', hourly: 55 },
  { code: 'ES', name: 'Spain', currency: 'EUR', symbol: '€', locale: 'es-ES', taxLabel: 'IVA', taxRate: 21, units: 'metric', hourly: 40 },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€', locale: 'it-IT', taxLabel: 'IVA', taxRate: 22, units: 'metric', hourly: 45 },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', symbol: '€', locale: 'nl-NL', taxLabel: 'BTW', taxRate: 21, units: 'metric', hourly: 60 },
  { code: 'PT', name: 'Portugal', currency: 'EUR', symbol: '€', locale: 'pt-PT', taxLabel: 'IVA', taxRate: 23, units: 'metric', hourly: 30 },
  { code: 'SE', name: 'Sweden', currency: 'SEK', symbol: 'kr', locale: 'sv-SE', taxLabel: 'Moms', taxRate: 25, units: 'metric', hourly: 600 },
  { code: 'NO', name: 'Norway', currency: 'NOK', symbol: 'kr', locale: 'nb-NO', taxLabel: 'MVA', taxRate: 25, units: 'metric', hourly: 700 },
  { code: 'DK', name: 'Denmark', currency: 'DKK', symbol: 'kr', locale: 'da-DK', taxLabel: 'Moms', taxRate: 25, units: 'metric', hourly: 450 },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', symbol: 'CHF', locale: 'de-CH', taxLabel: 'MWST', taxRate: 8.1, units: 'metric', hourly: 110 },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'AED', locale: 'en-AE', taxLabel: 'VAT', taxRate: 5, units: 'metric', hourly: 120 },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', locale: 'en-SA', taxLabel: 'VAT', taxRate: 15, units: 'metric', hourly: 100 },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', locale: 'en-ZA', taxLabel: 'VAT', taxRate: 15, units: 'metric', hourly: 350 },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', locale: 'en-NG', taxLabel: 'VAT', taxRate: 7.5, units: 'metric', hourly: 5000 },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh', locale: 'en-KE', taxLabel: 'VAT', taxRate: 16, units: 'metric', hourly: 1200 },
  { code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱', locale: 'en-PH', taxLabel: 'VAT', taxRate: 12, units: 'metric', hourly: 350 },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: '$', locale: 'en-SG', taxLabel: 'GST', taxRate: 9, units: 'metric', hourly: 60 },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM', locale: 'en-MY', taxLabel: 'SST', taxRate: 8, units: 'metric', hourly: 60 },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs', locale: 'en-PK', taxLabel: 'GST', taxRate: 18, units: 'metric', hourly: 1200 },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳', locale: 'en-BD', taxLabel: 'VAT', taxRate: 15, units: 'metric', hourly: 400 },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', symbol: 'Rs', locale: 'en-LK', taxLabel: 'VAT', taxRate: 18, units: 'metric', hourly: 1500 },
  { code: 'MX', name: 'Mexico', currency: 'MXN', symbol: '$', locale: 'es-MX', taxLabel: 'IVA', taxRate: 16, units: 'metric', hourly: 250 },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$', locale: 'pt-BR', taxLabel: 'Imposto', taxRate: 10, units: 'metric', hourly: 80 },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$', locale: 'es-CO', taxLabel: 'IVA', taxRate: 19, units: 'metric', hourly: 25000 },
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$', locale: 'es-AR', taxLabel: 'IVA', taxRate: 21, units: 'metric', hourly: 8000 },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$', locale: 'es-CL', taxLabel: 'IVA', taxRate: 19, units: 'metric', hourly: 12000 },
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥', locale: 'ja-JP', taxLabel: 'Consumption tax', taxRate: 10, units: 'metric', hourly: 5000 },
  { code: 'TR', name: 'Türkiye', currency: 'TRY', symbol: '₺', locale: 'tr-TR', taxLabel: 'KDV', taxRate: 20, units: 'metric', hourly: 500 },
  { code: 'PL', name: 'Poland', currency: 'PLN', symbol: 'zł', locale: 'pl-PL', taxLabel: 'VAT', taxRate: 23, units: 'metric', hourly: 120 },
  { code: 'OTHER', name: 'Other', currency: 'USD', symbol: '$', locale: 'en-US', taxLabel: 'Tax', taxRate: 0, units: 'metric', hourly: 50 },
];

export function findCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

/** Best-effort guess from the browser locale, e.g. "en-IN" -> IN. */
export function detectCountry(): Country {
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const l of langs) {
    const region = l.split('-')[1]?.toUpperCase();
    const hit = COUNTRIES.find((c) => c.code === region);
    if (hit) return hit;
  }
  return COUNTRIES[0];
}

export const TRADES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Carpentry / Remodeling',
  'Roofing',
  'Painting',
  'Landscaping',
  'General Contracting',
];
