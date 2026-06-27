import { Component, EventEmitter, Output, inject } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-bills',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './bills.component.html'
})
export class BillsComponent {
  store = inject(AppStateStore);
  @Output() manageBills = new EventEmitter<void>();

  sortedBills() {
    return [...this.store.obligations()].sort((a, b) => a.day - b.day);
  }

  nextDueAlert() {
    const allBills = this.store.obligations();
    if (allBills.length === 0) return 'No bills added yet.';
    
    const today = new Date().getDate();
    let nextFiat = null;
    let minDiff = 32;
    
    for (const b of allBills) {
      let diff = b.day - today;
      if (diff < 0) diff += 30;
      if (b.method === 'fiat' && diff < minDiff) {
        minDiff = diff;
        nextFiat = b;
      }
    }
    
    return nextFiat ? `Next fiat bill: ${nextFiat.name} on day ${nextFiat.day}` : 'No fiat bills in the calendar.';
  }
}
