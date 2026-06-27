import { Component, inject, OnInit, signal } from '@angular/core';
import { AppStateStore } from '../../../core/store/app-state.store';
import { ImportExportService } from '../../../core/services/import-export.service';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-status-card',
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './status-card.component.html'
})
export class StatusCardComponent implements OnInit {
  store = inject(AppStateStore);
  importExportService = inject(ImportExportService);
  
  isGoalModalOpen = false;
  tempGoalType: 'stacking' | 'runway' = 'stacking';
  tempGoalUnit: 'sats' | 'fiat' = 'sats';
  tempGoalSats: number | null = null;
  tempGoalRunwayMonths: number | null = null;

  // Payday pulse state
  showPaydayPulse = signal(false);
  paydayPulseMessage = signal('');

  // Backup banners state
  showFirstLaunchBanner = signal(false);
  showBackupNudge = signal(false);

  ngOnInit() {
    this.checkPayday();
    this.checkBackupStatus();
  }

  isLowRunway() {
    return !this.store.hasSurplus() && this.store.fiatRunwayMonths() !== null && this.store.fiatRunwayMonths()! < 3;
  }

  runwayMainText() {
    const rm = this.store.fiatRunwayMonths();
    if (this.store.hasSurplus()) {
      if (this.store.totalFiatBills() === 0 && this.store.income() === 0 && this.store.fiat() > 0) return `${this.store.currencySymbol()}${this.store.fiat().toLocaleString()}`;
      if (this.store.totalFiatBills() === 0 && this.store.fiat() === 0) return '--';
      return rm !== null ? `${Math.round(rm * 10) / 10} months` : '--';
    } else {
      return rm !== null ? `${Math.round(rm * 30)} days` : '0 days';
    }
  }

  adjustedRunwayText() {
    const rm = this.store.adjustedFiatRunwayMonths();
    if (this.store.hasSurplus()) {
      if (this.store.totalFiatBills() === 0 && this.store.income() === 0 && this.store.fiat() > 0) return null;
      if (this.store.totalFiatBills() === 0 && this.store.fiat() === 0) return null;
      return rm !== null ? `${Math.round(rm * 10) / 10} months` : null;
    } else {
      return rm !== null ? `${Math.round(rm * 30)} days` : null;
    }
  }

  runwaySubText() {
    const rm = this.store.fiatRunwayMonths();
    if (this.store.hasSurplus()) {
      if (this.store.totalFiatBills() === 0 && this.store.income() > 0 && this.store.fiat() > 0) return 'of income saved — no bills draining fiat';
      if (this.store.totalFiatBills() === 0 && this.store.income() === 0 && this.store.fiat() > 0) return 'saved — add income or bills to see runway';
      if (this.store.totalFiatBills() === 0 && this.store.fiat() === 0) return 'No fiat data yet — add bills or income';
      return 'of bills covered by savings';
    } else {
      if (rm !== null) {
        const d = new Date(Date.now() + rm * 30 * 86400000);
        return 'Decision point: ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return '';
    }
  }

  runwayPercentage() {
    const rm = this.store.fiatRunwayMonths();
    if (rm === null) return 0;
    return Math.min(100, Math.max(0, (rm / 12) * 100));
  }
  
  runwayBarLabel() {
    const rm = this.store.fiatRunwayMonths();
    if (rm === null) return '--';
    if (rm >= 12) return '1+ Year Runway';
    if (rm >= 6) return '6+ Months Runway';
    return 'Short Runway';
  }

  capacityMainText() {
    const cap = this.store.monthlyBtcCapacity();
    if (this.store.hasSurplus() && cap > 0) {
      const sats = Math.round(cap * 100000000);
      if (sats >= 1000000) return (sats / 1000000).toFixed(1) + 'M sats';
      if (sats >= 1000) return (sats / 1000).toFixed(0) + 'K sats';
      return sats.toLocaleString() + ' sats';
    }
    return '--';
  }

  capacitySubText() {
    const cap = this.store.monthlyBtcCapacity();
    if (this.store.hasSurplus() && cap > 0) return `≈ ${cap.toFixed(5)} BTC/month`;
    if (this.store.hasSurplus() && this.store.netCashflow() === 0) return 'Income exactly matches bills';
    if (!this.store.hasSurplus()) return 'No surplus for stacking right now';
    return 'Add income and bills to calculate';
  }

  statusMessage() {
    if (this.store.hasSurplus() && this.store.monthlyBtcCapacity() > 0) return 'Your income covers your fiat bills — you have room to stack each month if you choose to.';
    if (this.store.hasSurplus() && this.store.netCashflow() === 0) return 'Your income matches your bills exactly — no surplus but no shortfall either.';
    if (!this.store.hasSurplus() && this.store.fiatRunwayMonths() !== null) {
      const d = new Date(Date.now() + this.store.fiatRunwayMonths()! * 30 * 86400000);
      return `Your fiat is on track to run out around ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} if income and bills stay the same.`;
    }
    return 'Add your income and bills to see your position.';
  }

  // Dynamic Goal configurations
  goalProgressPercentage() {
    const goalType = this.store.goalType();
    if (goalType === 'stacking') {
      const goalAmount = this.store.goalSats();
      if (goalAmount === 0) return 0;
      const unit = this.store.goalUnit();
      const currentCapBtc = this.store.monthlyBtcCapacity();
      
      if (unit === 'sats') {
        const currentCapSats = currentCapBtc * 100000000;
        return Math.min(100, Math.max(0, (currentCapSats / goalAmount) * 100));
      } else {
        const currentCapFiat = currentCapBtc * this.store.liveBtcPrice();
        return Math.min(100, Math.max(0, (currentCapFiat / goalAmount) * 100));
      }
    } else {
      const goal = this.store.goalRunwayMonths();
      if (goal === 0) return 0;
      const currentRunway = this.store.fiatRunwayMonths() || 0;
      return Math.min(100, Math.max(0, (currentRunway / goal) * 100));
    }
  }

  goalDisplayLabel() {
    const goalType = this.store.goalType();
    if (goalType === 'stacking') {
      const goalAmount = this.store.goalSats();
      if (goalAmount === 0) return 'No goal set';
      const unit = this.store.goalUnit();
      const symbol = this.store.currencySymbol();
      
      if (unit === 'sats') {
        const formattedSats = goalAmount.toLocaleString();
        const btc = goalAmount / 100000000;
        const fiatVal = Math.round(btc * this.store.liveBtcPrice());
        return `${formattedSats} sats (≈ ${symbol}${fiatVal.toLocaleString()} today)`;
      } else {
        const formattedFiat = `${symbol}${goalAmount.toLocaleString()}`;
        const btc = this.store.liveBtcPrice() > 0 ? goalAmount / this.store.liveBtcPrice() : 0;
        return `${formattedFiat} / month (≈ ${btc.toFixed(4)} BTC today)`;
      }
    } else {
      const months = this.store.goalRunwayMonths();
      return `${months} months runway`;
    }
  }

  goalTargetLabel() {
    return this.store.goalType() === 'runway' ? 'of runway target' : 'of monthly target';
  }

  goalProjectionMessage() {
    const goalType = this.store.goalType();
    if (goalType === 'stacking') {
      const goalAmount = this.store.goalSats();
      if (goalAmount === 0) return '';
      
      const unit = this.store.goalUnit();
      const totalBtc = this.store.totalBtc();
      let targetBtc = 0;
      
      if (unit === 'sats') {
        targetBtc = goalAmount / 100000000;
      } else {
        targetBtc = this.store.liveBtcPrice() > 0 ? goalAmount / this.store.liveBtcPrice() : 0;
      }
      
      if (totalBtc >= targetBtc) {
        return 'Goal reached! 🎉';
      }

      const capacityBtc = this.store.monthlyBtcCapacity();
      if (capacityBtc <= 0) {
        return 'No projected date yet; your buffer isn’t growing right now.';
      }

      const monthsRemaining = (targetBtc - totalBtc) / capacityBtc;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsRemaining));
      const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `On pace to reach by ${formattedDate}.`;
    } else {
      const targetRunway = this.store.goalRunwayMonths();
      if (targetRunway === 0) return '';

      const currentRunway = this.store.fiatRunwayMonths() || 0;
      const totalFiatBills = this.store.totalFiatBills();
      const targetFiat = targetRunway * totalFiatBills;
      const currentFiat = this.store.fiat();

      if (currentFiat >= targetFiat || currentRunway >= targetRunway) {
        return 'Goal reached! 🎉';
      }

      const netCashflow = this.store.netCashflow();
      if (netCashflow <= 0) {
        return 'No projected date yet; your buffer isn’t growing right now.';
      }

      const monthsRemaining = (targetFiat - currentFiat) / netCashflow;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsRemaining));
      const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `On pace to reach by ${formattedDate}.`;
    }
  }
  
  openGoalModal() {
    this.tempGoalType = this.store.goalType();
    this.tempGoalUnit = this.store.goalUnit() || 'sats';
    this.tempGoalSats = this.store.goalSats() || 2000000;
    this.tempGoalRunwayMonths = this.store.goalRunwayMonths() || 6;
    this.isGoalModalOpen = true;
  }

  closeGoalModal() {
    this.isGoalModalOpen = false;
  }
  
  saveGoal() {
    this.store.setGoalType(this.tempGoalType);
    this.store.setGoalUnit(this.tempGoalUnit);
    if (this.tempGoalType === 'stacking' && this.tempGoalSats !== null) {
      this.store.setGoalSats(this.tempGoalSats);
    } else if (this.tempGoalType === 'runway' && this.tempGoalRunwayMonths !== null) {
      this.store.setGoalRunwayMonths(this.tempGoalRunwayMonths);
    }
    this.closeGoalModal();
  }

  simulateGoal() {
    const goalType = this.store.goalType();
    if (goalType === 'stacking') {
      const goalAmount = this.store.goalSats();
      const unit = this.store.goalUnit();
      let prefillAmount = goalAmount;
      if (unit === 'sats') {
        const btc = goalAmount / 100000000;
        prefillAmount = Math.round(btc * this.store.liveBtcPrice());
      }
      this.store.setWhatIfSimulatorPrefill(prefillAmount, 'buy');
      setTimeout(() => {
        document.getElementById('what-if-simulator')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }
  
  getHistoryBarHeight(months: number) {
    return Math.min(100, Math.max(10, (months / 24) * 100));
  }

  // Payday Awareness Check
  checkPayday() {
    const paydays = this.store.payday();
    if (!paydays || paydays.length === 0) {
      this.showPaydayPulse.set(false);
      return;
    }

    const todayObj = new Date();
    const todayDay = todayObj.getDate();
    
    // Check last day of month
    const tomorrow = new Date(todayObj);
    tomorrow.setDate(todayObj.getDate() + 1);
    const isLastDay = tomorrow.getDate() === 1;

    const isTodayPayday = paydays.includes(todayDay) || (isLastDay && paydays.includes(99));

    if (isTodayPayday) {
      const todayStr = todayObj.toISOString().split('T')[0];
      const dismissedDate = localStorage.getItem('raft_dismissed_payday_pulse_date');
      
      if (dismissedDate === todayStr) {
        this.showPaydayPulse.set(false);
        return;
      }

      // Calculate details
      const runway = this.store.fiatRunwayMonths() !== null ? (Math.round(this.store.fiatRunwayMonths()! * 10) / 10) + ' months' : '0 months';
      const upcomingBills = this.store.obligations()
        .filter(b => b.method === 'fiat' && b.day >= todayDay)
        .reduce((acc, b) => acc + b.amount, 0);
      
      const currencySymbol = this.store.currencySymbol();
      const formattedBills = `${currencySymbol}${upcomingBills.toLocaleString()}`;
      
      const capacityBtc = this.store.monthlyBtcCapacity();
      const capacitySats = Math.round(capacityBtc * 100000000);
      let formattedCap = '0 sats';
      if (capacitySats >= 1000000) {
        formattedCap = (capacitySats / 1000000).toFixed(1) + 'M sats';
      } else {
        formattedCap = capacitySats.toLocaleString() + ' sats';
      }

      const progress = Math.round(this.goalProgressPercentage());
      const goalName = this.store.goalType() === 'runway' ? 'runway goal' : 'monthly stacking goal';

      const message = `Today is payday. Your runway is ${runway}. After your upcoming bills this month (${formattedBills}), you could safely stack ${formattedCap}. You're ${progress}% toward your ${goalName}.`;
      
      this.paydayPulseMessage.set(message);
      this.showPaydayPulse.set(true);
    } else {
      this.showPaydayPulse.set(false);
    }
  }

  dismissPaydayPulse() {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('raft_dismissed_payday_pulse_date', todayStr);
    this.showPaydayPulse.set(false);
  }

  // Backup Awareness check
  checkBackupStatus() {
    if (!this.store.hasSeenFirstLaunchBackupBanner()) {
      this.showFirstLaunchBanner.set(true);
      this.showBackupNudge.set(false);
      return;
    }

    const lastBackupStr = this.store.telemetry().lastBackupDate;
    const firstVisitStr = this.store.telemetry().firstVisit;
    const refStr = lastBackupStr || firstVisitStr;

    if (refStr) {
      const refDate = new Date(refStr);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - refDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 30) {
        this.showBackupNudge.set(true);
      }
    }
  }

  dismissFirstLaunchBanner() {
    this.store.setHasSeenFirstLaunchBackupBanner(true);
    this.showFirstLaunchBanner.set(false);
    // Re-check to see if the 30-day nudge should display after first launch is dismissed
    this.checkBackupStatus();
  }

  triggerBackup() {
    this.importExportService.exportData(false);
    this.showBackupNudge.set(false);
  }

  dismissBackupNudge() {
    // Just hide for this session
    this.showBackupNudge.set(false);
  }
}

