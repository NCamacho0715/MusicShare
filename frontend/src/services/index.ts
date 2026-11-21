import { ENV } from '../config/env';
import type { MusicShareService } from '../types/api';
import { apiAdapter } from './apiAdapter';
import { mockAdapter } from './mockAdapter';

export const musicShareService: MusicShareService = ENV.useMocks
  ? mockAdapter
  : apiAdapter;

export { apiAdapter } from './apiAdapter';
export { mockAdapter } from './mockAdapter';
export { DEMO_USER_PASSWORD } from './mockSeed';
export {
  ACTIVE_TOKEN_STORAGE_KEY,
  ACTIVE_USER_STORAGE_KEY,
  buildMockAuthHeaders,
  getActiveAuthToken,
  getActiveUserSession,
  setActiveUserSession,
} from './httpClient';
export { ApiError } from '../types/api';
