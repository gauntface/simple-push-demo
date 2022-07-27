/* eslint-env browser */

export const GCM_API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';
export const APPLICATION_KEYS = {
  publicKey: 'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiA' +
    'pwXKpNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo',
  privateKey: 'xKZKYRNdFFn8iQIF2MH54KTfUHwH105zBdzMR7SI3xI',
};

const defaultBackend = 'https://simple-push-demo-api.glitch.me';
const localBackend = 'http://localhost:8081';
const urlParams = new URLSearchParams(window.location.search);
const env = urlParams.get('environment');
export const BACKEND_ORIGIN = env == 'dev' ? localBackend : defaultBackend;
