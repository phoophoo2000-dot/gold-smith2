import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const PRIMARY_SUPABASE_URL = 'https://fkzuqvwdngijgacereru.supabase.co';

// Helper to set persistent cookie (bridges Safari to standalone Home Screen WebClip on iOS)
export function setBridgeCookie(name: string, value: string, days = 365): void {
  try {
    if (typeof document !== 'undefined') {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    }
  } catch {}
}

export function getBridgeCookie(name: string): string | null {
  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
      if (match && match[2]) {
        return decodeURIComponent(match[2]);
      }
    }
  } catch {}
  return null;
}

// Safe getter for active Supabase credentials
// Uses PRIMARY_SUPABASE_URL (fkzuqvwdngijgacereru) as the unified permanent project,
// completely purging the retired Version 1 project.
export function getActiveSupabaseConfig(): { url: string; anonKey: string } {
  try {
    if (typeof window !== 'undefined') {
      // 1. Check URL parameters for instant sync from mobile scan (e.g. iPhone camera)
      const searchParams = new URLSearchParams(window.location.search);
      let queryUrl = searchParams.get('sb_url');
      let queryKey = searchParams.get('sb_key');

      // Also check URL hash if search params were placed in hash (e.g. #sb_url=...&sb_key=...)
      if (!queryUrl || !queryKey) {
        if (window.location.hash && window.location.hash.includes('sb_url')) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
          queryUrl = queryUrl || hashParams.get('sb_url');
          queryKey = queryKey || hashParams.get('sb_key');
        }
      }

      if (queryUrl && queryKey) {
        let cleanUrl = queryUrl.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }
        cleanUrl = cleanUrl.replace(/\/+$/, '');
        const cleanKey = queryKey.trim().replace(/^['"]|['"]$/g, '');

        if (window.localStorage) {
          window.localStorage.setItem('gold_shop_supabase_url', cleanUrl);
          window.localStorage.setItem('gold_shop_supabase_anon_key', cleanKey);
          window.localStorage.setItem('gold_shop_last_sync_method', 'url_auto_import');
        }

        // Bridge credentials to first-party cookie so iOS Standalone PWA inherits them from Safari
        setBridgeCookie('gold_shop_sb_url', cleanUrl);
        setBridgeCookie('gold_shop_sb_key', cleanKey);

        // Also persist to server endpoint so Standalone WebClips on iOS inherit credentials seamlessly
        try {
          fetch('/api/active-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
          }).catch(() => {});
        } catch {}

        // DO NOT wipe the query parameters with replaceState!
        // Preserving sb_url and sb_key in the browser URL ensures that when the user
        // selects "Add to Home Screen" in Safari, iOS bookmarks the full URL with credentials!

        return { url: cleanUrl, anonKey: cleanKey };
      }

      // 2. Check localStorage
      if (window.localStorage) {
        let savedUrl = window.localStorage.getItem('gold_shop_supabase_url');
        let savedKey = window.localStorage.getItem('gold_shop_supabase_anon_key');

        // Permanently purge retired Version 1 (imumsdpgmdyydppffqup)
        if (savedUrl && savedUrl.includes('imumsd')) {
          savedUrl = PRIMARY_SUPABASE_URL;
          window.localStorage.setItem('gold_shop_supabase_url', savedUrl);
          if (savedKey === 'sb_publishable_XDiW-kjkryAQmpcUCw9Qjg_OioHEsAK') {
            savedKey = '';
            window.localStorage.removeItem('gold_shop_supabase_anon_key');
          }
        }

        // If user explicitly chose Local Mode / Disconnect
        if (savedUrl === '__DISCONNECTED__') {
          return { url: '', anonKey: '' };
        }

        if (savedUrl && savedKey) {
          let cleanUrl = savedUrl.trim();
          if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = `https://${cleanUrl}`;
          }
          cleanUrl = cleanUrl.replace(/\/+$/, '');
          const cleanKey = savedKey.trim().replace(/^['"]|['"]$/g, '');

          // Keep cookie in sync for iOS Standalone PWA
          setBridgeCookie('gold_shop_sb_url', cleanUrl);
          setBridgeCookie('gold_shop_sb_key', cleanKey);

          return { url: cleanUrl, anonKey: cleanKey };
        }
      }

      // 3. Check Cookie Bridge (CRITICAL for iOS Standalone PWA on iPhone X Home Screen)
      // When opened as a WebClip from Home Screen, localStorage is partitioned and empty, but cookies are preserved!
      const cookieUrl = getBridgeCookie('gold_shop_sb_url');
      const cookieKey = getBridgeCookie('gold_shop_sb_key');
      if (cookieUrl && cookieKey && !cookieUrl.includes('imumsd')) {
        let cleanUrl = cookieUrl.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }
        cleanUrl = cleanUrl.replace(/\/+$/, '');
        const cleanKey = cookieKey.trim().replace(/^['"]|['"]$/g, '');

        if (window.localStorage) {
          window.localStorage.setItem('gold_shop_supabase_url', cleanUrl);
          window.localStorage.setItem('gold_shop_supabase_anon_key', cleanKey);
          window.localStorage.setItem('gold_shop_last_sync_method', 'cookie_pwa_bridge');
        }

        return { url: cleanUrl, anonKey: cleanKey };
      }
    }
  } catch (e) {
    console.warn('getActiveSupabaseConfig notice:', e);
  }

  // Fall back to primary URL and environment variables
  const env = (import.meta as any).env || {};
  let url = (env.VITE_SUPABASE_URL || '').trim();
  if (!url || url.includes('imumsd')) {
    url = PRIMARY_SUPABASE_URL;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, '');
  
  let anonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  // Ignore old Version 1 env key
  if (anonKey === 'sb_publishable_XDiW-kjkryAQmpcUCw9Qjg_OioHEsAK') {
    anonKey = '';
  }

  // Check if saved key exists in localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedKey = window.localStorage.getItem('gold_shop_supabase_anon_key');
      if (storedKey && storedKey !== 'sb_publishable_XDiW-kjkryAQmpcUCw9Qjg_OioHEsAK') {
        anonKey = storedKey.trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {}

  return { url, anonKey };
}

// Synchronize active credentials from the server endpoint /api/active-config
// This enables iPhone X Home Screen Standalone PWAs (WebClips) to instantly inherit
// the Cloud DB credentials configured from Safari or Desktop without storage partitioning hurdles.
export async function syncActiveConfigFromServer(): Promise<{ success: boolean; url?: string; anonKey?: string }> {
  try {
    const res = await fetch('/api/active-config', { cache: 'no-store' });
    if (!res.ok) return { success: false };
    const data = await res.json();
    if (data && data.url && data.anonKey) {
      let cleanUrl = String(data.url).trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      cleanUrl = cleanUrl.replace(/\/+$/, '');
      const cleanKey = String(data.anonKey).trim().replace(/^['"]|['"]$/g, '');

      if (cleanUrl && cleanKey && !cleanUrl.includes('imumsd') && cleanKey !== 'sb_publishable_XDiW-kjkryAQmpcUCw9Qjg_OioHEsAK') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('gold_shop_supabase_url', cleanUrl);
          window.localStorage.setItem('gold_shop_supabase_anon_key', cleanKey);
          window.localStorage.setItem('gold_shop_last_sync_method', 'server_auto_hydrate');
        }
        setBridgeCookie('gold_shop_sb_url', cleanUrl);
        setBridgeCookie('gold_shop_sb_key', cleanKey);
        reinitSupabaseClient();
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('supabase_config_changed'));
          } catch {}
        }
        return { success: true, url: cleanUrl, anonKey: cleanKey };
      }
    }
  } catch (err) {
    console.warn('syncActiveConfigFromServer warning:', err);
  }
  return { success: false };
}

export function saveDynamicSupabaseConfig(url: string, anonKey: string): void {
  let cleanUrl = '';
  let cleanKey = '';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (url && anonKey) {
        cleanUrl = url.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }
        cleanUrl = cleanUrl.replace(/\/+$/, '');
        cleanKey = anonKey.trim().replace(/^['"]|['"]$/g, '');

        window.localStorage.setItem('gold_shop_supabase_url', cleanUrl);
        window.localStorage.setItem('gold_shop_supabase_anon_key', cleanKey);

        // Keep persistent cookie bridge updated for iOS Standalone PWA
        setBridgeCookie('gold_shop_sb_url', cleanUrl);
        setBridgeCookie('gold_shop_sb_key', cleanKey);
      } else {
        // Explicitly disconnect so default env variables do not override user's intent to disconnect
        window.localStorage.setItem('gold_shop_supabase_url', '__DISCONNECTED__');
        window.localStorage.setItem('gold_shop_supabase_anon_key', '');
        setBridgeCookie('gold_shop_sb_url', '');
        setBridgeCookie('gold_shop_sb_key', '');
      }
    }
  } catch {}

  // Sync to server background store so iPhone X Standalone WebClips inherit credentials
  try {
    fetch('/api/active-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl || PRIMARY_SUPABASE_URL,
        anonKey: cleanKey || '',
      }),
    }).catch(() => {});
  } catch {}

  reinitSupabaseClient();
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('supabase_config_changed'));
    } catch {}
  }
}

export function resetSupabaseConfigToDefault(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('gold_shop_supabase_url');
      window.localStorage.removeItem('gold_shop_supabase_anon_key');
      setBridgeCookie('gold_shop_sb_url', '');
      setBridgeCookie('gold_shop_sb_key', '');
    }
  } catch {}

  try {
    fetch('/api/active-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: PRIMARY_SUPABASE_URL,
        anonKey: '',
      }),
    }).catch(() => {});
  } catch {}

  reinitSupabaseClient();
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('supabase_config_changed'));
    } catch {}
  }
}

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getActiveSupabaseConfig();
  return Boolean(
    url &&
    anonKey &&
    url.length > 0 &&
    anonKey.length > 0 &&
    !url.includes('placeholder') &&
    url !== '__DISCONNECTED__'
  );
};

function createSupabaseInstance(): SupabaseClient | null {
  const { url, anonKey } = getActiveSupabaseConfig();
  if (isSupabaseConfigured()) {
    try {
      return createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

export let supabase: SupabaseClient | null = createSupabaseInstance();

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabase && isSupabaseConfigured()) {
    supabase = createSupabaseInstance();
  }
  return supabase;
}

export function reinitSupabaseClient(): SupabaseClient | null {
  supabase = createSupabaseInstance();
  return supabase;
}

export interface SupabaseProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Staff';
  phone?: string;
  pin?: string;
  created_at?: string;
}

export const getSupabaseUrlDisplay = (): string => getActiveSupabaseConfig().url;
export const SUPABASE_URL_DISPLAY = getActiveSupabaseConfig().url;
