import { Component, inject, signal, output, computed } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { ImportExportService } from '../../../core/services/import-export.service';
import { BitcoinService } from '../../../core/services/bitcoin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QrTransferComponent } from './qr-transfer/qr-transfer.component';

@Component({
  selector: 'app-settings-modal',
  imports: [CommonModule, FormsModule, QrTransferComponent],
  template: `
    <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg animate-fade-in my-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h2>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-4 border-b border-gray-100 dark:border-slate-800 pb-2 mb-6">
          <button 
            (click)="activeTab.set('security')" 
            class="text-sm pb-1.5 transition-all outline-none" 
            [class.border-b-2]="activeTab() === 'security'"
            [class.border-orange-500]="activeTab() === 'security'"
            [class.text-orange-600]="activeTab() === 'security'"
            [class.font-semibold]="activeTab() === 'security'"
            [class.text-gray-500]="activeTab() !== 'security'"
          >
            Security
          </button>
          <button 
            (click)="activeTab.set('paydays')" 
            class="text-sm pb-1.5 transition-all outline-none" 
            [class.border-b-2]="activeTab() === 'paydays'"
            [class.border-orange-500]="activeTab() === 'paydays'"
            [class.text-orange-600]="activeTab() === 'paydays'"
            [class.font-semibold]="activeTab() === 'paydays'"
            [class.text-gray-500]="activeTab() !== 'paydays'"
          >
            Paydays
          </button>
          <button 
            (click)="activeTab.set('preferences')" 
            class="text-sm pb-1.5 transition-all outline-none" 
            [class.border-b-2]="activeTab() === 'preferences'"
            [class.border-orange-500]="activeTab() === 'preferences'"
            [class.text-orange-600]="activeTab() === 'preferences'"
            [class.font-semibold]="activeTab() === 'preferences'"
            [class.text-gray-500]="activeTab() !== 'preferences'"
          >
            Preferences & Backups
          </button>
        </div>

        <!-- Security Tab -->
        @if (activeTab() === 'security') {
          <div class="flex flex-col gap-6">
            @if (store.passphraseHash()) {
              <!-- Passphrase is set -->
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <span class="text-sm font-semibold text-gray-700 dark:text-slate-200">Passphrase protection is ACTIVE</span>
                </div>
                <p class="text-xs text-gray-500">The app will prompt for this passphrase on load and after inactivity.</p>
              </div>

              <div class="border-t border-gray-100 dark:border-slate-800 pt-4 flex flex-col gap-4">
                <h4 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Change or Disable Passphrase</h4>
                
                <div>
                  <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-300">Current Passphrase</label>
                  <input type="password" [(ngModel)]="currentPassphrase" placeholder="••••••••" class="w-full border rounded-md p-2 text-sm">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-300">New Passphrase (optional)</label>
                    <input type="password" [(ngModel)]="newPassphrase" placeholder="New passphrase" class="w-full border rounded-md p-2 text-sm">
                  </div>
                  <div>
                    <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-300">Confirm New Passphrase</label>
                    <input type="password" [(ngModel)]="confirmPassphrase" placeholder="Confirm new passphrase" class="w-full border rounded-md p-2 text-sm">
                  </div>
                </div>

                @if (securityError()) {
                  <span class="text-xs text-red-500 font-medium">{{ securityError() }}</span>
                }
                @if (securitySuccess()) {
                  <span class="text-xs text-green-600 font-medium">{{ securitySuccess() }}</span>
                }

                <div class="flex gap-3 mt-2">
                  <button (click)="changePassphrase()" class="px-4 py-2 bg-gray-900 dark:bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-gray-800 transition-colors">
                    Update Passphrase
                  </button>
                  <button (click)="disablePassphrase()" class="px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-md text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                    Disable Passphrase
                  </button>
                </div>
              </div>
            } @else {
              <!-- Set new passphrase -->
              <div class="flex flex-col gap-4">
                <div class="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-lg p-4">
                  <p class="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                    Set a passphrase to encrypt/lock your dashboard values. Since Raft is completely local-first, the passphrase is never sent to a server. Only a local secure hash is saved on this device. **If you lose this passphrase, you will have to reset the app, which erases all stored data.**
                  </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-300">Enter Passphrase</label>
                    <input type="password" [(ngModel)]="newPassphrase" placeholder="e.g. correct horse battery staple" class="w-full border rounded-md p-2 text-sm">
                  </div>
                  <div>
                    <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-300">Confirm Passphrase</label>
                    <input type="password" [(ngModel)]="confirmPassphrase" placeholder="Type it again" class="w-full border rounded-md p-2 text-sm">
                  </div>
                </div>

                @if (securityError()) {
                  <span class="text-xs text-red-500 font-medium">{{ securityError() }}</span>
                }
                @if (securitySuccess()) {
                  <span class="text-xs text-green-600 font-medium">{{ securitySuccess() }}</span>
                }

                <div>
                  <button (click)="enablePassphrase()" class="px-5 py-2.5 bg-orange-600 text-white rounded-md text-xs font-semibold hover:bg-orange-700 transition-colors">
                    Enable Passphrase Lock
                  </button>
                </div>
              </div>
            }

            <!-- Idle Timeout Configuration -->
            <div class="border-t border-gray-100 dark:border-slate-800 pt-4">
              <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-300">Auto-Lock Inactivity Timeout</label>
              <select [value]="store.idleLockTimeout()" (change)="onTimeoutChange($event)" class="border rounded px-2 py-1.5 text-sm w-full sm:w-48 bg-white dark:bg-slate-800">
                <option value="60">1 Minute</option>
                <option value="300">5 Minutes</option>
                <option value="900">15 Minutes</option>
                <option value="1800">30 Minutes</option>
                <option value="0">Never Auto-Lock</option>
              </select>
              <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">If passphrase protection is active, the app locks itself after being idle for this duration.</p>
            </div>
          </div>
        }

        <!-- Paydays Tab -->
        @if (activeTab() === 'paydays') {
          <div class="flex flex-col gap-4">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200">Select paydays of the month</h3>
            <p class="text-xs text-gray-500">Pick the day(s) you receive regular paychecks. This activates the Payday Pulse banner summary on those specific days.</p>
            
            <div class="grid grid-cols-7 gap-2 p-4 bg-gray-50 dark:bg-slate-850 rounded-lg border border-gray-150 dark:border-slate-800 select-none">
              <!-- Grid from 1 to 31 -->
              @for (day of calendarDays; track day) {
                <button 
                  (click)="togglePayday(day)"
                  class="w-full aspect-square text-xs font-medium rounded-full flex items-center justify-center transition-colors border"
                  [class.bg-orange-600]="isDaySelected(day)"
                  [class.text-white]="isDaySelected(day)"
                  [class.border-orange-600]="isDaySelected(day)"
                  [class.bg-white]="!isDaySelected(day)"
                  [class.dark:bg-slate-800]="!isDaySelected(day)"
                  [class.text-gray-700]="!isDaySelected(day)"
                  [class.dark:text-slate-300]="!isDaySelected(day)"
                  [class.border-gray-200]="!isDaySelected(day)"
                  [class.dark:border-slate-700]="!isDaySelected(day)"
                  [class.hover:bg-gray-100]="!isDaySelected(day)"
                  [class.dark:hover:bg-slate-700]="!isDaySelected(day)"
                >
                  {{ day }}
                </button>
              }
              
              <!-- Special button for last day of month -->
              <button 
                (click)="togglePayday(99)"
                class="col-span-7 py-2 text-xs font-semibold rounded-md flex items-center justify-center transition-colors border mt-2"
                [class.bg-orange-600]="isDaySelected(99)"
                [class.text-white]="isDaySelected(99)"
                [class.border-orange-600]="isDaySelected(99)"
                [class.bg-white]="!isDaySelected(99)"
                [class.dark:bg-slate-800]="!isDaySelected(99)"
                [class.text-gray-700]="!isDaySelected(99)"
                [class.dark:text-slate-300]="!isDaySelected(99)"
                [class.border-gray-200]="!isDaySelected(99)"
                [class.dark:border-slate-700]="!isDaySelected(99)"
                [class.hover:bg-gray-100]="!isDaySelected(99)"
                [class.dark:hover:bg-slate-700]="!isDaySelected(99)"
              >
                Last day of the month
              </button>
            </div>
            
            <div class="flex justify-end gap-2 mt-4">
              <button (click)="clearPaydays()" class="px-3 py-1.5 border rounded-md text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Clear All</button>
            </div>
          </div>
        }

        <!-- Preferences & Backups Tab -->
        @if (activeTab() === 'preferences') {
          <div class="flex flex-col gap-6">
            <!-- App-level controls moved from Nav -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-350">Display Mode</label>
                <select [value]="store.userDisplayMode()" (change)="onDisplayChange($event)" class="text-sm border rounded px-2 py-1.5 w-full bg-white dark:bg-slate-800">
                  <option value="btc">Show in BTC</option>
                  <option value="fiat">Show in Fiat</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-350">App Theme</label>
                <button (click)="toggleDarkMode()" class="text-sm border rounded px-3 py-1.5 w-full text-left bg-white dark:bg-slate-800 flex items-center justify-between">
                  <span>Toggle Dark/Light Mode</span>
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </button>
              </div>
              <div>
                <label class="text-xs font-medium block mb-1 text-gray-700 dark:text-slate-350">Runway Alert Threshold</label>
                <select [value]="store.runwayThresholdDays()" (change)="onThresholdChange($event)" class="text-sm border rounded px-2 py-1.5 w-full bg-white dark:bg-slate-800">
                  <option value="15">15 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>

            <!-- Import/Export & Resets -->
            <div class="flex flex-col gap-4">
              <h4 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Data Operations</h4>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button (click)="triggerExport(false)" class="flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md p-3 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-colors">
                  <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Export Wallet Backup
                </button>
                <button (click)="triggerExport(true)" class="flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md p-3 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-colors">
                  <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Export Anonymized JSON
                </button>
              </div>

              <div>
                <input type="file" #fileInput class="hidden" accept=".json" (change)="onFileSelected($event)">
                <button (click)="fileInput.click()" class="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md p-3 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-colors">
                  <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Import Wallet Backup (.json)
                </button>
              </div>

              <!-- QR Transfer Section -->
              <div class="mt-2 border-t border-gray-100 dark:border-slate-800 pt-4">
                <button (click)="isQrTransferOpen.set(true)" class="w-full flex items-center justify-between border border-orange-200 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-900/40 rounded-md p-3 transition-colors text-left">
                  <div>
                    <h5 class="text-xs font-bold text-orange-800 dark:text-orange-400">Device Transfer (QR Code)</h5>
                    <p class="text-xs text-orange-700 dark:text-orange-300 mt-0.5">Move data securely between devices</p>
                  </div>
                  <svg class="w-5 h-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
                </button>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="border-t border-red-100 dark:border-red-950/20 pt-4 flex flex-col gap-4">
              <h4 class="text-xs font-bold text-red-500 uppercase tracking-wider">Danger Zone</h4>
              
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h5 class="text-xs font-bold text-gray-900 dark:text-white">Delete All App Data</h5>
                  <p class="text-xs text-gray-500">Wipe browser memory and restart onboarding. Ensure you have a backup.</p>
                </div>
                <button (click)="resetApp()" class="px-4 py-2 border border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-md text-xs font-semibold transition-colors">
                  Reset App
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Footer -->
        <div class="flex justify-end gap-3 mt-8 border-t border-gray-100 dark:border-slate-800 pt-4">
          <button (click)="close.emit()" class="px-5 py-2.5 bg-gray-900 dark:bg-slate-800 text-white rounded-md text-sm font-semibold hover:bg-gray-800 transition-colors">Close Settings</button>
        </div>
      </div>
    </div>

    @if (isQrTransferOpen()) {
      <app-qr-transfer (close)="isQrTransferOpen.set(false)"></app-qr-transfer>
    }
  `
})
export class SettingsModalComponent {
  store = inject(AppStateStore);
  importExportService = inject(ImportExportService);
  bitcoinService = inject(BitcoinService);

  close = output<void>();

  activeTab = signal<'security' | 'paydays' | 'preferences'>('security');
  isQrTransferOpen = signal(false);

  // Security tab states
  newPassphrase = signal('');
  confirmPassphrase = signal('');
  currentPassphrase = signal('');
  securityError = signal('');
  securitySuccess = signal('');

  calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async enablePassphrase() {
    this.securityError.set('');
    this.securitySuccess.set('');

    const nw = this.newPassphrase().trim();
    const cf = this.confirmPassphrase().trim();

    if (!nw) {
      this.securityError.set('Passphrase cannot be empty.');
      return;
    }
    if (nw !== cf) {
      this.securityError.set('Passphrases do not match.');
      return;
    }

    const hashed = await this.sha256(nw);
    this.store.setPassphraseHash(hashed);
    
    this.newPassphrase.set('');
    this.confirmPassphrase.set('');
    this.securitySuccess.set('Passphrase set successfully!');
  }

  async changePassphrase() {
    this.securityError.set('');
    this.securitySuccess.set('');

    const curr = this.currentPassphrase().trim();
    const nw = this.newPassphrase().trim();
    const cf = this.confirmPassphrase().trim();

    if (!curr) {
      this.securityError.set('Please enter current passphrase.');
      return;
    }

    const currHash = await this.sha256(curr);
    if (currHash !== this.store.passphraseHash()) {
      this.securityError.set('Current passphrase is incorrect.');
      return;
    }

    if (!nw) {
      this.securityError.set('New passphrase cannot be empty.');
      return;
    }
    if (nw !== cf) {
      this.securityError.set('New passphrases do not match.');
      return;
    }

    const newHash = await this.sha256(nw);
    this.store.setPassphraseHash(newHash);

    this.currentPassphrase.set('');
    this.newPassphrase.set('');
    this.confirmPassphrase.set('');
    this.securitySuccess.set('Passphrase updated successfully!');
  }

  async disablePassphrase() {
    this.securityError.set('');
    this.securitySuccess.set('');

    const curr = this.currentPassphrase().trim();

    if (!curr) {
      this.securityError.set('Please enter current passphrase to disable.');
      return;
    }

    const currHash = await this.sha256(curr);
    if (currHash !== this.store.passphraseHash()) {
      this.securityError.set('Current passphrase is incorrect.');
      return;
    }

    this.store.setPassphraseHash('');
    this.currentPassphrase.set('');
    this.newPassphrase.set('');
    this.confirmPassphrase.set('');
    this.securitySuccess.set('Passphrase protection disabled.');
  }

  onTimeoutChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.store.setIdleLockTimeout(parseInt(target.value));
  }

  // Paydays Management
  isDaySelected(day: number): boolean {
    return this.store.payday().includes(day);
  }

  togglePayday(day: number) {
    const currentPaydays = [...this.store.payday()];
    const index = currentPaydays.indexOf(day);
    if (index > -1) {
      currentPaydays.splice(index, 1);
    } else {
      currentPaydays.push(day);
    }
    this.store.setPayday(currentPaydays);
  }

  clearPaydays() {
    this.store.setPayday([]);
  }

  // Preferences
  onDisplayChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.store.setDisplayMode(target.value as 'btc' | 'fiat');
  }

  toggleDarkMode() {
    const root = document.documentElement;
    root.classList.toggle('dark');
    const isDark = root.classList.contains('dark');
    localStorage.setItem('raft_dark', isDark ? 'true' : 'false');
  }

  onThresholdChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.store.setRunwayThresholdDays(parseInt(target.value, 10));
  }

  triggerExport(anon: boolean) {
    this.importExportService.exportData(anon);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.importExportService.importData(file);
    }
  }

  resetApp() {
    if (confirm('Erase all local data and restart onboarding?')) {
      this.store.resetApp();
      this.close.emit();
    }
  }
}
