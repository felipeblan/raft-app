import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          // Register periodic sync if supported
          if ('periodicSync' in registration) {
            (registration as any).periodicSync.register('raft-alerts-check', {
              minInterval: 24 * 60 * 60 * 1000 // 1 day
            }).catch((err: any) => console.log('Periodic Sync could not be registered!', err));
          }
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  })
  .catch((err) => console.error(err));
