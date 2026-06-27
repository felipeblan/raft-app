import { Component, computed, inject, signal, effect } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-what-if-simulator',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './what-if-simulator.component.html'
})
export class WhatIfSimulatorComponent {
  store = inject(AppStateStore);

  mode = signal<'linked' | 'sim'>('linked');
  action = signal<'buy' | 'sell' | 'hold'>('buy');
  amount = signal<number | null>(null);
  price = signal<number>(0);

  constructor() {
    // Initialize price from store once available
    setTimeout(() => {
      if (this.store.liveBtcPrice() > 0 && this.price() === 0) {
        this.price.set(this.store.liveBtcPrice());
      }
    }, 1000);

    effect(() => {
      const prefill = this.store.whatIfPrefill();
      if (prefill) {
        this.mode.set('linked');
        this.action.set(prefill.action);
        this.amount.set(prefill.amount);
        if (this.store.liveBtcPrice() > 0) {
          this.price.set(this.store.liveBtcPrice());
        }
        // Using an async microtask or setTimeout to clear the state without causing recursion or ExpressionChanged errors
        setTimeout(() => this.store.clearWhatIfSimulatorPrefill(), 0);
      }
    });
  }

  btcPreview = computed(() => {
    const amt = this.amount() || 0;
    if (amt <= 0) return '';
    const livePrc = this.store.liveBtcPrice() || 1;
    if (this.store.userDisplayMode() === 'fiat') {
      if (this.action() === 'buy') {
        const prc = this.price() || livePrc;
        return `≈ ${(amt / prc).toFixed(4)} BTC`;
      } else {
        return `≈ ${(amt / livePrc).toFixed(4)} BTC`;
      }
    } else {
      if (this.action() === 'buy') {
        const prc = this.price() || livePrc;
        return `≈ ${(amt / prc).toFixed(4)} BTC`;
      } else {
        const prc = this.price() || livePrc;
        return `≈ ${this.store.currencySymbol()}${Math.round(amt * prc).toLocaleString()}`;
      }
    }
  });

  simResult = computed(() => {
    const act = this.action();
    const amt = this.amount() || 0;
    const prc = this.price() || this.store.liveBtcPrice() || 0;
    const livePrc = this.store.liveBtcPrice() || 1;
    const hasSurplus = this.store.hasSurplus();
    const netCashflow = this.store.netCashflow();
    const dailyShortfall = (!hasSurplus && this.store.fiatRunwayMonths()) ? Math.abs(netCashflow) / 30 : 0;
    const isLinked = this.mode() === 'linked';

    if (amt <= 0 || prc <= 0) return null;

    // Convert fiat input to BTC for Sell/Hold in fiat mode
    const isFiatMode = this.store.userDisplayMode() === 'fiat';
    const btcAmt = isFiatMode && act !== 'buy' ? amt / livePrc : amt;

    if (isLinked) {
      if (act === 'hold') {
        return { totalWorth: this.store.totalBtc() * prc };
      }

      if (hasSurplus && act === 'buy' && dailyShortfall === 0) {
        const newFiat = this.store.fiat() - amt;
        if (newFiat < 0) return { error: 'Insufficient fiat' };
        return { btcGained: amt / prc, newFiat };
      }

      if (hasSurplus && act === 'sell') {
        if (btcAmt > this.store.btc().liquid) return { error: 'Insufficient liquid BTC' };
        const fiatGained = isFiatMode ? (btcAmt * prc) : (amt * prc);
        return { fiatGained };
      }

      if (!hasSurplus && dailyShortfall > 0) {
        if (act === 'buy') {
          if (amt > this.store.fiat()) return { error: 'Insufficient fiat' };
          const deltaDays = -(amt / dailyShortfall);
          return { newFiat: this.store.fiat() - amt, deltaDays };
        }
        if (act === 'sell') {
          if (btcAmt > this.store.btc().liquid) return { error: 'Insufficient liquid BTC' };
          const fiatGained = isFiatMode ? (btcAmt * prc) : (amt * prc);
          const deltaDays = fiatGained / dailyShortfall;
          return { newFiat: this.store.fiat() + fiatGained, deltaDays };
        }
      }
    } else {
      // Sim mode
      if (act === 'buy') return { btcGained: amt / prc };
      if (act === 'sell') {
        const fiatGained = isFiatMode ? (btcAmt * prc) : (amt * prc);
        return { fiatGained };
      }
      return { totalWorth: btcAmt * prc }; // If holding 'btcAmt' BTC
    }

    return null;
  });
}
