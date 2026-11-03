import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initGlobalErrorLogging } from './services/loggerService.ts';
import './index.css';

// Initialize silent global error and network drop logging
try {
  initGlobalErrorLogging();
} catch (logErr) {
  console.warn('Logger initialization note:', logErr);
}

// Progressive Web App Service Worker with auto-refresh support
// Only register in production builds; avoid dev server HMR conflict
export let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New version available, reloading...');
          if (typeof updateSW === 'function') {
            updateSW(true);
          } else {
            window.location.reload();
          }
        },
        onOfflineReady() {
          console.log('[PWA] Gold POS is ready for offline standalone usage');
        },
        onRegisteredSW(swUrl, r) {
          if (r) {
            setInterval(() => {
              r.update().catch(() => {});
            }, 10 * 60 * 1000);
          }
        },
      });
    })
    .catch((swErr) => {
      console.warn('PWA registration note:', swErr);
    });

  // For iOS Safari / Standalone Home Screen PWA: check for updates when app comes to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.update())
        .catch(() => {});
    }
  });

  window.addEventListener('focus', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.update())
        .catch(() => {});
    }
  });
}

// Mount React Root with fail-safe error handling
const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (mountErr: any) {
    console.error('Fatal mount error:', mountErr);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background-color: #1c1917; color: #f5f5f4; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: -apple-system, sans-serif;">
        <div style="max-width: 420px; width: 100%; background: #292524; border: 1px solid #44403c; border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 12px;">👑</div>
          <h2 style="font-size: 18px; font-weight: 800; color: #fbbf24; margin-bottom: 8px;">ရွှေရတနာ ရွှေဆိုင် POS</h2>
          <p style="font-size: 12px; color: #a8a29e; margin-bottom: 16px;">စာမျက်နှာ ဖွင့်လှစ်ရာတွင် အဆင်မပြေဖြစ်ပါက အောက်ပါခလုတ်ကို နှိပ်၍ ပြန်လည်စတင်ပါ</p>
          <button onclick="localStorage.clear(); sessionStorage.clear(); location.reload();" style="width: 100%; padding: 10px 16px; background: #f59e0b; color: #1c1917; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; font-size: 13px;">
            အချက်အလက်များ Reset လုပ်၍ ပြန်ဖွင့်မည် (Reload)
          </button>
        </div>
      </div>
    `;
  }
}
