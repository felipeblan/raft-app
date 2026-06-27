import { Component, signal, inject, OnInit } from '@angular/core';
import { StatusCardComponent } from './status-card/status-card.component';
import { LiquidityCashflowComponent } from './liquidity-cashflow/liquidity-cashflow.component';
import { BillsComponent } from './bills/bills.component';
import { WhatIfSimulatorComponent } from './what-if-simulator/what-if-simulator.component';
import { TaxAwarenessComponent } from './tax-awareness/tax-awareness.component';
import { ManageBillsModalComponent } from './manage-bills-modal/manage-bills-modal.component';
import { WalletSweepComponent } from './wallet-sweep/wallet-sweep.component';
import { AppStateStore } from '../../core/store/app-state.store';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    StatusCardComponent,
    LiquidityCashflowComponent,
    BillsComponent,
    WhatIfSimulatorComponent,
    TaxAwarenessComponent,
    ManageBillsModalComponent,
    WalletSweepComponent,
    DecimalPipe
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  store = inject(AppStateStore);
  isModalOpen = signal(false);
  showPaydayPulse = signal(false);

  ngOnInit() {
    this.checkPaydayPulse();
  }

  checkPaydayPulse() {
    const paydays = this.store.payday();
    if (!paydays || paydays.length === 0) return;
    
    const today = new Date().getDate();
    if (paydays.includes(today)) {
      this.showPaydayPulse.set(true);
    }
  }

  dismissPaydayPulse() {
    this.showPaydayPulse.set(false);
  }
}

