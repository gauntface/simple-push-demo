import {logger} from '@gauntface/logger';
import {PUBLIC_KEY} from './_vapid-keys';
import {EncryptionAES128GCM} from './_encryption-aes128gcm';

logger.setPrefix('simple-push-demo');

class AppController {
  private enableCheckbox: HTMLInputElement;
  private subscriptionElement: HTMLPreElement;
  private curlElement: HTMLPreElement;
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

    const subscriptionElement = document.querySelector('.js-current-subscription');
    if (!subscriptionElement) {
      logger.error('Failed to find subscription pre element.');
      return;
    }
    this.subscriptionElement = subscriptionElement as HTMLPreElement;

    const curlElement = document.querySelector('.js-curl-command');
    if (!curlElement) {
      logger.error('Failed to find the curl element.');
      return;
    }
    this.curlElement = curlElement as HTMLPreElement;

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
      logger.error(`Failed to set initial state for the demo.`);
    }

  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported in this browser.');
    }

    return await navigator.serviceWorker.register('./service-worker.js');
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
    this.updateSubscriptionPre();
    this.updateCurlPre();
    this.updateEnableCheckbox();
  }

  updateSubscriptionPre() {
    let text = '';
    if (this.subscription) {
      text = JSON.stringify(this.subscription, null, 2);
    }
    this.subscriptionElement.textContent = text;
    if (window.Prism) {
      window.Prism.highlightElement(this.subscriptionElement);
    }
  }

  async updateCurlPre() {
    let cmdParts = [];
    if (this.subscription) {
      cmdParts = [
        'curl',
        `"${this.subscription.endpoint}"`,
        '--request "POST"',
      ];

      // TODO: Handle payload
      const request = await this.encryptionHelper.getRequestDetails(this.subscription, '');
      for (const hk of Object.keys(request.headers)) {
        cmdParts.push(`--header "${hk}: ${request.headers[hk]}"`);
      }
    }
    this.curlElement.textContent = cmdParts.join(" \\" + '\n  ');
    if (window.Prism) {
      window.Prism.highlightElement(this.curlElement);
    }
  }

  updateEnableCheckbox() {
    this.enableCheckbox.disabled = Notification.permission === 'denied';
    this.enableCheckbox.checked = Notification.permission === 'granted' && !!this.subscription;
  }
}

new AppController();