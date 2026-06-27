import { Component, inject } from '@angular/core';
import { IncomeSource } from '../../../core/models/app-state.model';
import { AppStateStore } from '../../../core/store/app-state.store';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-liquidity-cashflow',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './liquidity-cashflow.component.html'
})
export class LiquidityCashflowComponent {
  store = inject(AppStateStore);
  
  isModalOpen = false;
  
  updFiat: number = 0;
  updFiatCold: number = 0;
  updFiatLiquid: number = 0;
  updFiatMobile: number = 0;
  updMonthlySpending: number = 0;
  showSpendingTooltip = false;
  
  showIncomeForm = false;
  editingIncomeId: number | null = null;
  formIncomeName = '';
  formIncomeAmount: number | null = null;
  formIncomeFreq: 'monthly' | 'biweekly' | 'weekly' | 'custom' | 'irregular' = 'monthly';
  formIncomeCustomDays: string = '';
  
  openPositionModal() {
    this.updFiat = this.store.fiat();
    this.updMonthlySpending = this.store.monthlySpending() || 0;
    
    const btcPrice = this.store.liveBtcPrice() || 0;
    this.updFiatCold = Math.round((this.store.btc().cold || 0) * btcPrice);
    this.updFiatLiquid = Math.round((this.store.btc().liquid || 0) * btcPrice);
    this.updFiatMobile = Math.round((this.store.btc().mobile || 0) * btcPrice);
    
    this.isModalOpen = true;
    this.showIncomeForm = false;
  }
  
  closePositionModal() {
    this.isModalOpen = false;
  }
  
  savePosition() {
    const btcPrice = this.store.liveBtcPrice() || 1; // avoid division by 0
    const btcCold = this.updFiatCold / btcPrice;
    const btcLiquid = this.updFiatLiquid / btcPrice;
    const btcMobile = this.updFiatMobile / btcPrice;

    this.store.updatePosition(
      this.updFiat || 0,
      this.store.income(),
      this.updMonthlySpending || 0,
      btcCold || 0,
      btcLiquid || 0,
      btcMobile || 0
    );
    this.closePositionModal();
  }

  onMonthlySpendingFocus() {
    if (!localStorage.getItem('raft_has_seen_spending_tooltip')) {
      this.showSpendingTooltip = true;
    }
  }

  onMonthlySpendingInteraction() {
    if (this.showSpendingTooltip) {
      this.showSpendingTooltip = false;
      localStorage.setItem('raft_has_seen_spending_tooltip', 'true');
    }
  }

  getBtcPreview(fiatAmt: number) {
    if (this.store.liveBtcPrice() > 0) {
      return `≈ ${(fiatAmt / this.store.liveBtcPrice()).toFixed(4)} BTC`;
    }
    return 'Price unavailable';
  }

  openIncomeForm(source?: IncomeSource) {
    if (source) {
      this.editingIncomeId = source.id;
      this.formIncomeName = source.name;
      this.formIncomeAmount = source.amount;
      this.formIncomeFreq = source.frequency;
      this.formIncomeCustomDays = source.customDays ? source.customDays.join(', ') : '';
    } else {
      this.editingIncomeId = null;
      this.formIncomeName = '';
      this.formIncomeAmount = null;
      this.formIncomeFreq = 'monthly';
      this.formIncomeCustomDays = '';
    }
    this.showIncomeForm = true;
  }

  cancelIncomeForm() {
    this.showIncomeForm = false;
  }

  saveIncomeSource() {
    if (!this.formIncomeName || !this.formIncomeAmount) return;
    
    const customDays = this.formIncomeCustomDays.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));

    const source: Omit<IncomeSource, 'id'> = {
      name: this.formIncomeName,
      amount: this.formIncomeAmount,
      frequency: this.formIncomeFreq,
      customDays: this.formIncomeFreq === 'custom' ? customDays : undefined
    };

    if (this.editingIncomeId) {
      this.store.updateIncomeSource({ ...source, id: this.editingIncomeId });
    } else {
      this.store.addIncomeSource(source);
    }
    this.showIncomeForm = false;
  }

  deleteIncomeSource(id: number) {
    this.store.deleteIncomeSource(id);
  }
  
  importCSV(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;
      const lines = result.split('\n');
      const newBills = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 3) continue;
        const desc = cols[1]?.replace(/"/g, '').trim();
        const amount = parseFloat(cols[2]);
        if (desc && !isNaN(amount) && amount < 0) {
          newBills.push({ name: desc, amount: Math.abs(amount) });
        }
      }
      if (newBills.length > 0 && confirm(`Found ${newBills.length} potential bills. Add them?`)) {
        newBills.forEach(b => {
          this.store.addBill({ name: b.name, amount: b.amount, method: 'fiat', day: 1 });
        });
      }
    };
    reader.readAsText(file);
    // Clear the input so the same file can be selected again
    (event.target as HTMLInputElement).value = '';
  }
}


