/**
 * RadAxis RIS Mobile — Application Configuration
 */

const env = process.env.EXPO_PUBLIC_APP_ENV?.toLowerCase().trim();
const isStaging = env === 'staging';

export const API_BASE_URL: string = (() => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/+$/, '');
  }
  // Fail-closed default: if staging environment, default strictly to local staging, NEVER production
  if (isStaging) {
    return 'http://192.168.43.204:5005/api/v1';
  }
  return 'https://meril-ris.mangesh.my.id/api/v1';
})();

export const APP_CONFIG = {
  appName: 'RadAxis Mobile',
  appSubtitle: 'Enterprise Radiology Information System',
  version: '1.0.0',
  tokenKey: isStaging ? 'radaxis_staging_auth_token' : 'radaxis_auth_token',
  userKey: isStaging ? 'radaxis_staging_auth_user' : 'radaxis_auth_user',
  requestTimeoutMs: 15000,
  staleTimeMs: 60 * 1000, // 1 minute stale time for TanStack Query
} as const;
