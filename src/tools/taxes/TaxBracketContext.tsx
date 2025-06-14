import { createContext, useContext, useEffect, useState } from 'react';
import type { FilingStatus, TaxBracket } from './taxUtils';

// Default brackets (from SCorpTaxCalculator, 2025)
const defaultFederalBrackets: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 11925, rate: 0.1 },
    { min: 11925, max: 48474, rate: 0.12 },
    { min: 48474, max: 103349, rate: 0.22 },
    { min: 103349, max: 197299, rate: 0.24 },
    { min: 197299, max: 250524, rate: 0.32 },
    { min: 250524, max: 626349, rate: 0.35 },
    { min: 626349, max: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
  marriedJoint: [
    { min: 0, max: 23200, rate: 0.1 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
};

const defaultOregonBrackets: TaxBracket[] = [
  { min: 0, max: 50000, rate: 0.08146 },
  { min: 50000, max: 125000, rate: 0.0875 },
  { min: 125000, max: Number.POSITIVE_INFINITY, rate: 0.099 },
];

export type TaxBracketContextType = {
  federalBrackets: Record<FilingStatus, TaxBracket[]>;
  setFederalBrackets: React.Dispatch<
    React.SetStateAction<Record<FilingStatus, TaxBracket[]>>
  >;
  oregonBrackets: TaxBracket[];
  setOregonBrackets: React.Dispatch<React.SetStateAction<TaxBracket[]>>;
};

const TaxBracketContext = createContext<TaxBracketContextType | undefined>(
  undefined,
);

export const TaxBracketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [federalBrackets, setFederalBrackets] = useState<
    Record<FilingStatus, TaxBracket[]>
  >(() => {
    const stored = localStorage.getItem('federalBrackets');
    return stored ? JSON.parse(stored) : defaultFederalBrackets;
  });
  const [oregonBrackets, setOregonBrackets] = useState<TaxBracket[]>(() => {
    const stored = localStorage.getItem('oregonBrackets');
    return stored ? JSON.parse(stored) : defaultOregonBrackets;
  });

  useEffect(() => {
    localStorage.setItem('federalBrackets', JSON.stringify(federalBrackets));
  }, [federalBrackets]);

  useEffect(() => {
    localStorage.setItem('oregonBrackets', JSON.stringify(oregonBrackets));
  }, [oregonBrackets]);

  return (
    <TaxBracketContext.Provider
      value={{
        federalBrackets,
        setFederalBrackets,
        oregonBrackets,
        setOregonBrackets,
      }}
    >
      {children}
    </TaxBracketContext.Provider>
  );
};

export function useTaxBrackets() {
  const ctx = useContext(TaxBracketContext);
  if (!ctx)
    throw new Error('useTaxBrackets must be used within a TaxBracketProvider');
  return ctx;
}
