interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number; // 1 USD = X
  taxRate: number; // VAT/GST as decimal
}

const currencies: Record<string, CurrencyConfig> = {
  US: { code: 'USD', symbol: '$', rate: 1, taxRate: 0 },
  CA: { code: 'CAD', symbol: 'C$', rate: 1.36, taxRate: 0.05 },
  GB: { code: 'GBP', symbol: '£', rate: 0.79, taxRate: 0.20 },
  DE: { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.19 },
  FR: { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.20 },
  IT: { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.22 },
  ES: { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.21 },
  NL: { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.21 },
  BE: { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.21 },
  AT: { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.20 },
  JP: { code: 'JPY', symbol: '¥', rate: 149.50, taxRate: 0.10 },
  AU: { code: 'AUD', symbol: 'A$', rate: 1.54, taxRate: 0.10 },
  IN: { code: 'INR', symbol: '₹', rate: 83.12, taxRate: 0.18 },
  BR: { code: 'BRL', symbol: 'R$', rate: 5.02, taxRate: 0.17 },
  SG: { code: 'SGD', symbol: 'S$', rate: 1.34, taxRate: 0.09 },
  AE: { code: 'AED', symbol: 'د.إ', rate: 3.67, taxRate: 0.05 },
};

const countryNames: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain',
  NL: 'Netherlands', BE: 'Belgium', AT: 'Austria',
  JP: 'Japan', AU: 'Australia', IN: 'India', BR: 'Brazil',
  SG: 'Singapore', AE: 'United Arab Emirates',
};

export function getCurrencyForCountry(countryCode: string): CurrencyConfig {
  return currencies[countryCode] || currencies.US;
}

export function convertPrice(usdPrice: number, countryCode: string): { localPrice: number; currency: CurrencyConfig } {
  const currency = getCurrencyForCountry(countryCode);
  return {
    localPrice: Math.round(usdPrice * currency.rate * 100) / 100,
    currency,
  };
}

export function getTaxAmount(usdPrice: number, countryCode: string): number {
  const currency = getCurrencyForCountry(countryCode);
  return Math.round(usdPrice * currency.taxRate * 100) / 100;
}

export function getTotalWithTax(usdPrice: number, countryCode: string): { subtotal: number; tax: number; total: number; currency: CurrencyConfig } {
  const currency = getCurrencyForCountry(countryCode);
  const subtotal = Math.round(usdPrice * currency.rate * 100) / 100;
  const tax = Math.round(subtotal * currency.taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total, currency };
}

export function getSupportedCountries(): { code: string; name: string; currency: string; symbol: string }[] {
  return Object.entries(currencies).map(([code, c]) => ({
    code,
    name: countryNames[code] || code,
    currency: c.code,
    symbol: c.symbol,
  }));
}
