export interface AppState {
  fiat: number;
  income: number;
  incomeSources: IncomeSource[];
  monthlySpending: number;
  btc: { cold: number; liquid: number; mobile: number };
  obligations: Bill[];
  telemetry: {
    firstVisit: string;
    lastVisit: string;
    viewCount: number;
    updateCount: number;
    exportCount: number;
    importCount: number;
    lastBackupDate: string;
  };
  hasOnboarded: boolean;
  isPrivacyMode: boolean;
  liveBtcPrice: number;
  currency: string;
  goalSats: number;
  goalUnit: 'sats' | 'fiat';
  goalType: 'stacking' | 'runway';
  goalRunwayMonths: number;
  userDisplayMode: 'btc' | 'fiat';
  passphraseHash: string;
  idleLockTimeout: number;
  payday: number[];
  hasSeenFirstLaunchBackupBanner: boolean;
  isLocked: boolean;
  history: { date: string; runwayMonths: number; totalBtc: number }[];
  incomeChangeBanner: { message: string; isIncrease: boolean } | null;
  whatIfPrefill: { amount: number, action: 'buy' | 'sell' | 'hold' } | null;
  runwayThresholdDays: number;
}

export interface Bill {
  id: number;
  name: string;
  amount: number;
  method: 'fiat' | 'bridge'; // 'bridge' means paid via BTC
  day: number;
}

export interface IncomeSource {
  id: number;
  name: string;
  amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'custom' | 'irregular';
  customDays?: number[];
}

export const initialState: AppState = {
  fiat: 0,
  income: 0,
  incomeSources: [],
  monthlySpending: 0,
  btc: { cold: 0, liquid: 0, mobile: 0 },
  obligations: [],
  telemetry: {
    firstVisit: new Date().toISOString(),
    lastVisit: '',
    viewCount: 0,
    updateCount: 0,
    exportCount: 0,
    importCount: 0,
    lastBackupDate: '',
  },
  hasOnboarded: false,
  isPrivacyMode: false,
  liveBtcPrice: 0,
  currency: 'usd',
  goalSats: 0,
  goalUnit: 'sats',
  goalType: 'stacking',
  goalRunwayMonths: 6,
  userDisplayMode: 'btc',
  passphraseHash: '',
  idleLockTimeout: 300,
  payday: [],
  hasSeenFirstLaunchBackupBanner: false,
  isLocked: false,
  history: [],
  incomeChangeBanner: null,
  whatIfPrefill: null,
  runwayThresholdDays: 30,
};

