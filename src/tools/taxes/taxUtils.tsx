// Shared tax calculation utilities and components for tax calculators
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export type TaxBracket = {
  min: number;
  max: number;
  rate: number;
};

export function calculateTax(
  taxableIncome: number,
  brackets: TaxBracket[],
): {
  total: number;
  breakdown: Array<{
    range: string;
    rate: string;
    taxableAmount: number;
    tax: number;
  }>;
} {
  let tax = 0;
  const breakdown = [];
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    const taxForBracket = taxableInBracket * bracket.rate;
    if (taxableInBracket > 0) {
      tax += taxForBracket;
      breakdown.push({
        range: `$${bracket.min.toLocaleString()} - ${
          bracket.max === Number.POSITIVE_INFINITY
            ? '∞'
            : `$ ${bracket.max.toLocaleString()}`
        }`,
        rate: `${(bracket.rate * 100).toFixed(2)}%`,
        taxableAmount: taxableInBracket,
        tax: taxForBracket,
      });
    }
  }
  return { total: tax, breakdown };
}

// Add FilingStatus type for stricter typing
export type FilingStatus = 'single' | 'marriedJoint';

// Optionally, shared input or breakdown components can be added here for further deduplication.
