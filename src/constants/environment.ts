/**
 * RadAxis RIS Mobile — Environment & Mutation Safety Configuration
 * Enforces strict fail-closed protection for the live production RIS.
 */

import { API_BASE_URL } from './config';

export type AppEnvironment = 'production' | 'staging';

export const PRODUCTION_HOST = 'meril-ris.mangesh.my.id';

export const MUTATION_GUARD_MESSAGE =
  'Demo Mode — Mutation Guard Active: Live database writes are disabled in production view to protect clinical records.';

export const DEMO_IDENTIFIER_PREFIX = 'DEMO-LOCAL-';

/**
 * Returns current application environment.
 * Defaults strictly to 'production' unless explicitly set to 'staging'.
 */
export function getAppEnvironment(): AppEnvironment {
  const env = process.env.EXPO_PUBLIC_APP_ENV?.toLowerCase().trim();
  if (env === 'staging') {
    return 'staging';
  }
  return 'production';
}

/**
 * Checks whether the given or configured API target points to the live production server.
 */
export function isProductionHost(url: string = API_BASE_URL): boolean {
  if (!url) return true;
  return url.toLowerCase().includes(PRODUCTION_HOST.toLowerCase());
}

/**
 * Whitelisted authentication and non-clinical utility endpoints that may be dispatched to production
 */
const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/portal/patient/request-otp',
  '/portal/patient/verify-otp',
];

/**
 * Whitelisted endpoints that are authorized for genuine production write operations.
 * Each endpoint here has been strictly verified to enforce:
 * 1. Mandatory JWT authentication (e.g. authenticatePatient / authenticate).
 * 2. Server-side identity & patient ownership enforcement (prevents IDOR / cross-patient tampering).
 * 3. Strict schema validation, slot conflict detection, and atomic persistence.
 */
const AUTHORIZED_PRODUCTION_WRITE_ENDPOINTS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/portal/patient/request-otp',
  '/portal/patient/verify-otp',
  '/portal/patient/book',
  '/portal/patient/appointments',
];

export function isAuthorizedWriteEndpoint(endpoint: string): boolean {
  const clean = endpoint.split('?')[0].toLowerCase();
  return AUTHORIZED_PRODUCTION_WRITE_ENDPOINTS.some((ep) =>
    clean.startsWith(ep.toLowerCase()) || clean.endsWith(ep.toLowerCase())
  );
}

export function isAuthEndpoint(endpoint: string): boolean {
  const clean = endpoint.split('?')[0].toLowerCase();
  return AUTH_ENDPOINTS.some((ep) => clean.endsWith(ep.toLowerCase()));
}

/**
 * Determines whether database-modifying operations (POST, PUT, PATCH, DELETE) are permitted.
 * Safe policy:
 * - If endpoint is an explicitly authorized, server-validated production write endpoint: ALWAYS allowed.
 * - Otherwise, fail-closed against production host or production environment.
 */
export function isMutationAllowed(url: string = API_BASE_URL, endpoint?: string): boolean {
  if (endpoint && isAuthorizedWriteEndpoint(endpoint)) {
    return true;
  }
  if (isProductionHost(url)) {
    return false;
  }
  if (getAppEnvironment() === 'production') {
    return false;
  }
  return true;
}
