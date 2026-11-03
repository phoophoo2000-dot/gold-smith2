import { saveDynamicSupabaseConfig, getActiveSupabaseConfig } from '../lib/supabase';

export const APP_VERSION = '2.0.0';
export const APP_BUILD_DATE = '2026-10-26';

/**
 * Check if the app is currently running in standalone PWA mode (e.g. Added to iOS Home Screen)
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Check if the device is an iOS device (iPhone/iPad/iPod)
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

/**
 * Returns public shared URL (ais-pre) instead of internal developer URL (ais-dev)
 */
export function getPublicSharedUrl(baseUrl?: string): string {
  const fallback = 'https://ais-pre-4awryxob3262afjjzhqlz4-824532102707.europe-west2.run.app';
  if (typeof window === 'undefined') return fallback;
  const raw = baseUrl || window.location.origin + window.location.pathname;
  return raw.replace(/ais-dev-([a-z0-9]+)/gi, 'ais-pre-$1');
}

/**
 * Generate a mobile sync link that includes Supabase config to auto-configure on iPhone
 * Always uses the public shared ais-pre domain so users never hit 403 Forbidden
 */
export function generateMobileSyncUrl(baseUrl?: string): string {
  if (typeof window === 'undefined') return 'https://ais-pre-4awryxob3262afjjzhqlz4-824532102707.europe-west2.run.app';
  const publicBase = getPublicSharedUrl(baseUrl);
  const cfg = getActiveSupabaseConfig();

  const url = new URL(publicBase);
  // Bypasses iOS / Safari cookie_check redirect freeze
  url.searchParams.set('__storage_access_granted', '1');
  if (cfg.url && cfg.anonKey) {
    url.searchParams.set('sb_url', cfg.url);
    url.searchParams.set('sb_key', cfg.anonKey);
  }
  return url.toString();
}

/**
 * Force clear all service workers, cache storage, and hard reload
 */
export async function forceUpdateAndClearCache(redirectUrl?: string): Promise<void> {
  try {
    // 1. Unregister all service workers
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // 2. Clear CacheStorage
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
  } catch (err) {
    console.warn('Cache clearing warning:', err);
  }

  // 3. Mark version updated in localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('gold_shop_app_version', APP_VERSION);
    }
  } catch {}

  // 4. Force reload bypassing cache with cache-busting timestamp
  if (typeof window !== 'undefined') {
    const base = redirectUrl || window.location.origin + window.location.pathname;
    const cleanBase = base.split('#')[0].split('?')[0];
    window.location.href = `${cleanBase}?ts=${Date.now()}`;
  }
}
