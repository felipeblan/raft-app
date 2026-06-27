import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppStateStore } from '../store/app-state.store';

@Injectable({ providedIn: 'root' })
export class BitcoinService {
  private http = inject(HttpClient);
  private store = inject(AppStateStore);
  
  mempoolFee = signal<number | null>(null);

  fetchPrice() {
    const currency = this.store.currency() || 'usd';
    this.http.get<any>(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency}`)
      .subscribe({
        next: (res) => {
          const price = res?.bitcoin?.[currency];
          if (price) {
            this.store.setLiveBtcPrice(price);
          }
        },
        error: (err) => console.error('Failed to fetch BTC price', err)
      });
  }
  
  fetchMempoolFees() {
    this.http.get<any>('https://mempool.space/api/v1/fees/recommended')
      .subscribe({
        next: (res) => {
          if (res?.fastestFee) {
            this.mempoolFee.set(res.fastestFee);
          }
        },
        error: (err) => console.error('Failed to fetch mempool fees', err)
      });
  }
}

