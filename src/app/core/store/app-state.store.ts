import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { AppState, Bill, IncomeSource, initialState } from '../models/app-state.model';
import { computed } from '@angular/core';

function computeIncomeInfo(sources: IncomeSource[]) {
  let income = 0;
  const paydays = new Set<number>();

  sources.forEach(s => {
    let monthlyAmount = 0;
    if (s.frequency === 'monthly') {
      monthlyAmount = s.amount;
      paydays.add(1);
    } else if (s.frequency === 'biweekly') {
      monthlyAmount = s.amount * 2;
      paydays.add(1);
      paydays.add(15);
    } else if (s.frequency === 'weekly') {
      monthlyAmount = s.amount * (52 / 12);
      paydays.add(1);
      paydays.add(8);
      paydays.add(15);
      paydays.add(22);
    } else if (s.frequency === 'custom') {
      monthlyAmount = s.amount;
      if (s.customDays && s.customDays.length > 0) {
        s.customDays.forEach(d => paydays.add(d));
      } else {
        paydays.add(1);
      }
    } else if (s.frequency === 'irregular') {
      // average 0 for predictable monthly, or maybe just 0
      monthlyAmount = 0;
    }
    income += monthlyAmount;
  });

  return {
    income: Math.round(income),
    payday: Array.from(paydays).sort((a, b) => a - b)
  };
}

const STORAGE_KEY = 'raft_v1_data';

const IDB_NAME = 'RaftDB';
const IDB_VERSION = 1;
const STORE_NAME = 'stateStore';

function syncToIndexedDB(stateToSave: any) {
  try {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(stateToSave, STORAGE_KEY);
    };
  } catch (err) {
    console.error('Failed to sync to IndexedDB', err);
  }
}

export const AppStateStore = signalStore(
  { providedIn: 'root' },
  withState<AppState>(initialState),
  withComputed((state) => ({
    fiatBills: computed(() => state.obligations().filter((b) => b.method === 'fiat')),
    bridgeBills: computed(() => state.obligations().filter((b) => b.method === 'bridge')),
    totalFiatBills: computed(() => state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0)),
    totalBridgeBills: computed(() => state.obligations().filter((b) => b.method === 'bridge').reduce((acc, b) => acc + b.amount, 0)),
    netCashflow: computed(() => {
      const fiatObs = state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (state.monthlySpending() || 0);
      return state.income() - fiatObs;
    }),
    btcBridgeSpend: computed(() => {
      const bridgeObs = state.obligations().filter((b) => b.method === 'bridge').reduce((acc, b) => acc + b.amount, 0);
      return state.liveBtcPrice() > 0 && bridgeObs > 0 ? bridgeObs / state.liveBtcPrice() : 0;
    }),
    hasSurplus: computed(() => {
      const fiatObs = state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (state.monthlySpending() || 0);
      const net = state.income() - fiatObs;
      if (fiatObs === 0 && state.income() > 0) return true;
      return net >= 0;
    }),
    fiatRunwayMonths: computed(() => {
      const fiatObs = state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0);
      const net = state.income() - fiatObs;
      
      if (fiatObs === 0 && state.income() > 0) {
        return state.fiat() > 0 ? state.fiat() / (state.income() || 1) : null;
      } else if (net >= 0) {
        return fiatObs > 0 ? state.fiat() / fiatObs : (state.fiat() > 0 ? 999 : null);
      } else {
        const monthlyShortfall = Math.abs(net);
        return state.fiat() / monthlyShortfall;
      }
    }),
    adjustedFiatRunwayMonths: computed(() => {
      const fiatObs = state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (state.monthlySpending() || 0);
      const net = state.income() - fiatObs;
      
      if (fiatObs === 0 && state.income() > 0) {
        return state.fiat() > 0 ? state.fiat() / (state.income() || 1) : null;
      } else if (net >= 0) {
        return fiatObs > 0 ? state.fiat() / fiatObs : (state.fiat() > 0 ? 999 : null);
      } else {
        const monthlyShortfall = Math.abs(net);
        return state.fiat() / monthlyShortfall;
      }
    }),
    monthlyBtcCapacity: computed(() => {
      const fiatObs = state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (state.monthlySpending() || 0);
      const net = state.income() - fiatObs;
      let hasSurplus = false;
      if (fiatObs === 0 && state.income() > 0) {
        hasSurplus = true;
      } else {
        hasSurplus = net >= 0;
      }
      return (hasSurplus && state.liveBtcPrice() > 0) ? Math.max(0, net) / state.liveBtcPrice() : 0;
    }),
    totalBtc: computed(() => state.btc().cold + state.btc().liquid + state.btc().mobile),
    
    // Privacy-aware display values
    displayFiat: computed(() => state.isPrivacyMode() ? '****' : state.fiat().toString()),
    displayIncome: computed(() => state.isPrivacyMode() ? '****' : state.income().toString()),
    displayLiveBtcPrice: computed(() => state.isPrivacyMode() ? '****' : state.liveBtcPrice().toString()),
    displayNetCashflow: computed(() => state.isPrivacyMode() ? '****' : state.income() - (state.obligations().filter(b => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (state.monthlySpending() || 0))),
    displayBtcCapacity: computed(() => {
      if (state.isPrivacyMode()) return '****';
      const fiatObs = state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (state.monthlySpending() || 0);
      const net = state.income() - fiatObs;
      let hasSurplus = (fiatObs === 0 && state.income() > 0) || net >= 0;
      return (hasSurplus && state.liveBtcPrice() > 0) ? (Math.max(0, net) / state.liveBtcPrice()).toString() : '0';
    }),
    displayBtcBridgeSpend: computed(() => {
      if (state.isPrivacyMode()) return '****';
      const bridgeObs = state.obligations().filter((b) => b.method === 'bridge').reduce((acc, b) => acc + b.amount, 0);
      return state.liveBtcPrice() > 0 && bridgeObs > 0 ? (bridgeObs / state.liveBtcPrice()).toString() : '0';
    }),
    displayTotalFiatBills: computed(() => state.isPrivacyMode() ? '****' : state.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0).toString()),
    
    // Privacy-aware collections
    displayObligations: computed(() => state.obligations().map(b => ({
      ...b,
      displayAmount: state.isPrivacyMode() ? '****' : b.amount.toString()
    }))),
    displayBridgeBills: computed(() => state.obligations().filter(b => b.method === 'bridge').map(b => ({
      ...b,
      displayAmount: state.isPrivacyMode() ? '****' : b.amount.toString()
    }))),
    
    // New computed signals for currency & goals
    currencySymbol: computed(() => {
      const c = state.currency().toLowerCase();
      if (c === 'eur') return '€';
      if (c === 'gbp') return '£';
      if (c === 'jpy') return '¥';
      return '$';
    }),
    displayTotalBtc: computed(() => {
      const total = state.btc().cold + state.btc().liquid + state.btc().mobile;
      if (state.isPrivacyMode()) return '****';
      if (state.userDisplayMode() === 'fiat') {
        const val = total * state.liveBtcPrice();
        return `≈ ${state.currency().toUpperCase() === 'EUR' ? '€' : state.currency().toUpperCase() === 'GBP' ? '£' : state.currency().toUpperCase() === 'JPY' ? '¥' : '$'}${Math.round(val).toLocaleString()}`;
      }
      return `${total.toFixed(4)} BTC`;
    }),
    displayColdBtc: computed(() => {
      const val = state.btc().cold;
      if (state.isPrivacyMode()) return '****';
      if (state.userDisplayMode() === 'fiat') {
        const fiatVal = val * state.liveBtcPrice();
        return `≈ ${state.currency().toUpperCase() === 'EUR' ? '€' : state.currency().toUpperCase() === 'GBP' ? '£' : state.currency().toUpperCase() === 'JPY' ? '¥' : '$'}${Math.round(fiatVal).toLocaleString()}`;
      }
      return `${val.toFixed(4)} BTC`;
    }),
    displayLiquidBtc: computed(() => {
      const val = state.btc().liquid;
      if (state.isPrivacyMode()) return '****';
      if (state.userDisplayMode() === 'fiat') {
        const fiatVal = val * state.liveBtcPrice();
        return `≈ ${state.currency().toUpperCase() === 'EUR' ? '€' : state.currency().toUpperCase() === 'GBP' ? '£' : state.currency().toUpperCase() === 'JPY' ? '¥' : '$'}${Math.round(fiatVal).toLocaleString()}`;
      }
      return `${val.toFixed(4)} BTC`;
    }),
    displayMobileBtc: computed(() => {
      const val = state.btc().mobile;
      if (state.isPrivacyMode()) return '****';
      if (state.userDisplayMode() === 'fiat') {
        const fiatVal = val * state.liveBtcPrice();
        return `≈ ${state.currency().toUpperCase() === 'EUR' ? '€' : state.currency().toUpperCase() === 'GBP' ? '£' : state.currency().toUpperCase() === 'JPY' ? '¥' : '$'}${Math.round(fiatVal).toLocaleString()}`;
      }
      return `${val.toFixed(4)} BTC`;
    })
  })),
  withMethods((store) => {
    const saveToStorage = () => {
      const stateToSave = {
        fiat: store.fiat(),
        income: store.income(),
        monthlySpending: store.monthlySpending(),
        btc: store.btc(),
        obligations: store.obligations(),
        telemetry: store.telemetry(),
        currency: store.currency(),
        goalSats: store.goalSats(),
        goalUnit: store.goalUnit(),
        goalType: store.goalType(),
        goalRunwayMonths: store.goalRunwayMonths(),
        userDisplayMode: store.userDisplayMode(),
        passphraseHash: store.passphraseHash(),
        idleLockTimeout: store.idleLockTimeout(),
        runwayThresholdDays: store.runwayThresholdDays(),
        payday: store.payday(),
        incomeSources: store.incomeSources(),
        hasSeenFirstLaunchBackupBanner: store.hasSeenFirstLaunchBackupBanner(),
        history: store.history(),
        incomeChangeBanner: store.incomeChangeBanner()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      syncToIndexedDB(stateToSave);
    };

    return {
      loadFromStorage: () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            patchState(store, {
              fiat: parsed.fiat || 0,
              income: parsed.income || 0,
              monthlySpending: parsed.monthlySpending || 0,
              incomeSources: Array.isArray(parsed.incomeSources) ? parsed.incomeSources : [],
              btc: { cold: 0, liquid: 0, mobile: 0, ...(parsed.btc || {}) },
              obligations: Array.isArray(parsed.obligations) ? parsed.obligations : [],
              telemetry: parsed.telemetry || store.telemetry(),
              hasOnboarded: true, // If they have valid stored data, they're onboarded
              currency: parsed.currency || 'usd',
              goalSats: parsed.goalSats || 0,
              goalUnit: parsed.goalUnit || 'sats',
              goalType: parsed.goalType || 'stacking',
              goalRunwayMonths: parsed.goalRunwayMonths !== undefined ? parsed.goalRunwayMonths : 6,
              userDisplayMode: parsed.userDisplayMode || 'btc',
              passphraseHash: parsed.passphraseHash || '',
              idleLockTimeout: parsed.idleLockTimeout !== undefined ? parsed.idleLockTimeout : 300,
              runwayThresholdDays: parsed.runwayThresholdDays !== undefined ? parsed.runwayThresholdDays : 30,
              payday: Array.isArray(parsed.payday) ? parsed.payday : [],
              hasSeenFirstLaunchBackupBanner: !!parsed.hasSeenFirstLaunchBackupBanner,
              isLocked: !!parsed.passphraseHash,
              history: Array.isArray(parsed.history) ? parsed.history : [],
              incomeChangeBanner: parsed.incomeChangeBanner || null
            });
          } catch (e) {
            console.error('Failed to parse stored Raft data', e);
          }
        }
        
        const currencyPref = localStorage.getItem('raft_currency');
        if (currencyPref) {
          patchState(store, { currency: currencyPref });
        }
      },
      saveToStorage,
      completeOnboarding: (fiat: number, income: number, btcLiquid: number) => {
        patchState(store, (state) => ({
          fiat,
          income,
          btc: { ...state.btc, liquid: btcLiquid },
          hasOnboarded: true,
          telemetry: { ...state.telemetry, lastVisit: new Date().toISOString(), viewCount: state.telemetry.viewCount + 1 }
        }));
      },
      resetApp: () => {
        localStorage.removeItem(STORAGE_KEY);
        patchState(store, initialState);
      },
      setLiveBtcPrice: (price: number) => {
        patchState(store, { liveBtcPrice: price });
      },
      togglePrivacy: () => {
        patchState(store, { isPrivacyMode: !store.isPrivacyMode() });
      },
      addBill: (bill: Omit<Bill, 'id'>) => {
        const newBill = { ...bill, id: Date.now() };
        patchState(store, { obligations: [...store.obligations(), newBill] });
      },
      updateBill: (updatedBill: Bill) => {
        patchState(store, {
          obligations: store.obligations().map(b => b.id === updatedBill.id ? updatedBill : b)
        });
      },
      deleteBill: (id: number) => {
        patchState(store, {
          obligations: store.obligations().filter(b => b.id !== id)
        });
      },
      incrementExportCount: () => {
        patchState(store, (state) => ({
          telemetry: {
            ...state.telemetry,
            exportCount: state.telemetry.exportCount + 1,
            lastBackupDate: new Date().toISOString()
          }
        }));
        saveToStorage();
      },
      importData: (parsedData: any) => {
        patchState(store, (state) => ({
          ...state,
          ...parsedData,
          telemetry: { ...state.telemetry, importCount: state.telemetry.importCount + 1 }
        }));
      },
      setCurrency: (currency: string) => {
        localStorage.setItem('raft_currency', currency);
        patchState(store, { currency });
      },
      setGoalSats: (goalSats: number) => {
        patchState(store, { goalSats });
        saveToStorage();
      },
      setGoalUnit: (goalUnit: 'sats' | 'fiat') => {
        patchState(store, { goalUnit });
        saveToStorage();
      },
      setGoalType: (goalType: 'stacking' | 'runway') => {
        patchState(store, { goalType });
        saveToStorage();
      },
      setGoalRunwayMonths: (goalRunwayMonths: number) => {
        patchState(store, { goalRunwayMonths });
        saveToStorage();
      },
      setDisplayMode: (userDisplayMode: 'btc' | 'fiat') => {
        patchState(store, { userDisplayMode });
        saveToStorage();
      },
      setPassphraseHash: (passphraseHash: string) => {
        patchState(store, { passphraseHash, isLocked: false });
        saveToStorage();
      },
      setIdleLockTimeout: (idleLockTimeout: number) => {
        patchState(store, { idleLockTimeout });
        saveToStorage();
      },
      setRunwayThresholdDays: (runwayThresholdDays: number) => {
        patchState(store, { runwayThresholdDays });
        saveToStorage();
      },
      setPayday: (payday: number[]) => {
        patchState(store, { payday });
        saveToStorage();
      },
      addIncomeSource: (source: Omit<IncomeSource, 'id'>) => {
        const newSource = { ...source, id: Date.now() };
        const newSources = [...store.incomeSources(), newSource];
        const info = computeIncomeInfo(newSources);
        patchState(store, { incomeSources: newSources, income: info.income, payday: info.payday });
        saveToStorage();
      },
      updateIncomeSource: (source: IncomeSource) => {
        const newSources = store.incomeSources().map(s => s.id === source.id ? source : s);
        const info = computeIncomeInfo(newSources);
        patchState(store, { incomeSources: newSources, income: info.income, payday: info.payday });
        saveToStorage();
      },
      deleteIncomeSource: (id: number) => {
        const newSources = store.incomeSources().filter(s => s.id !== id);
        const info = computeIncomeInfo(newSources);
        patchState(store, { incomeSources: newSources, income: info.income, payday: info.payday });
        saveToStorage();
      },
      setWhatIfSimulatorPrefill: (amount: number, action: 'buy' | 'sell' | 'hold') => {
        patchState(store, { whatIfPrefill: { amount, action } });
      },
      clearWhatIfSimulatorPrefill: () => {
        patchState(store, { whatIfPrefill: null });
      },
      setHasSeenFirstLaunchBackupBanner: (hasSeenFirstLaunchBackupBanner: boolean) => {
        patchState(store, { hasSeenFirstLaunchBackupBanner });
        saveToStorage();
      },
      lock: () => {
        if (store.passphraseHash()) {
          patchState(store, { isLocked: true });
        }
      },
      unlock: () => {
        patchState(store, { isLocked: false });
      },
      dismissIncomeChangeBanner: () => {
        patchState(store, { incomeChangeBanner: null });
        saveToStorage();
      },
      updatePosition: (fiat: number, income: number, monthlySpending: number, btcCold: number, btcLiquid: number, btcMobile: number) => {
        const oldIncome = store.income();
        const oldCapacity = store.monthlyBtcCapacity();

        patchState(store, {
          fiat,
          income,
          monthlySpending,
          btc: { cold: btcCold, liquid: btcLiquid, mobile: btcMobile }
        });
        
        // Calculate new capacity
        const fiatObs = store.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (store.monthlySpending() || 0);
        const net = income - fiatObs;
        let hasSurplus = (fiatObs === 0 && income > 0) || net >= 0;
        const newCapacity = (hasSurplus && store.liveBtcPrice() > 0) ? Math.max(0, net) / store.liveBtcPrice() : 0;
        
        const incomeDiff = Math.abs(income - oldIncome);
        const capacityDiff = Math.abs(newCapacity - oldCapacity);
        
        const incomeChangedBy20 = oldIncome > 0 ? (incomeDiff / oldIncome) >= 0.2 : (income > 0 && oldIncome === 0);
        const capacityChangedBy20 = oldCapacity > 0 ? (capacityDiff / oldCapacity) >= 0.2 : (newCapacity > 0 && oldCapacity === 0);
        
        if (incomeChangedBy20 || capacityChangedBy20) {
          const isIncrease = newCapacity > oldCapacity || (newCapacity === oldCapacity && income > oldIncome);
          
          const formatSats = (capBtc: number) => {
            const sats = Math.round(capBtc * 100000000);
            if (sats >= 1000000) return (sats / 1000000).toFixed(1) + 'M';
            if (sats >= 1000) return (sats / 1000).toFixed(0) + 'K';
            return sats.toString();
          };
          
          const oldFormatted = formatSats(oldCapacity);
          const newFormatted = formatSats(newCapacity);
          
          let projectionStr = '';
          const goalType = store.goalType();
          if (goalType === 'stacking') {
            const goalSats = store.goalSats();
            const totalSats = (btcCold + btcLiquid + btcMobile) * 100000000;
            const capacitySats = newCapacity * 100000000;
            if (goalSats > 0 && totalSats < goalSats && capacitySats > 0) {
              const monthsRemaining = (goalSats - totalSats) / capacitySats;
              const targetDate = new Date();
              targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsRemaining));
              projectionStr = ` Your goal is now projected for ${targetDate.toLocaleDateString('en-US', { month: 'long' })}.`;
            } else if (goalSats > 0 && capacitySats <= 0) {
              projectionStr = ` Your goal projection is paused.`;
            }
          } else {
            const targetRunway = store.goalRunwayMonths();
            const currentFiat = fiat;
            const targetFiat = targetRunway * fiatObs;
            if (targetRunway > 0 && currentFiat < targetFiat && net > 0) {
              const monthsRemaining = (targetFiat - currentFiat) / net;
              const targetDate = new Date();
              targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsRemaining));
              projectionStr = ` Your goal is now projected for ${targetDate.toLocaleDateString('en-US', { month: 'long' })}.`;
            } else if (targetRunway > 0 && net <= 0) {
              projectionStr = ` Your goal projection is paused.`;
            }
          }
          
          const actionWord = isIncrease ? 'increased' : 'decreased';
          const directionWord = isIncrease ? 'up' : 'down';
          const capacityText = newCapacity === 0 && oldCapacity === 0 ? `monthly income ${actionWord}` : `stacking capacity ${actionWord} to ${newFormatted} sats/month (${directionWord} from ${oldFormatted})`;
          
          const message = `Your ${capacityText}.${projectionStr}`;
          
          patchState(store, {
            incomeChangeBanner: { message, isIncrease }
          });
        }

        saveToStorage();
      },
      saveSnapshot: () => {
        const fiatObs = store.obligations().filter((b) => b.method === 'fiat').reduce((acc, b) => acc + b.amount, 0) + (store.monthlySpending() || 0);
        const net = store.income() - fiatObs;
        let runwayMonths = 0;
        if (fiatObs === 0 && store.income() > 0) {
          runwayMonths = store.fiat() > 0 ? store.fiat() / store.income() : 0;
        } else if (net >= 0) {
          runwayMonths = fiatObs > 0 ? store.fiat() / fiatObs : (store.fiat() > 0 ? 999 : 0);
        } else {
          const monthlyShortfall = Math.abs(net);
          runwayMonths = store.fiat() / monthlyShortfall;
        }

        const totalBtc = store.btc().cold + store.btc().liquid + store.btc().mobile;
        const today = new Date().toISOString().split('T')[0];
        
        const history = [...store.history()];
        if (history.length > 0 && history[history.length - 1].date === today) {
          history[history.length - 1] = { date: today, runwayMonths, totalBtc };
        } else {
          history.push({ date: today, runwayMonths, totalBtc });
          if (history.length > 6) history.shift();
        }
        
        patchState(store, { history });
        saveToStorage();
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.loadFromStorage();
    }
  })
);
