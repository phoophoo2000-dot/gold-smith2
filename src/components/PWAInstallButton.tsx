import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  X,
  Check,
  Laptop,
  ExternalLink,
  HelpCircle,
  Copy,
  Terminal,
  Code2,
  FolderArchive,
  Play,
  Monitor,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { forceUpdateAndClearCache, APP_VERSION } from '../services/pwaService';
import { getActiveSupabaseConfig, getBridgeCookie } from '../lib/supabase';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
}

type GuideTab = 'desktop-app' | 'source-code' | 'mobile-app';

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<GuideTab>(() => (isIOS ? 'mobile-app' : 'desktop-app'));
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSyncLink, setCopiedSyncLink] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  // Sync activeTab if iOS detected
  React.useEffect(() => {
    if (isIOS) {
      setActiveTab('mobile-app');
    }
  }, [isIOS]);

  const [mobileUrlMode, setMobileUrlMode] = useState<'pre' | 'dev'>('pre');

  // Compute mobile sync URL that carries active Supabase credentials
  // ALWAYS bundles the Supabase URL and Anon Key together so iPhone X installs with full Cloud credentials
  const currentSyncUrl = React.useMemo(() => {
    const fallback = 'https://ais-pre-4awryxob3262afjjzhqlz4-824532102707.europe-west2.run.app/';
    if (typeof window === 'undefined') {
      return fallback;
    }
    const rawOrigin = window.location.origin;
    let targetOrigin = rawOrigin;
    if (mobileUrlMode === 'pre') {
      targetOrigin = rawOrigin.replace(/ais-dev-([a-z0-9]+)/gi, 'ais-pre-$1');
    } else {
      targetOrigin = rawOrigin.replace(/ais-pre-([a-z0-9]+)/gi, 'ais-dev-$1');
    }
    const url = new URL(targetOrigin + window.location.pathname);
    // Bypasses iOS / Safari cookie_check redirect freeze
    url.searchParams.set('__storage_access_granted', '1');

    // ALWAYS bundle Supabase URL and Anon Key into URL query parameters
    const cfg = getActiveSupabaseConfig();
    const activeUrl = (cfg.url || 'https://fkzuqvwdngijgacereru.supabase.co').trim();
    let activeKey = (cfg.anonKey || '').trim();
    if (!activeKey && typeof window !== 'undefined' && window.localStorage) {
      activeKey = (window.localStorage.getItem('gold_shop_supabase_anon_key') || '').trim();
    }
    if (!activeKey) {
      activeKey = (getBridgeCookie('gold_shop_sb_key') || '').trim();
    }

    if (activeUrl && activeKey) {
      url.searchParams.set('sb_url', activeUrl);
      url.searchParams.set('sb_key', activeKey);
      url.hash = `sb_url=${encodeURIComponent(activeUrl)}&sb_key=${encodeURIComponent(activeKey)}`;
    }

    return url.toString();
  }, [mobileUrlMode]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined' && currentSyncUrl) {
      import('qrcode')
        .then((QRCode) => {
          QRCode.default.toDataURL(currentSyncUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: '#1c1917',
              light: '#ffffff',
            },
          })
            .then(setQrCodeDataUrl)
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, [currentSyncUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentSyncUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleCopySyncLink = async () => {
    try {
      await navigator.clipboard.writeText(currentSyncUrl);
      setCopiedSyncLink(true);
      setTimeout(() => setCopiedSyncLink(false), 2500);
    } catch {}
  };

  const handleForceClearCache = async () => {
    setClearingCache(true);
    await forceUpdateAndClearCache();
  };

  const handleClick = async () => {
    if (isIOS) {
      setActiveTab('mobile-app');
      setShowModal(true);
      return;
    }

    if (isInstallable) {
      setInstalling(true);
      try {
        const success = await install();
        if (!success) {
          setShowModal(true);
        }
      } catch {
        setShowModal(true);
      } finally {
        setInstalling(false);
      }
    } else {
      setShowModal(true);
    }
  };

  // If already running as an installed standalone PWA, still allow opening management modal to clear cache / update
  if (isInstalled && !showModal) {
    return (
      <button
        type="button"
        onClick={() => {
          setActiveTab('mobile-app');
          setShowModal(true);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition shadow-xs"
        title="App ထည့်သွင်းထားသည် (နှိပ်၍ ဗားရှင်းစစ်ဆေးခြင်း သို့မဟုတ် Cache ရှင်းနိုင်ပါသည်)"
      >
        <Check className="w-3.5 h-3.5" />
        <span>App သွင်းပြီးပါပြီ (v{APP_VERSION})</span>
      </button>
    );
  }

  const handleCopyCodeCommand = async () => {
    const text = 'npm install\nnpm run dev';
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {variant === 'full' ? (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>ကွန်ပျူတာ / ဖုန်းတွင် App အဖြစ် ထည့်သွင်းရန်</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  PWA & Download
                </span>
              </h4>
              <p className="text-xs text-amber-100/90 mt-0.5 max-w-xl leading-relaxed">
                စက်ထဲတွင် သီးသန့်ဆော့ဖ်ဝဲလ် (Desktop/Mobile App) ကဲ့သို့ တပ်ဆင်ထားပြီး အင်တာနက်မရှိချိန် (Offline) တွင်ပါ ချက်ချင်းဖွင့်လှစ် အသုံးပြုနိုင်ပါသည်။
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            disabled={installing}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-950 text-amber-300 hover:bg-stone-900 hover:text-amber-200 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer shrink-0 border border-amber-500/30"
          >
            <Download className="w-4 h-4" />
            <span>{installing ? 'Install လုပ်နေသည်...' : 'App ထည့်သွင်းနည်း (Install / Download)'}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={installing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
          title="ကွန်ပျူတာ သို့မဟုတ် ဖုန်းတွင် App အဖြစ် ထည့်သွင်းရန်"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install / Download</span>
        </button>
      )}

      {/* INSTALL & DOWNLOAD GUIDE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-stone-800 p-5 sm:p-6 shadow-2xl text-stone-100 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>ကွန်ပျူတာတွင် အသုံးပြုနည်း / ဒေါင်းလုဒ်ရယူနည်း</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Desktop App အဖြစ် တိုက်ရိုက်သွင်းခြင်း သို့မဟုတ် Source Code ဒေါင်းလုဒ်ဆွဲ၍ Run နည်း
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick URL Bar / Preview Environment Helper */}
            {isInIframe && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    လက်ရှိတွင် AI Studio Preview စာမျက်နှာအတွင်း ရောက်ရှိနေသောကြောင့် Browser လုံခြုံရေးအရ Tab အသစ် (သို့မဟုတ်) သီးသန့် Browser Window ဖြင့်ဖွင့်ပြီးမှ App အဖြစ် တိုက်ရိုက် Install ပြုလုပ်နိုင်ပါမည်။
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <a
                    href={currentSyncUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Tab အသစ်တွင် သီးသန့်ဖွင့်မည် (Open in New Tab)</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-lg text-xs transition cursor-pointer border border-stone-700"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link ကူးယူပြီးပါပြီ (Copied!)' : 'App Link ကူးယူမည် (Copy Link)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Guide Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('desktop-app')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition cursor-pointer ${
                  activeTab === 'desktop-app'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>၁။ Desktop App (PWA) သွင်းနည်း</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('source-code')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition cursor-pointer ${
                  activeTab === 'source-code'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>၂။ Source Code ဒေါင်းလုဒ် & Run နည်း</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mobile-app')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition cursor-pointer ${
                  activeTab === 'mobile-app'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>၃။ ဖုန်း / Tablet တွင် သွင်းနည်း</span>
              </button>
            </div>

            {/* TAB 1: DESKTOP APP (PWA) */}
            {activeTab === 'desktop-app' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
                  💡 <strong>အလွယ်ကူဆုံးနည်းလမ်း (Coding / Command မလိုပါ):</strong> ကွန်ပျူတာ၏ Google Chrome သို့မဟုတ် Microsoft Edge browser ဖြင့် Desktop App အဖြစ် တိုက်ရိုက် Install ပြုလုပ်နိုင်ပါသည်။ သီးသန့် Desktop Icon ထွက်ပေါ်လာမည်ဖြစ်ပြီး အင်တာနက်မရှိချိန် (Offline) တွင်ပါ မူလ Desktop Software ကဲ့သို့ သုံးနိုင်ပါသည်။
                </div>

                <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 space-y-3 text-xs text-stone-300">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                    <Laptop className="w-4 h-4" />
                    <span>Google Chrome သို့မဟုတ် Microsoft Edge (Windows / Mac) ဖြင့် သွင်းနည်း</span>
                  </div>
                  <ol className="space-y-2.5 text-stone-300 text-xs list-decimal list-inside leading-relaxed pl-1">
                    <li>
                      အထက်ပါ <strong>"Tab အသစ်တွင် သီးသန့်ဖွင့်မည် (Open in New Tab)"</strong> ခလုတ်ကို နှိပ်ပါ (သို့မဟုတ် Link ကို copy ယူ၍ Chrome / Edge တွင် ဖွင့်ပါ)။
                    </li>
                    <li>
                      Browser ၏ အပေါ်ဘက် <strong>Address Bar (URL ရိုက်သည့်နေရာ)</strong> ၏ ညာဘက်စွန်းရှိ <strong>Install App icon (ကွန်ပျူတာပုံ သို့မဟုတ် အောက်ထိုးမြှားပုံ)</strong> ကို နှိပ်ပြီး <strong>"Install"</strong> ကို ရွေးချယ်ပါ။
                    </li>
                    <li>
                      သို့မဟုတ် ညာဘက်ထိပ်ရှိ <strong>Menu (အစက်သုံးစက် ⋮)</strong> ကိုနှိပ်ပြီး <strong>"Install ရွှေရတနာ ရွှေဆိုင် POS စနစ်..."</strong> သို့မဟုတ် <strong>"Save and share" → "Install page as app"</strong> ကို နှိပ်ပါ။
                    </li>
                    <li>
                      Install ပြီးသည်နှင့် ကွန်ပျူတာ၏ <strong>Desktop ပေါ်တွင် ရွှေဆိုင် POS Icon</strong> ထွက်ပေါ်လာမည်ဖြစ်ပြီး browser frame မပါဘဲ သီးသန့် Window ဖြင့် အချိန်မရွေး ကလစ်တစ်ချက်နှိပ်ရုံဖြင့် ဖွင့်လှစ် အသုံးပြုနိုင်ပါပြီ။
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 2: SOURCE CODE & RUN WITH NODE.JS */}
            {activeTab === 'source-code' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs leading-relaxed">
                  🛠️ <strong>Source Code အပြည့်အစုံ ကွန်ပျူတာပေါ် ဒေါင်းလုဒ်ရယူပြီး Run နည်း:</strong> Project code များကို ကိုယ်ပိုင် Local PC ပေါ်တွင် Node.js ဖြင့် offline development သို့မဟုတ် production server အဖြစ် ထားရှိသုံးစွဲလိုပါက အောက်ပါအတိုင်း ဆောင်ရွက်နိုင်ပါသည်။
                </div>

                <div className="space-y-3 text-xs text-stone-300">
                  <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sky-400">
                      <FolderArchive className="w-4 h-4" />
                      <span>အဆင့် ၁။ AI Studio မှ Project Code အားလုံး ဒေါင်းလုဒ်ရယူပါ</span>
                    </div>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      Google AI Studio မျက်နှာပြင်၏ ညာဘက်ထိပ်ပိုင်းရှိ <strong>"Code" / "Export"</strong> ခလုတ်ကို နှိပ်ပြီး <strong>"Download ZIP"</strong> ကို ရွေးချယ်၍ ZIP ဖိုင်ကို ကွန်ပျူတာထဲသို့ သိမ်းဆည်းပါ။ ထို့နောက် ZIP ဖိုင်ကို folder အသစ်တစ်ခုအတွင်းသို့ Extract (Unzip) ပြုလုပ်ပါ။
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sky-400">
                      <Terminal className="w-4 h-4" />
                      <span>အဆင့် ၂။ Node.js ထည့်သွင်းထားပါ</span>
                    </div>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      ကွန်ပျူတာတွင် Node.js (v18 သို့မဟုတ် v20+) မရှိသေးပါက <strong className="text-white">https://nodejs.org</strong> မှ အခမဲ့ ဒေါင်းလုဒ်ရယူပြီး install လုပ်ပေးပါ။
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sky-400">
                        <Play className="w-4 h-4" />
                        <span>အဆင့် ၃။ Terminal / CMD တွင် Command Run ပါ</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCodeCommand}
                        className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-750 rounded text-[11px] text-stone-300 transition cursor-pointer border border-stone-700"
                      >
                        {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCmd ? 'Copied' : 'Copy Commands'}</span>
                      </button>
                    </div>
                    <p className="text-stone-400 text-xs">
                      Extract ထားသော folder အတွင်း Terminal သို့မဟုတ် Command Prompt (cmd) ဖွင့်၍ အောက်ပါ command များကို ရိုက်ထည့်ပါ:
                    </p>
                    <pre className="p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono text-emerald-400 text-xs overflow-x-auto select-all">
                      {`# 1. Package များကို install ပြုလုပ်ပါ
npm install

# 2. Local development server ကို ဖွင့်ပါ
npm run dev`}
                    </pre>
                    <p className="text-stone-300 text-xs">
                      Server စတင်သည်နှင့် Browser တွင် <strong className="text-amber-400">http://localhost:3000</strong> ကို ရိုက်ထည့်၍ အသုံးပြုနိုင်ပါပြီ။
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MOBILE APP */}
            {activeTab === 'mobile-app' && (
              <div className="space-y-3.5 text-xs text-stone-300 animate-in fade-in duration-150">
                {/* Header & URL Mode Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-stone-950/90 p-3 rounded-xl border border-stone-800">
                  <div>
                    <span className="font-bold text-white text-xs">Link အမျိုးအစား ရွေးချယ်ရန်:</span>
                    <p className="text-[10.5px] text-stone-400">စက်နှင့် သင့်လျော်သော URL အမျိုးအစားကို ရွေးနိုင်ပါသည်</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-lg border border-stone-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileUrlMode('pre')}
                      className={`px-2.5 py-1 rounded-md font-mono font-bold text-[11px] cursor-pointer transition ${
                        mobileUrlMode === 'pre'
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      ais-pre (Public)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileUrlMode('dev')}
                      className={`px-2.5 py-1 rounded-md font-mono font-bold text-[11px] cursor-pointer transition ${
                        mobileUrlMode === 'dev'
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      ais-dev (Dev)
                    </button>
                  </div>
                </div>

                {/* Key Auto-bundled Badge */}
                <div className="flex items-center gap-2.5 text-xs bg-amber-500/10 px-3.5 py-2.5 rounded-xl border border-amber-500/30 text-amber-200">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="leading-snug">
                    <span className="font-bold text-amber-300">Supabase Anon Key အား URL နှင့်အတူ အလိုအလျောက် ထည့်သွင်းပေးထားပါသည်</span>
                    <p className="text-[10.5px] text-amber-200/80">iPhone X တွင် Scan ဖတ်ရုံဖြင့် Cloud Database နှင့် တိုက်ရိုက်ချိတ်ဆက်အသုံးပြုနိုင်မည်ဖြစ်ပါသည်။</p>
                  </div>
                </div>

                {/* QR Code Scanner for Fast Mobile Access */}
                {qrCodeDataUrl && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-stone-950/80 border border-stone-800">
                    <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
                      <img src={qrCodeDataUrl} alt="App QR Code" className="w-28 h-28 sm:w-32 sm:h-32 block" />
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left flex-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        📱 iPhone ကင်မရာဖြင့် တိုက်ရိုက် Scan ဖတ်နိုင်သည်
                      </span>
                      <h4 className="text-white font-bold text-sm">
                        iPhone X ဖြင့် အလွယ်တကူ ဖွင့်ရန် QR Code ({mobileUrlMode === 'pre' ? 'ais-pre' : 'ais-dev'})
                      </h4>
                      <p className="text-stone-300 text-xs leading-relaxed">
                        iPhone Camera ဖြင့် ဤ QR Code ကို ချိန်လိုက်ပါက Safari / Chrome တွင် App လင့်ခ် တိုက်ရိုက် ပွင့်လာပါမည်။
                      </p>
                      <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold cursor-pointer border border-stone-700"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Link Copied!' : `${mobileUrlMode === 'pre' ? 'ais-pre' : 'ais-dev'} Copy Link`}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* iPhone X Safari "server stopped responding" Specific Troubleshooting Card */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>⚠️ iPhone X Safari တွင် "Safari couldn't open the page because the server stopped responding" ပြနေပါက ဖြေရှင်းနည်း:</span>
                  </div>
                  <div className="text-[11.5px] text-stone-300 space-y-1.5 leading-relaxed">
                    <p className="text-stone-200">
                      iPhone X (iOS 16) ၏ Safari သည် လုံခြုံရေးအရ Third-Party Cookie Check ကို အလိုအလျောက် ပိတ်ထားတတ်သောကြောင့် Cloud Run ဆာဗာနှင့် ချိတ်ဆက်ရာတွင် Timeout ဖြစ်သွားခြင်း ဖြစ်ပါသည်။
                    </p>
                    <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 space-y-2">
                      <div className="font-semibold text-amber-300 text-xs">အောက်ပါ အဆင့် ၃ ဆင့်ဖြင့် ချက်ချင်း ပြေလည်နိုင်ပါသည်:</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-stone-200 pl-1">
                        <li>
                          <strong>နည်းလမ်း ၁ (Safari ဆက်တင်):</strong> iPhone ၏ <strong>Settings &gt; Safari</strong> သို့သွားပြီး <strong>"Prevent Cross-Site Tracking"</strong> နှင့် <strong>"Block All Cookies"</strong> နှစ်ခုလုံးကို <strong>OFF (ပိတ်)</strong> ပေးပါ။ ထို့နောက် အောက်ဆုံးရှိ <strong>"Clear History and Website Data"</strong> ကို နှိပ်၍ Safari ကို ပြန်ဖွင့်ပါ။
                        </li>
                        <li>
                          <strong>နည်းလမ်း ၂ (Chrome / Edge ဖြင့် ဖွင့်ခြင်း - အကြံပြုချက်):</strong> Safari အစား iPhone App Store မှ <strong>Google Chrome</strong> သို့မဟုတ် <strong>Microsoft Edge</strong> ကို ဒေါင်းလုဒ်ဆွဲပြီး အဆိုပါ Browser ဖြင့် ဤ QR Code ကို Scan ဖတ်ဖွင့်ပါက Cookie ပြဿနာမရှိဘဲ ချက်ချင်း ပွင့်သွားပါမည်။
                        </li>
                        <li>
                          <strong>နည်းလမ်း ၃ (Short URL ပြောင်းရန်):</strong> အထက်ရှိ <strong>"Key ပါဝင်သော Auto-Connect Link"</strong> အမှန်ခြစ်ကို ဖြုတ်ပြီး ထွက်လာသော သန့်ရှင်းသည့် Short QR Code ကို ဖတ်ကြည့်ပါ။
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* iPhone X Offline Cache Refresh Troubleshooting Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-950 border border-amber-500/40 text-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-xs sm:text-sm">
                      <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>⚠️ iPhone တွင် စာမျက်နှာအဟောင်း Cache ကျန်နေပါက ဖြေရှင်းနည်း</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                      Cache Refresh
                    </span>
                  </div>

                  <div className="text-[11.5px] text-stone-300 space-y-2 leading-relaxed">
                    <p>
                      iPhone ၏ iOS WebKit စနစ်သည် Home Screen တွင် သွင်းထားသော App ၏ Data နှင့် Offline Cache များကို Browser နှင့် သီးခြားခွဲ၍ အလွန်တင်းကျပ်စွာ သိမ်းဆည်းထားတတ်ပါသည်။ ထို့ကြောင့် ကွန်ပျူတာတွင် Update အသစ် ပြုလုပ်ထားသော်လည်း iPhone ထဲ၌ စာမျက်နှာအဟောင်း Cache သာ ဆက်လက် ပေါ်နေတတ်ပါသည်။
                    </p>

                    <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 space-y-2">
                      <div className="font-semibold text-amber-300 text-xs">အောက်ပါ အဆင့် ၃ ဆင့်အတိုင်း လုပ်ဆောင်ပေးပါ:</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-stone-200 pl-1">
                        <li><strong>အဆင့် ၁:</strong> iPhone ၏ Home Screen (ပင်မမျက်နှာပြင်) ရှိ ယခင် ရွှေဆိုင် App Icon အဟောင်းကို ဖိနှိပ်၍ <strong>"Delete Bookmark" သို့မဟုတ် "Delete App"</strong> ဖြင့် အရင်ဆုံး ဖျက်ပစ်ပါ။</li>
                        <li><strong>အဆင့် ၂:</strong> အောက်ပါ <strong>"🔄 iPhone Cache ရှင်းပြီး Force Reload လုပ်မည်"</strong> ခလုတ်ကို နှိပ်ပါ။</li>
                        <li><strong>အဆင့် ၃:</strong> Safari တွင် App အသစ်ပွင့်လာသည်နှင့် Safari ၏ <strong>Share ခလုတ်</strong> မှတဆင့် <strong>"Add to Home Screen"</strong> ကို အသစ် ပြန်လည် ထည့်သွင်းပါ။</li>
                      </ol>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleForceClearCache}
                        disabled={clearingCache}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow cursor-pointer transition"
                      >
                        <RotateCcw className={`w-4 h-4 ${clearingCache ? 'animate-spin' : ''}`} />
                        <span>{clearingCache ? 'ရှင်းလင်းနေပါသည်...' : '🔄 iPhone Cache ရှင်းပြီး Force Reload လုပ်မည်'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopySyncLink}
                        className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                      >
                        {copiedSyncLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSyncLink ? 'Link Copied!' : 'App Link ကူးယူမည်'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* iPhone / iPad Safari */}
                <div className={`p-4 rounded-xl border space-y-2.5 ${isIOS ? 'bg-amber-500/10 border-amber-500/40' : 'bg-stone-950/60 border-stone-800'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                      <Smartphone className="w-4 h-4 text-amber-400" />
                      <span>iPhone / iPad တွင် App သွင်းနည်း (Apple Safari)</span>
                    </div>
                    {isIOS && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        လက်ရှိစက်: iOS
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-700/80 text-amber-200 text-[11px] leading-relaxed">
                    ⚠️ <strong>အရေးကြီးဆုံးအချက်:</strong> iPhone တွင် Google Chrome၊ Facebook၊ Viber သို့မဟုတ် Messenger အတွင်းမှ ဖွင့်ပါက Apple စနစ်အရ Install ခွင့်မပေးပါ။ <strong>Apple Safari Browser</strong> ဖြင့်သာ ဖွင့်ရပါမည်။
                  </div>

                  <ol className="space-y-2 text-stone-200 text-[12px] list-decimal list-inside leading-relaxed pl-1">
                    <li>
                      <strong>Apple Safari browser</strong> ဖြင့် App Link ကို ဖွင့်ပါ။ (အကယ်၍ အခြား app ထဲ ရောက်နေပါက Safari ဖြင့် ပြန်ဖွင့်ပါ)။
                    </li>
                    <li>
                      Safari မျက်နှာပြင် အောက်ခြေအလယ်ရှိ <strong>Share ခလုတ်</strong> (စတုဂံပုံထဲမှ အပေါ်ထိုးမြှားပုံ ⎋) ကို နှိပ်ပါ။
                    </li>
                    <li>
                      ပေါ်လာသော Menu စာရင်းထဲမှ အောက်သို့ဆွဲချပြီး <strong>"Add to Home Screen (ပင်မမျက်နှာပြင်သို့ ထည့်ရန် ⊞)"</strong> ကို နှိပ်ပါ။
                    </li>
                    <li>
                      ညာဘက်အပေါ်ထောင့်ရှိ <strong>"Add (ထည့်မည်)"</strong> ကို နှိပ်လိုက်ပါက iPhone ၏ Home Screen တွင် ရွှေဆိုင် App Icon တိုက်ရိုက် ထွက်ပေါ်လာပါမည်။
                    </li>
                  </ol>
                </div>

                {/* Android Phone / Tablet */}
                <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <Smartphone className="w-4 h-4" />
                    <span>Android ဖုန်း / Tablet (Google Chrome)</span>
                  </div>
                  <ul className="space-y-1.5 text-stone-300 text-[12px] list-disc list-inside leading-relaxed pl-1">
                    <li>
                      Chrome browser ဖြင့် App Link ကို ဖွင့်ပါ။
                    </li>
                    <li>
                      ညာဘက်ထိပ်ရှိ <strong>Menu (အစက်သုံးစက် ⋮)</strong> ကို နှိပ်ပါ။
                    </li>
                    <li>
                      <strong>"Install app"</strong> သို့မဟုတ် <strong>"Add to Home screen (ပင်မမျက်နှာပြင်သို့ ထည့်မည်)"</strong> ကို ရွေးချယ်ပါ။
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-800">
              <span className="text-[11px] text-stone-500">
                ရွှေရတနာ ရွှေဆိုင် POS စနစ် • Offline-First PWA
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                ပိတ်မည် (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
