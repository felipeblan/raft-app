import { Component, inject, OnInit, signal } from '@angular/core';
import { AppStateStore } from './core/store/app-state.store';
import { BitcoinService } from './core/services/bitcoin.service';
import { ImportExportService } from './core/services/import-export.service';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { CurrencyPipe } from '@angular/common';
import { SecurityLockComponent } from './features/dashboard/security-lock/security-lock.component';
import { SettingsModalComponent } from './features/dashboard/settings-modal/settings-modal.component';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent, OnboardingComponent, CurrencyPipe, SecurityLockComponent, SettingsModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  host: {
    '(document:mousemove)': 'resetIdleTimer()',
    '(document:keypress)': 'resetIdleTimer()',
    '(document:mousedown)': 'resetIdleTimer()',
    '(document:touchstart)': 'resetIdleTimer()'
  }
})
export class AppComponent implements OnInit {
  store = inject(AppStateStore);
  bitcoinService = inject(BitcoinService);
  importExportService = inject(ImportExportService);

  isSettingsModalOpen = signal(false);
  private idleIntervalId: any;
  private lastActivityTime = Date.now();

  ngOnInit() {
    this.bitcoinService.fetchPrice();
    // Poll price every minute
    setInterval(() => this.bitcoinService.fetchPrice(), 60000);
    
    if (localStorage.getItem('raft_dark') === 'true') {
      document.documentElement.classList.add('dark');
    }

    // Set up idle check
    this.idleIntervalId = setInterval(() => this.checkIdleTime(), 1000);

    // Request notification permission if onboarded
    if (this.store.hasOnboarded() && 'Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission();
      }, 5000); // Ask after a short delay
    }

    // Fallback timer for alerts if periodic sync isn't supported/fired
    if (this.store.hasOnboarded() && 'serviceWorker' in navigator) {
      setInterval(() => {
        navigator.serviceWorker.ready.then(reg => {
          reg.active?.postMessage({ type: 'CHECK_ALERTS' });
        });
      }, 60 * 60 * 1000); // Check once an hour while open
    }
  }

  resetIdleTimer() {
    this.lastActivityTime = Date.now();
  }

  private checkIdleTime() {
    if (!this.store.hasOnboarded() || !this.store.passphraseHash() || this.store.isLocked()) {
      return;
    }
    const elapsedSeconds = (Date.now() - this.lastActivityTime) / 1000;
    if (elapsedSeconds >= this.store.idleLockTimeout()) {
      this.store.lock();
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.importExportService.importData(file);
    }
  }

  exportData() {
    const anon = confirm('Anonymize financial values before exporting?');
    this.importExportService.exportData(anon);
  }

  resetApp() {
    if (confirm('Erase all local data and restart onboarding?')) {
      this.store.resetApp();
    }
  }
  
  onCurrencyChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.store.setCurrency(target.value);
    this.bitcoinService.fetchPrice(); // Refetch price in new currency
  }

  onDisplayModeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.store.setDisplayMode(target.value as 'btc' | 'fiat');
  }
  
  toggleDarkMode() {
    const root = document.documentElement;
    root.classList.toggle('dark');
    const isDark = root.classList.contains('dark');
    localStorage.setItem('raft_dark', isDark ? 'true' : 'false');
  }
  
  printPage() {
    window.print();
  }
}

