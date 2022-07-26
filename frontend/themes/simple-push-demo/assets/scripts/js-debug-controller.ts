import {logger} from '@gauntface/logger';
import {PUBLIC_KEY} from './_vapid-keys';
import {EncryptionAES128GCM} from './_encryption-aes128gcm';
import {BACKEND_PROXY_ORIGIN} from './_api';

logger.setPrefix('simple-push-demo');

class DebugController {
  private enableCheckbox: HTMLInputElement;
  private compareButton: HTMLButtonElement;
  private pushPayloadInput: HTMLInputElement;

  private subscription: PushSubscription | null;
  private encryptionHelper: EncryptionAES128GCM;

  constructor() {
    const enableCheckbox = document.querySelector('.js-enable-checkbox');
    if (!enableCheckbox) {
      logger.error('Failed to find enable checkbox.');
      return;
    }
    this.enableCheckbox = enableCheckbox as HTMLInputElement;
    this.enableCheckbox.addEventListener('click', () => this.togglePushEnabled())

    const compareBtn = document.querySelector('.js-compare-results-btn');
    if (!compareBtn) {
      logger.error('Failed to find compare results button.');
      return;
    }
    this.compareButton = compareBtn as HTMLButtonElement;
    this.compareButton.addEventListener('click', () => this.compareResults());

    const pushPayloadInput = document.querySelector('.js-push-payload-input');
    if (!pushPayloadInput) {
      logger.error('Failed to find push payload input.');
      return;
    }
    this.pushPayloadInput = pushPayloadInput as HTMLInputElement;

    // TODO: Handle older encryption methods?
    this.encryptionHelper = new EncryptionAES128GCM();

    this.setInitialState();
  }

  async setInitialState() {
    if (Notification.permission == 'denied') {
      logger.warn('Notification permissions are currently denied and will need to be chaned in the browser settings to use this demo.');
    }

    try {
      const reg = await this.registerServiceWorker();
      this.subscription = await reg.pushManager.getSubscription();
      this.updateUI();
    } catch (err) {
      logger.error(`Failed to set initial state for the demo.`, err);
    }

  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported in this browser.');
    }

    return await navigator.serviceWorker.register('/service-worker.js');
  }

  async togglePushEnabled() {
    this.enableCheckbox.disabled = true;
    if (this.enableCheckbox.checked) {
      await this.subscribePush();
    } else {
      await this.unsubscribePush();
    }
    this.updateUI();
  }

  async subscribePush() {
    logger.debug('Subscribing browser to push notifications.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return
    }

    const reg = await this.registerServiceWorker();
    this.subscription = await reg.pushManager.subscribe(
      {
        userVisibleOnly: true,
        applicationServerKey: PUBLIC_KEY,
      });
  }

  async compareResults() {
    if (!this.subscription) {
      logger.error('Unable to compare because there is no subscription.');
      return;
    }

    const demoRquest = await this.encryptionHelper.getRequestDetails(this.subscription, this.pushPayloadInput.value);

    const fetchOptions = {
      method: 'post',
      body: JSON.stringify({
        payload: this.pushPayloadInput.value,
        subscription: this.subscription,
      }),
    };

    // Can't send a stream like is needed for web push protocol,
    // so needs to convert it to base 64 here and the server will
    // convert back and pass as a stream
    //if (request.body && request.body instanceof ArrayBuffer) {
//      request.body = this.toBase64(request.body);
    //}
    //fetchOptions['body'] = JSON.stringify(request);

    try {
      const response = await  fetch(`${BACKEND_PROXY_ORIGIN}/api/debug/headers`, fetchOptions);
      if (response.status >= 400 && response.status < 500) {
        const text = await response.text();
        logger.warn(`Failed to send push message. Code: ${response.status} - ${response.statusText}. Body: ${text}`);
      } else {
        const webpushHeaders = await response.json();
        const allHeaders = Object.keys(webpushHeaders);
        for (const h of Object.keys(demoRquest.headers)) {
          if (allHeaders.indexOf(h) == -1) {
            allHeaders.push(h);
          }
        }
        allHeaders.sort();

        const headerBody = document.querySelector('.js-header-comparison tbody');
        headerBody.innerHTML = '';
        for (const h of allHeaders) {
          const wp = webpushHeaders[h];
          const d = demoRquest.headers[h];
          const row = document.createElement('tr');
          row.innerHTML = `<td>${h}</td> <td>${undefinedString(wp)}</td> <td>${undefinedString(d)}</td> <td>${matchEmoji(wp, d)}</td>`;
          headerBody.appendChild(row);
        }
      }
    } catch(err) {
      logger.error('Failed to send push via proxy server: ', err);
    }

    try {
      const response = await  fetch(`${BACKEND_PROXY_ORIGIN}/api/debug/body`, fetchOptions);
      if (response.status >= 400 && response.status < 500) {
        const text = await response.text();
        logger.warn(`Failed to send push message. Code: ${response.status} - ${response.statusText}. Body: ${text}`);
      } else {
        const webpushBody = await response.body.getReader();
        const values = [];
        while(true) {
          const {done, value} = await webpushBody.read();
          if (done) {
            break;
          }
          for (const v of value) {
            values.push(v);
          }
        }

        const demoValue = new Uint8Array(demoRquest.body)
        const max = Math.max(values.length, demoValue.length);
        console.log(values.length, demoValue);
        const bodyBody = document.querySelector('.js-body-comparison tbody');
        bodyBody.innerHTML = '';
        for (let i = 0; i < max; i++) {
          const wp = i < values.length ? values[i] : undefined;
          const d = i < demoValue.length ? demoValue[i] : undefined;
          const row = document.createElement('tr');
          row.innerHTML = `<td>${i+1}</td> <td>${undefinedString(wp)}</td> <td>${undefinedString(d)}</td> <td>${matchEmoji(wp, d)}</td>`;
          bodyBody.appendChild(row);
        }
      }
    } catch(err) {
      logger.error('Failed to send push via proxy server: ', err);
    }
  }

  async unsubscribePush() {
    logger.debug('Unsubscribing browser from push notifications.');
    try {
      const reg = await this.registerServiceWorker();
      if (reg) {
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          const successful = await subscription.unsubscribe();
          if (!successful) {
            logger.warn('We were unable to unsubscribe from push notifications.');
          }
        }
      } else {
        logger.debug('No service worker registered, so nothing to unsubscribe.');
      }
    } catch (err) {
      logger.error('Failed to unsubscribe the browser from push notifications: ', err);
    } finally {
      this.subscription = null;
    }
  }

  updateUI() {
    this.updateEnableCheckbox();
  }

  updateEnableCheckbox() {
    this.enableCheckbox.disabled = Notification.permission === 'denied';
    this.enableCheckbox.checked = Notification.permission === 'granted' && !!this.subscription;
  }
}

function undefinedString(value) {
  if (value == undefined) {
    return '';
  }
  return value;
}

function matchEmoji(v1, v2) {
  if (v1 == v2) {
    return '✅';
  }
  return '❌';
}

const debugController = document.querySelector('.js-debug-controller');
if (debugController) {
  new DebugController();
}