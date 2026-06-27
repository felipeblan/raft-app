import { Component, inject } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-tax-awareness',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './tax-awareness.component.html'
})
export class TaxAwarenessComponent {
  store = inject(AppStateStore);
}
