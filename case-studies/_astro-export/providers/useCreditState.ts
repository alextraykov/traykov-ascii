import * as React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreditState = 'healthy' | 'warning' | 'low' | 'depleted';

export interface CreditSource {
  name: string;
  amount: number;
  expiry: string;
}

export type UsageRateTrend = 'up' | 'down' | 'neutral';

export interface CreditInfo {
  /** Current credit state derived from thresholds */
  creditState: CreditState;
  /** Credits remaining (abstract units) */
  creditsRemaining: number;
  /** Total credits in the current billing cycle */
  creditsTotal: number;
  /** Percentage remaining (0–100) */
  percentRemaining: number;
  /** Plan name */
  planName: string;
  /** When credits renew (ISO date string) */
  renewalDate: string;
  /** Formatted countdown to renewal (e.g. "2h : 15m") */
  renewalCountdown: string;
  /** Whether the banner has been dismissed for the current state */
  isBannerDismissed: boolean;
  /** Dismiss the banner — only reappears on state escalation */
  dismissBanner: () => void;
  /** Set credits remaining (for demo controls) */
  setCreditsRemaining: (credits: number) => void;
  /** Set total credits (for demo controls) */
  setCreditsTotal: (total: number) => void;
  /** Credit sources breakdown */
  creditSources: CreditSource[];
  /** Usage rate trend direction */
  usageRateTrend: UsageRateTrend;
  /** Usage rate display label */
  usageRateLabel: string;
  /** Estimated days remaining at current pace */
  estimatedDaysLeft: number | null;
}

// ─── Thresholds ──────────────────────────────────────────────────────────────

const THRESHOLDS = {
  WARNING: 20, // ≤20% remaining → warning
  LOW: 5,      // ≤5% remaining → low
} as const;

function deriveState(percentRemaining: number): CreditState {
  if (percentRemaining <= 0) return 'depleted';
  if (percentRemaining <= THRESHOLDS.LOW) return 'low';
  if (percentRemaining <= THRESHOLDS.WARNING) return 'warning';
  return 'healthy';
}

// ─── Countdown formatter ─────────────────────────────────────────────────────

function formatCountdown(renewalDate: string): string {
  const now = Date.now();
  const target = new Date(renewalDate).getTime();
  const diff = Math.max(0, target - now);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d : ${hours % 24}h`;
  }
  return `${hours}h : ${minutes.toString().padStart(2, '0')}m`;
}

// ─── State ordering for escalation tracking ──────────────────────────────────

const STATE_SEVERITY: Record<CreditState, number> = {
  healthy: 0,
  warning: 1,
  low: 2,
  depleted: 3,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCreditState(initialCredits = 18.4, initialTotal = 25): CreditInfo {
  const [creditsRemaining, setCreditsRemaining] = React.useState(initialCredits);
  const [creditsTotal, setCreditsTotal] = React.useState(initialTotal);
  const [dismissedAtState, setDismissedAtState] = React.useState<CreditState | null>(null);
  const [renewalCountdown, setRenewalCountdown] = React.useState('');

  // Mock renewal date: 1 hour and 3 minutes from now (matches screenshot)
  const renewalDate = React.useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, d.getMinutes() + 3);
    return d.toISOString();
  }, []);

  const percentRemaining = creditsTotal > 0
    ? Math.max(0, (creditsRemaining / creditsTotal) * 100)
    : 0;

  const creditState = deriveState(percentRemaining);

  // Update countdown every minute
  React.useEffect(() => {
    setRenewalCountdown(formatCountdown(renewalDate));
    const interval = setInterval(() => {
      setRenewalCountdown(formatCountdown(renewalDate));
    }, 60_000);
    return () => clearInterval(interval);
  }, [renewalDate]);

  // Reset dismissed state on escalation
  const isBannerDismissed = React.useMemo(() => {
    if (dismissedAtState === null) return false;
    // Banner is dismissed only if current state hasn't escalated past dismissed state
    return STATE_SEVERITY[creditState] <= STATE_SEVERITY[dismissedAtState];
  }, [creditState, dismissedAtState]);

  const dismissBanner = React.useCallback(() => {
    setDismissedAtState(creditState);
  }, [creditState]);

  // ─── Derived mock data for popover sections ─────────────────────────────────

  const creditSources = React.useMemo<CreditSource[]>(() => {
    const used = creditsTotal - creditsRemaining;
    return [
      { name: 'Plan allowance', amount: 20, expiry: 'Apr 15' },
      { name: 'Purchased', amount: 5, expiry: 'Jan 2027' },
      { name: 'Used this cycle', amount: -used, expiry: '' },
    ];
  }, [creditsTotal, creditsRemaining]);

  const estimatedDaysLeft = React.useMemo<number | null>(() => {
    if (creditsRemaining <= 0) return null;
    // Mock burn rate: ~0.92 credits/day
    const burnRate = 0.92;
    return Math.round(creditsRemaining / burnRate);
  }, [creditsRemaining]);

  const usageRateTrend = React.useMemo<UsageRateTrend>(() => {
    if (creditState === 'depleted') return 'neutral';
    if (percentRemaining <= 20) return 'up';
    return 'down';
  }, [creditState, percentRemaining]);

  const usageRateLabel = React.useMemo(() => {
    if (estimatedDaysLeft === null) return '';
    if (estimatedDaysLeft > 30) return 'On track this cycle';
    if (estimatedDaysLeft === 1) return '~1 day at current pace';
    return `~${estimatedDaysLeft} days at current pace`;
  }, [estimatedDaysLeft]);

  return {
    creditState,
    creditsRemaining,
    creditsTotal,
    percentRemaining,
    planName: 'Pave Solo',
    renewalDate,
    renewalCountdown,
    isBannerDismissed,
    dismissBanner,
    setCreditsRemaining,
    setCreditsTotal,
    creditSources,
    usageRateTrend,
    usageRateLabel,
    estimatedDaysLeft,
  };
}
