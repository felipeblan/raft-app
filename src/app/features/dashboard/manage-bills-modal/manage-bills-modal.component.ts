import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { FormsModule } from '@angular/forms';
import { Bill } from '../../../core/models/app-state.model';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-manage-bills-modal',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './manage-bills-modal.component.html'
})
export class ManageBillsModalComponent {
  store = inject(AppStateStore);
  @Output() close = new EventEmitter<void>();

  // Form State
  editingId = signal<number | null>(null);
  formName = signal('');
  formAmount = signal<number | null>(null);
  formMethod = signal<'fiat' | 'bridge'>('fiat');
  formDay = signal<number | null>(null);

  // Calendar State
  showCalendar = signal(false);
  calYear = signal(new Date().getFullYear());
  calMonth = signal(new Date().getMonth());

  get calendarMonthName() {
    return new Date(this.calYear(), this.calMonth()).toLocaleString('default', { month: 'long' });
  }

  get emptyDays() {
    const firstDay = new Date(this.calYear(), this.calMonth(), 1).getDay();
    return Array(firstDay).fill(0);
  }

  get daysInMonth() {
    const days = new Date(this.calYear(), this.calMonth() + 1, 0).getDate();
    return Array.from({length: days}, (_, i) => i + 1);
  }

  toggleCalendar() {
    this.showCalendar.set(!this.showCalendar());
  }

  changeMonth(delta: number) {
    let m = this.calMonth() + delta;
    let y = this.calYear();
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    this.calMonth.set(m);
    this.calYear.set(y);
  }

  selectDay(day: number) {
    this.formDay.set(day);
    this.showCalendar.set(false);
  }

  editBill(bill: Bill) {
    this.editingId.set(bill.id);
    this.formName.set(bill.name);
    this.formAmount.set(bill.amount);
    this.formMethod.set(bill.method);
    this.formDay.set(bill.day);
    this.showCalendar.set(false);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.formName.set('');
    this.formAmount.set(null);
    this.formMethod.set('fiat');
    this.formDay.set(null);
    this.showCalendar.set(false);
  }

  deleteBill(id: number) {
    this.store.deleteBill(id);
    this.store.saveToStorage();
    if (this.editingId() === id) this.cancelEdit();
  }

  saveBill() {
    const name = this.formName().trim();
    const amount = this.formAmount();
    const method = this.formMethod();
    const day = this.formDay();

    if (!name || amount === null || amount <= 0 || !day) {
      alert('Please fill all fields correctly.');
      return;
    }

    if (this.editingId()) {
      this.store.updateBill({
        id: this.editingId()!,
        name,
        amount,
        method,
        day
      });
    } else {
      this.store.addBill({ name, amount, method, day });
    }
    
    this.store.saveToStorage();
    this.cancelEdit();
  }
}
