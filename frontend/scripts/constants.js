/* eslint-env browser */

export const GCM_API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';
export const APPLICATION_KEYS = {
  publicKey: 'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiA' +
    'pwXKpNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo',
  privateKey: 'xKZKYRNdFFn8iQIF2MH54KTfUHwH105zBdzMR7SI3xI',
};

// This is empty for same origin requests. If the API is ever moved, this shoud
// be updated.
const urlParams = new URLSearchParams(window.location.search);
const backendParam = urlParams.get('backend');
export const BACKEND_ORIGIN = backendParam ? backendParam : '';
