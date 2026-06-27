import { Component, inject, signal } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-security-lock',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-950 flex items-center justify-center p-4 z-50 text-white select-none">
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in">
        <div class="w-16 h-16 bg-orange-600/20 border border-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        
        <h2 class="text-xl font-bold tracking-tight mb-2">Raft is Locked</h2>
        <p class="text-sm text-slate-400 mb-6">Enter your security passphrase to view your dashboard.</p>
        
        <form (submit)="unlockApp($event)" class="flex flex-col gap-4">
          <input 
            type="password" 
            [(ngModel)]="passphrase" 
            name="passphrase"
            [disabled]="isWaiting()"
            placeholder="Enter Passphrase" 
            class="w-full text-center border border-slate-700 bg-slate-950 text-white rounded-md p-3 focus:border-orange-500"
            autofocus
          >
          
          @if (errorMsg()) {
            <div class="text-xs text-red-400 font-medium animate-pulse">{{ errorMsg() }}</div>
          }
          
          <button 
            type="submit" 
            [disabled]="isWaiting() || !passphrase()" 
            class="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-md py-3 font-semibold transition-colors disabled:bg-slate-800 disabled:text-slate-500"
          >
            @if (isWaiting()) { Please wait... } @else { Unlock }
          </button>
        </form>
        
        <div class="mt-8 pt-6 border-t border-slate-800">
          <button 
            (click)="confirmReset()" 
            class="text-xs text-slate-500 hover:text-red-400 transition-colors underline"
          >
            Forgot passphrase? Reset Raft
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SecurityLockComponent {
  store = inject(AppStateStore);
  
  passphrase = signal('');
  isWaiting = signal(false);
  errorMsg = signal('');

  async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async unlockApp(event: Event) {
    event.preventDefault();
    if (this.isWaiting() || !this.passphrase()) return;
    
    this.errorMsg.set('');
    this.isWaiting.set(true);
    
    const hashed = await this.sha256(this.passphrase());
    
    if (hashed === this.store.passphraseHash()) {
      this.store.unlock();
      this.isWaiting.set(false);
      this.passphrase.set('');
    } else {
      this.errorMsg.set('Incorrect passphrase.');
      // Enforce a short delay to limit speed
      setTimeout(() => {
        this.isWaiting.set(false);
        this.passphrase.set('');
      }, 1500);
    }
  }

  confirmReset() {
    const confirmed = confirm(
      'WARNING: Resetting Raft will completely erase all your data in this browser, including wallet balances and configurations. This cannot be undone. Are you sure you want to proceed?'
    );
    if (confirmed) {
      this.store.resetApp();
    }
  }
}
