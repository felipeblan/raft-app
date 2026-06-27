import { Component, inject, signal } from '@angular/core';
import { AppStateStore } from '../../core/store/app-state.store';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css'
})
export class OnboardingComponent {
  private store = inject(AppStateStore);
  
  step = signal(1);
  selectedIncome = signal('fiat');
  fiatInput = signal<number | null>(null);
  incomeInput = signal<number | null>(null);
  btcUsdInput = signal<number | null>(null);

  incomeOptions = [
    { id: 'fiat', title: 'Entirely Fiat', desc: 'I earn in fiat and buy BTC manually.' },
    { id: 'hybrid', title: 'Hybrid (Fiat + BTC)', desc: 'Some income comes in BTC.' },
    { id: 'btc', title: 'Mostly BTC', desc: 'I convert BTC to fiat only for bills.' }
  ];

  nextStep() {
    this.step.set(2);
  }

  btcPreview() {
    const usd = this.btcUsdInput() || 0;
    const price = this.store.liveBtcPrice();
    return price > 0 ? usd / price : 0;
  }

  finish(skipped = false) {
    if (skipped) {
      this.store.completeOnboarding(0, 0, 0);
      this.store.saveToStorage();
      return;
    }
    
    const fiat = this.fiatInput() || 0;
    const income = this.incomeInput() || 0;
    const btcLiquid = this.btcPreview();
    
    this.store.completeOnboarding(fiat, income, btcLiquid);
    this.store.saveToStorage();
  }
}
