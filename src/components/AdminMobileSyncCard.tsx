import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Download,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';
import { getActiveSupabaseConfig, isSupabaseConfigured, getBridgeCookie } from '../lib/supabase';
import { forceUpdateAndClearCache } from '../services/pwaService';
import { useGoldShop } from '../context/GoldShopContext';

interface AdminMobileSyncCardProps {
  onOpenDeveloperPortal?: () => void;
}

export const AdminMobileSyncCard: React.FC<AdminMobileSyncCardProps> = ({
  onOpenDeveloperPortal,
}) => {
  const { settings, refreshSupabaseData, isSyncing } = useGoldShop();
  const [activeConfig, setActiveConfig] = useState(() => getActiveSupabaseConfig());
  const [mobileUrlMode, setMobileUrlMode] = useState<'pre' | 'dev'>('pre');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  // Sync config on change
  useEffect(() => {
    const handleCfg = () => setActiveConfig(getActiveSupabaseConfig());
    window.addEventListener('supabase_config_changed', handleCfg);
    return () => window.removeEventListener('supabase_config_changed', handleCfg);
  }, []);

  // Compute robust mobile auto-connect URL for iPhone X and mobile devices
  const mobileSyncUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const rawOrigin = window.location.origin;
      let targetOrigin = rawOrigin;
      if (mobileUrlMode === 'pre') {
        targetOrigin = rawOrigin.replace(/ais-dev-([a-z0-9]+)/gi, 'ais-pre-$1');
      } else {
        targetOrigin = rawOrigin.replace(/ais-pre-([a-z0-9]+)/gi, 'ais-dev-$1');
      }

      const url = new URL(targetOrigin + window.location.pathname);
      // Bypasses iOS Safari storage access redirect
      url.searchParams.set('__storage_access_granted', '1');

      // Always bundle current Supabase project URL and key into query parameters for mobile one-click auto connect
      const targetUrl = (activeConfig.url || 'https://fkzuqvwdngijgacereru.supabase.co').trim();
      let targetKey = (activeConfig.anonKey || '').trim();
      if (!targetKey && typeof window !== 'undefined' && window.localStorage) {
        targetKey = (window.localStorage.getItem('gold_shop_supabase_anon_key') || '').trim();
      }
      if (!targetKey) {
        targetKey = (getBridgeCookie('gold_shop_sb_key') || '').trim();
      }

      if (targetUrl && targetKey) {
        url.searchParams.set('sb_url', targetUrl);
        url.searchParams.set('sb_key', targetKey);
        // Also put in hash as bulletproof fallback that iOS/proxies never strip
        url.hash = `sb_url=${encodeURIComponent(targetUrl)}&sb_key=${encodeURIComponent(targetKey)}`;
      }
      return url.toString();
    } catch {
      return '';
    }
  }, [activeConfig, mobileUrlMode]);

  // Generate QR code data URL
  useEffect(() => {
    if (!mobileSyncUrl) return;
    QRCode.toDataURL(mobileSyncUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
    })
      .then(setQrCodeDataUrl)
      .catch((err) => console.warn('QR code gen err:', err));
  }, [mobileSyncUrl]);

  const handleCopyLink = async () => {
    if (!mobileSyncUrl) return;
    try {
      await navigator.clipboard.writeText(mobileSyncUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.download = `gold-pos-mobile-sync-qr.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const handleForceUpdateCache = async () => {
    setIsRefreshingCache(true);
    await forceUpdateAndClearCache();
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-950 border border-amber-500/30 rounded-2xl p-6 shadow-sm text-stone-100 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30 shadow-xs">
            <QrCode className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Mobile App Sync QR Code ထုတ်ပေးခြင်း (Mobile Connect)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Admin Sync Tool
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              iPhone X နှင့် စမတ်ဖုန်းများတွင် ရွှေဆိုင် POS အသုံးပြုရန် ကင်မရာဖြင့် Scan ဖတ်ရုံဖြင့် Cloud Database နှင့် တိုက်ရိုက် ချိတ်ဆက်ပေးခြင်း
            </p>
          </div>
        </div>

        {/* Cloud Status Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isConnected
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-stone-900 border-stone-800 text-stone-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'
              }`}
            />
            <span>{isConnected ? 'Cloud DB အသင့်ရှိပါသည်' : 'Local DB သုံးနေသည်'}</span>
          </div>
        </div>
      </div>

      {/* Main QR Box & Instructions Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left Column: Big Interactive QR Code Card */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-stone-950 rounded-2xl border border-stone-800 shadow-inner">
          <div className="relative p-2.5 bg-white rounded-xl shadow-lg border-2 border-amber-400/80">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Mobile Sync QR Code"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            ) : (
              <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center text-xs text-stone-500">
                QR Code ထုတ်လုပ်နေပါသည်...
              </div>
            )}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 font-extrabold text-[10px] px-3 py-0.5 rounded-full shadow border border-amber-400 whitespace-nowrap">
              iPhone / Android Scan
            </div>
          </div>

          <div className="w-full flex items-center justify-center gap-2 mt-4 pt-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-850 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
              title="QR Code ပုံကို သိမ်းဆည်းရန်"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>QR သိမ်းမည်</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer transition shadow-xs"
              title="ဖုန်းသို့ Viber / Telegram / SMS မှတဆင့် ပေးပို့ရန် Link ကူးယူမည်"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-stone-950" />
                  <span>ကူးယူပြီးပါပြီ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Link ကူးယူမည်</span>
                </>
              )}
            </button>
          </div>

          {/* Shop Sync Target Info */}
          <div className="w-full mt-3 p-2.5 bg-stone-900/90 rounded-xl border border-stone-800 text-center space-y-1">
            <p className="text-[11px] font-bold text-amber-300 truncate" title={settings.shopName}>
              🏪 {settings.shopName}
            </p>
            <p className="text-[10px] text-stone-400 truncate" title={settings.address}>
              📍 {settings.address}
            </p>
            {settings.phone && (
              <p className="text-[10px] text-stone-400 font-mono">
                📞 {settings.phone}
              </p>
            )}
            <div className="pt-1 flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => refreshSupabaseData()}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 cursor-pointer transition shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isSyncing ? 'Sync လုပ်နေသည်...' : 'Cloud DB မှ ဆက်တင် ပြန်ဆွဲယူမည်'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Steps & Clear Cache Instructions */}
        <div className="md:col-span-7 space-y-3.5 text-xs">
          <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5 space-y-2">
            <h4 className="font-bold text-amber-300 text-xs sm:text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>iPhone X နှင့် စမတ်ဖုန်းများတွင် ချိတ်ဆက်အသုံးပြုပုံ:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-stone-300 text-[11.5px] leading-relaxed">
              <li>
                ဖုန်းကင်မရာ (Camera) ဖွင့်၍ ဘယ်ဘက်ရှိ <strong>QR Code</strong> ကို ချိန်ပါ (Safari သို့မဟုတ် Chrome ဖြင့် တိုက်ရိုက်ပွင့်သွားပါမည်)။
              </li>
              <li>
                ဖွင့်လိုက်သည်နှင့် Cloud Database သို့ အလိုအလျောက် <strong>တိုက်ရိုက် ချိတ်ဆက်ပြီးသား</strong> ဖြစ်သွားပါမည် (Anon Key ရိုက်ထည့်စရာ မလိုပါ)။
              </li>
              <li>
                ဖုန်းမျက်နှာပြင်တွင် App ကဲ့သို့ သုံးနိုင်ရန် Safari ၏ <strong>Share</strong> ခလုတ်မှ <strong>"Add to Home Screen"</strong> ကို နှိပ်ပြီး ထည့်သွင်းပါ။
              </li>
            </ol>
          </div>

          {/* Mode Switcher & Cache Reset */}
          <div className="p-3 bg-stone-950/50 border border-stone-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-stone-400 font-medium">QR Link အမျိုးအစား:</span>
              <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded-lg border border-stone-800">
                <button
                  type="button"
                  onClick={() => setMobileUrlMode('pre')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    mobileUrlMode === 'pre'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Live Preview (အကြံပြုထားသည်)
                </button>
                <button
                  type="button"
                  onClick={() => setMobileUrlMode('dev')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    mobileUrlMode === 'dev'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Dev Stream
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-850">
              <span className="text-[11px] text-stone-400">
                ဖုန်းတွင် စာမျက်နှာအဟောင်း (Cache) ကျန်နေပါက:
              </span>
              <button
                type="button"
                onClick={handleForceUpdateCache}
                disabled={isRefreshingCache}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-700 rounded-lg text-[11px] font-semibold cursor-pointer transition"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingCache ? 'animate-spin' : ''}`} />
                <span>{isRefreshingCache ? 'ရှင်းလင်းနေပါသည်...' : 'Mobile Cache ရှင်းလင်းမည်'}</span>
              </button>
            </div>
          </div>

          {/* Developer Access Subtext */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-stone-400 border-t border-stone-800/80">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-500" />
              <span>Database URL၊ Key နှင့် SQL Schema ပြင်ဆင်ရန် Developer ဝင်ပေါက်မှ ဝင်ပါ</span>
            </span>

            {onOpenDeveloperPortal && (
              <button
                type="button"
                onClick={onOpenDeveloperPortal}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer transition shrink-0"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Developer Portal (Ctrl+Shift+D)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
