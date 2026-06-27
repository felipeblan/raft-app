import { Injectable, inject } from '@angular/core';
import { AppStateStore } from '../store/app-state.store';

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private store = inject(AppStateStore);

  exportData(anonymize: boolean) {
    const currentState = {
      fiat: this.store.fiat(),
      income: this.store.income(),
      btc: this.store.btc(),
      obligations: this.store.obligations(),
      telemetry: this.store.telemetry()
    };

    let exportObj = JSON.parse(JSON.stringify(currentState));
    
    if (anonymize) {
      exportObj.fiat = 0;
      exportObj.income = 0;
      exportObj.btc = { cold: 0, liquid: 0, mobile: 0 };
      exportObj.obligations = exportObj.obligations.map((o: any) => ({ ...o, amount: 0 }));
    }

    this.store.incrementExportCount();
    this.store.saveToStorage();

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = anonymize ? 'raft-telemetry-anon.json' : 'raft-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (typeof parsed.fiat === 'number') {
          this.store.importData(parsed);
          this.store.saveToStorage();
          alert('Data imported successfully.');
        }
      } catch (error) {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
  }
}
