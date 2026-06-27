import { Component, inject, signal, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateStore } from '../../../../core/store/app-state.store';
import { Html5Qrcode } from 'html5-qrcode';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-transfer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-transfer.component.html',
})
export class QrTransferComponent implements OnInit, OnDestroy {
  store = inject(AppStateStore);
  
  mode = signal<'select' | 'send' | 'receive'>('select');
  qrCodeUrl = signal<string | null>(null);
  scanError = signal('');
  scanSuccess = signal(false);
  html5QrCode: Html5Qrcode | null = null;
  
  close = output<void>();
  
  ngOnInit() {
  }
  
  ngOnDestroy() {
    this.stopScanner();
  }

  startSend() {
    this.mode.set('send');
    this.generateQrCode();
  }

  startReceive() {
    this.mode.set('receive');
    this.startScanner();
  }
  
  async generateQrCode() {
    try {
      // Create a payload. In a real app we might compress it (e.g. pako or LZString), 
      // but here we just stringify the state. A full state might be too big for a single QR,
      // but we will attempt it. (Standard QR code can hold ~3KB max)
      const stateToSave = {
        fiat: this.store.fiat(),
        income: this.store.income(),
        btc: this.store.btc(),
        obligations: this.store.obligations(),
        telemetry: this.store.telemetry(),
        currency: this.store.currency(),
        goalSats: this.store.goalSats(),
        goalUnit: this.store.goalUnit(),
        goalType: this.store.goalType(),
        goalRunwayMonths: this.store.goalRunwayMonths(),
        userDisplayMode: this.store.userDisplayMode(),
        passphraseHash: this.store.passphraseHash(),
        idleLockTimeout: this.store.idleLockTimeout(),
        runwayThresholdDays: this.store.runwayThresholdDays(),
        payday: this.store.payday(),
        incomeSources: this.store.incomeSources(),
        hasSeenFirstLaunchBackupBanner: this.store.hasSeenFirstLaunchBackupBanner(),
        history: this.store.history(),
      };
      
      const jsonStr = JSON.stringify(stateToSave);
      
      // Generate QR Code URL
      const url = await QRCode.toDataURL(jsonStr, { errorCorrectionLevel: 'L', width: 400 });
      this.qrCodeUrl.set(url);
      
      // Auto-dismiss after 60s
      setTimeout(() => {
        if (this.mode() === 'send') {
          this.mode.set('select');
          this.qrCodeUrl.set(null);
        }
      }, 60000);
      
    } catch (err) {
      console.error('Error generating QR', err);
      // In a real application, if it's too big, we'd chunk it or compress it.
      alert('Data is too large to fit in a single QR code. Use manual export/import.');
      this.mode.set('select');
    }
  }

  startScanner() {
    setTimeout(() => {
      this.html5QrCode = new Html5Qrcode("reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      this.html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        this.onScanSuccess(decodedText);
      }, (errorMessage) => {
        // parse error, ignore
      }).catch(err => {
        console.error("Camera start failed", err);
        this.scanError.set("Failed to access camera. Please allow camera permissions.");
      });
    }, 100);
  }

  stopScanner() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      this.html5QrCode.stop().then(() => {
        this.html5QrCode?.clear();
      }).catch(err => console.error(err));
    }
  }

  onScanSuccess(decodedText: string) {
    this.stopScanner();
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.fiat !== undefined && parsed.btc !== undefined) {
        this.store.importData(parsed);
        this.scanSuccess.set(true);
        setTimeout(() => {
          this.close.emit();
        }, 2000);
      } else {
        this.scanError.set('Invalid Raft QR code format.');
      }
    } catch (e) {
      this.scanError.set('Failed to decode QR data.');
    }
  }
}
