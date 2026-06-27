const CACHE_NAME = 'raft-cache-v1';
const IDB_NAME = 'RaftDB';
const IDB_VERSION = 1;
const STORE_NAME = 'stateStore';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch events (network first, fallback to cache could be implemented later)
});

// Utility to read from IndexedDB
function getRaftData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get('raft_v1_data');
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Background task logic
async function checkAlerts() {
  const data = await getRaftData();
  if (!data) return;

  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];
  const lastCheck = data.lastAlertCheck || '';
  if (lastCheck === todayDateStr) {
    // Already checked today
    return;
  }

  let notificationsTriggered = false;

  // 1. Payday Pulse
  if (data.payday && Array.isArray(data.payday)) {
    const todayDay = now.getDate();
    if (data.payday.includes(todayDay)) {
      const fiatObs = data.obligations ? data.obligations.filter(b => b.method === 'fiat').reduce((a, b) => a + b.amount, 0) : 0;
      const net = (data.income || 0) - fiatObs;
      let runwayStr = 'some';
      if (fiatObs === 0 && data.income > 0) runwayStr = '∞';
      else if (net >= 0) runwayStr = fiatObs > 0 ? (data.fiat / fiatObs).toFixed(1) : '∞';
      else runwayStr = (data.fiat / Math.abs(net)).toFixed(1);
      
      const btcCap = (net > 0 && data.liveBtcPrice > 0) ? (net / data.liveBtcPrice) : 0;
      const satsCap = (btcCap * 100000000).toFixed(0);

      self.registration.showNotification('Payday Pulse', {
        body: `It's payday. Your runway is ${runwayStr} months. You could safely stack ${satsCap} sats.`,
        icon: '/favicon.ico',
        tag: 'payday-pulse'
      });
      notificationsTriggered = true;
    }
  }

  // 2. Runway Threshold
  if (data.runwayThresholdDays !== undefined) {
    const fiatObs = data.obligations ? data.obligations.filter(b => b.method === 'fiat').reduce((a, b) => a + b.amount, 0) : 0;
    const net = (data.income || 0) - fiatObs;
    let runwayMonths = 999;
    if (fiatObs === 0 && data.income > 0) runwayMonths = data.fiat > 0 ? data.fiat / data.income : 0;
    else if (net >= 0) runwayMonths = fiatObs > 0 ? data.fiat / fiatObs : 999;
    else runwayMonths = data.fiat / Math.abs(net);

    const runwayDays = runwayMonths * 30;
    if (runwayDays < data.runwayThresholdDays) {
      self.registration.showNotification('Runway Alert', {
        body: `You have ${Math.round(runwayDays)} days of runway. Open Raft to review.`,
        icon: '/favicon.ico',
        tag: 'runway-alert'
      });
      notificationsTriggered = true;
    }
  }

  // 3. Bill Due Tomorrow
  if (data.obligations && Array.isArray(data.obligations)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate();

    const dueTomorrow = data.obligations.filter(b => b.dayOfMonth === tomorrowDay);
    if (dueTomorrow.length > 0) {
      const summary = dueTomorrow.map(b => `${b.name} ($${b.amount})`).join(' and ');
      const prefix = dueTomorrow.length > 1 ? `${dueTomorrow.length} bills due tomorrow:` : `Tomorrow:`;
      self.registration.showNotification('Bill Due', {
        body: `${prefix} ${summary}`,
        icon: '/favicon.ico',
        tag: 'bill-due'
      });
      notificationsTriggered = true;
    }
  }

  // Update last checked date in IDB to prevent spam
  if (notificationsTriggered) {
    data.lastAlertCheck = todayDateStr;
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, 'raft_v1_data');
    };
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'raft-alerts-check') {
    event.waitUntil(checkAlerts());
  }
});

// Also trigger on notificationclick
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Message listener for manual triggers from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_ALERTS') {
    event.waitUntil(checkAlerts());
  }
});
