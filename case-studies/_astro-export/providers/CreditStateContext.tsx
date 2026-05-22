import * as React from 'react';
import { useCreditState, type CreditInfo } from '@/lib/useCreditState';

const CreditStateContext = React.createContext<CreditInfo | null>(null);

export interface CreditStateProviderProps {
  children: React.ReactNode;
  /** Override initial credits for demo */
  initialCredits?: number;
  /** Override initial total for demo */
  initialTotal?: number;
}

export function CreditStateProvider({
  children,
  initialCredits,
  initialTotal,
}: CreditStateProviderProps) {
  const creditInfo = useCreditState(initialCredits, initialTotal);

  return (
    <CreditStateContext.Provider value={creditInfo}>
      {children}
    </CreditStateContext.Provider>
  );
}

export function useCreditContext(): CreditInfo {
  const ctx = React.useContext(CreditStateContext);
  if (!ctx) {
    throw new Error('useCreditContext must be used within a CreditStateProvider');
  }
  return ctx;
}

export { CreditStateContext };
