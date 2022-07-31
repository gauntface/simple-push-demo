/* eslint-env browser */

export const GCM_API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';
export const APPLICATION_KEYS = {
	publicKey: 'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiA' +
    'pwXKpNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo',
	privateKey: 'xKZKYRNdFFn8iQIF2MH54KTfUHwH105zBdzMR7SI3xI',
};

// Hosting on vercel will have the API and frontend served from the
// same origin, so '' is fine.
// For local development the backend url param can be used.
const urlParams = new URLSearchParams(window.location.search);
const backendParam = urlParams.get('backend');
export const BACKEND_ORIGIN = backendParam ? backendParam : '';
