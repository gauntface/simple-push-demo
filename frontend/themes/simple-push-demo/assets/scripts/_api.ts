import {Environment} from '@params';

export const BACKEND_PROXY_ORIGIN = Environment == 'production' ? 'https://simple-push-demo-api.glitch.me' : 'http://localhost:1314';
