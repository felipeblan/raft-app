import { Component, inject, OnInit } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { BitcoinService } from '../../../core/services/bitcoin.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wallet-sweep',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-sweep.component.html',
})
export class WalletSweepComponent implements OnInit {
  store = inject(AppStateStore);
  bitcoinService = inject(BitcoinService);
  
  ngOnInit() {
    this.bitcoinService.fetchMempoolFees();
    setInterval(() => this.bitcoinService.fetchMempoolFees(), 60000);
  }
}

