import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Monitor,
  X,
  Check,
  Copy,
  Laptop,
  Smartphone,
  ShieldCheck,
  Printer,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Power,
  Lock,
} from 'lucide-react';
import { useKioskMode } from '../hooks/useKioskMode';

interface KioskModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type KioskTab = 'instant' | 'windows-chrome' | 'apple-ios' | 'benefits';

export const KioskModeModal: React.FC<KioskModeModalProps> = ({ isOpen, onClose }) => {
  const {
    isFullscreen,
    isSupported,
    isKioskLocked,
    enterKiosk,
    exitKiosk,
    toggleKioskLock,
  } = useKioskMode();

  const [activeTab, setActiveTab] = useState<KioskTab>('instant');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined'
    ? window.location.href
    : 'https://ais-dev-4awryxob3262afjjzhqlz4-824532102707.europe-west2.run.app/';

  const chromeKioskCommand = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk "${currentUrl}" --kiosk-printing --disable-pinch`;
  const edgeKioskCommand = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk "${currentUrl}" --edge-kiosk-type=fullscreen --kiosk-printing`;

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(id);
      setTimeout(() => setCopiedCmd(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleToggleFullscreen = async () => {
    if (isFullscreen) {
      await exitKiosk();
    } else {
      await enterKiosk();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-stone-800 p-5 sm:p-6 shadow-2xl text-stone-100 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Full-screen Kiosk Mode (မျက်နှာပြင်အပြည့် ကောင်တာစနစ်)
                </h3>
                {isFullscreen ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Kiosk Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700 text-[10px] font-semibold">
                    Normal Window
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                ကောင်တာအရောင်းစက်များတွင် Browser ဘားများဖျောက်၍ သီးသန့်ဆော့ဖ်ဝဲလ်အဖြစ် မျက်နှာပြင်အပြည့် သုံးစွဲခြင်း
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Instant Action Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-stone-950 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isFullscreen ? 'လက်ရှိတွင် Kiosk Mode ဖွင့်ထားပါသည်' : 'လက်ရှိစက်တွင် Kiosk Mode ချက်ချင်း စတင်မည်လား?'}</span>
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed max-w-md">
              {isFullscreen
                ? 'မျက်နှာပြင်အပြည့် သုံးစွဲနေပါသည်။ ပုံမှန်ဝင်းဒိုးသို့ ပြန်ထွက်ရန် အောက်ပါခလုတ် သို့မဟုတ် Keyboard မှ Esc / F11 ကို နှိပ်နိုင်ပါသည်။'
                : 'ခလုတ်တစ်ချက်နှိပ်ရုံဖြင့် Browser address bar နှင့် taskbar များကို ဖျောက်၍ ကောင်တာ POS ကို မျက်နှာပြင်အပြည့် ချက်ချင်းပြောင်းလဲပေးပါမည်။'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                isFullscreen
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-600'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20 hover:scale-105 active:scale-95'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Kiosk မှ ပြန်ထွက်မည် (Exit Kiosk)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Kiosk Mode စတင်မည် (Enter Full-screen)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Guide Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('instant')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeTab === 'instant'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>၁။ ချက်ချင်းသုံးနည်း</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('windows-chrome')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeTab === 'windows-chrome'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>၂။ Windows Kiosk Shortcut</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apple-ios')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeTab === 'apple-ios'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>၃။ iPad / iPhone (iOS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('benefits')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeTab === 'benefits'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>၄။ Kiosk ၏ အကျိုးကျေးဇူး</span>
          </button>
        </div>

        {/* TAB 1: INSTANT IN-APP KIOSK */}
        {activeTab === 'instant' && (
          <div className="space-y-3.5 text-xs text-stone-300 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-2.5">
              <h5 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <Power className="w-4 h-4" />
                <span>လက်ရှိ Browser တွင် ချက်ချင်း အသုံးပြုနည်း (Keyboard & Mouse)</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 font-mono text-amber-300 text-xs font-bold">
                      F11
                    </span>
                    <span>ခလုတ် နှိပ်ပါ</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Windows ကွန်ပျူတာ၏ Keyboard မှ <strong>F11</strong> ကို နှိပ်လိုက်ရုံဖြင့် Browser ၏ ခေါင်းစည်းဘားများ ပျောက်သွားပြီး Fullscreen ချက်ချင်း ဖြစ်သွားပါမည်။
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 font-mono text-amber-300 text-xs font-bold">
                      Esc သို့မဟုတ် F11
                    </span>
                    <span>ပြန်ထွက်ရန်</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Kiosk / Fullscreen မှ ပုံမှန်ဝင်းဒိုးသို့ ပြန်လည်ရောက်ရှိလိုပါက Keyboard မှ <strong>Esc</strong> (သို့မဟုတ်) <strong>F11</strong> ကို တစ်ချက်နှိပ်လိုက်ရုံ ဖြစ်ပါသည်။
                  </p>
                </div>
              </div>
            </div>

            {/* Kiosk Lock Switch */}
            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-bold text-stone-200 flex items-center gap-2 text-xs">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Kiosk Lock Mode (ကောင်တာ လုံခြုံရေး သော့ခတ်စနစ်)</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  ဖွင့်ထားပါက အရောင်းစာရေးများ အလွယ်တကူ ပိတ်မထွက်နိုင်စေရန် ထိန်းချုပ်ပေးပါသည်။
                </p>
              </div>
              <button
                type="button"
                onClick={toggleKioskLock}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isKioskLocked
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                }`}
              >
                {isKioskLocked ? '✓ Lock ဖွင့်ထားသည်' : 'Lock ပိတ်ထားသည်'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: WINDOWS DEDICATED KIOSK SHORTCUT */}
        {activeTab === 'windows-chrome' && (
          <div className="space-y-3.5 text-xs text-stone-300 animate-in fade-in duration-150">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
              💡 <strong>ရွှေဆိုင် POS ကောင်တာစက်များအတွက် အကြံပြုလိုဆုံး စနစ်:</strong> ကွန်ပျူတာ Desktop ပေါ်တွင် သီးသန့် Kiosk Shortcut တစ်ခု ပြုလုပ်ထားပါက ကွန်ပျူတာစက်ဖွင့်သည်နှင့် Browser ဘားများ၊ စာရိုက်ဘားများ လုံးဝမပါဘဲ POS ဆော့ဖ်ဝဲလ်စစ်စစ်ကဲ့သို့ မျက်နှာပြင်အပြည့် တိုက်ရိုက်ပွင့်လာပါမည်။
            </div>

            <div className="space-y-3">
              {/* Chrome Command */}
              <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <Laptop className="w-4 h-4" />
                    <span>Google Chrome Kiosk Shortcut Target Command:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(chromeKioskCommand, 'chrome')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-[11px] font-semibold cursor-pointer border border-stone-700 transition"
                  >
                    {copiedCmd === 'chrome' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Command</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 font-mono text-emerald-400 text-[11px] overflow-x-auto select-all">
                  {chromeKioskCommand}
                </pre>
                <p className="text-[11px] text-stone-400">
                  <strong className="text-amber-400">--kiosk-printing</strong> ပါဝင်သောကြောင့် အရောင်းဘောက်ချာထုတ်သည့်အခါ Print preview popup စောင့်စရာမလိုဘဲ Thermal Slip Printer မှ စက္ကန့်ပိုင်းအတွင်း တိုက်ရိုက် ပရင့်ထွက်လာပါမည်။
                </p>
              </div>

              {/* Step-by-step Setup on Windows */}
              <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
                <div className="font-bold text-white text-xs">
                  Windows တွင် Shortcut ဖန်တီးနည်း အဆင့် (၄) ဆင့်:
                </div>
                <ol className="space-y-1.5 text-stone-300 text-[11px] list-decimal list-inside leading-relaxed pl-1">
                  <li>
                    ကွန်ပျူတာ၏ <strong>Desktop မျက်နှာပြင်လွတ်နေရာတွင် Right-click</strong> နှိပ်ပြီး <strong>New → Shortcut</strong> ကို ရွေးချယ်ပါ။
                  </li>
                  <li>
                    ပေါ်လာသော box တွင် အထက်ပါ Copy ကူးယူထားသော <strong>Command ကို Paste (Ctrl+V)</strong> ချထည့်ပြီး Next ကို နှိပ်ပါ။
                  </li>
                  <li>
                    Shortcut Name နေရာတွင် <strong>"ရွှေဆိုင် POS"</strong> ဟု အမည်ပေးပြီး <strong>Finish</strong> ကို နှိပ်ပါ။
                  </li>
                  <li>
                    ထို Shortcut Icon ကို Double-click နှိပ်လိုက်သည်နှင့် Browser ဘားများ၊ Taskbar များမပါဘဲ <strong>ရွှေဆိုင် POS မျက်နှာပြင်အပြည့် Kiosk Mode</strong> ဖြင့် ချက်ချင်းပွင့်လာပါမည်။ (ပိတ်လိုပါက <code className="text-amber-300 bg-stone-900 px-1 rounded">Alt + F4</code> ဖြင့် ပိတ်နိုင်ပါသည်)။
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: APPLE IOS GUIDED ACCESS */}
        {activeTab === 'apple-ios' && (
          <div className="space-y-3.5 text-xs text-stone-300 animate-in fade-in duration-150">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs leading-relaxed">
              📱 <strong>iPad / iPhone (iOS) တွင် Hardware Kiosk စနစ် (Guided Access) သုံးနည်း:</strong> Apple စနစ်တွင် ဖုန်း/တက်ဘလက်တစ်ခုလုံးကို POS စနစ်တစ်ခုတည်းတွင် PIN သော့ခတ်၍ ဝန်ထမ်းများ အခြား Facebook, YouTube သို့ မထွက်နိုင်စေရန် ပြုလုပ်နိုင်ပါသည်။
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2.5">
              <div className="font-bold text-white text-xs flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Apple Guided Access စနစ် သတ်မှတ်နည်း:</span>
              </div>
              <ol className="space-y-2 text-stone-300 text-[11.5px] list-decimal list-inside leading-relaxed pl-1">
                <li>
                  iPad / iPhone ၏ <strong>Settings (ဆက်တင်) → Accessibility (သုံးစွဲနိုင်စွမ်း) → Guided Access</strong> သို့ သွားပါ။
                </li>
                <li>
                  <strong>Guided Access ကို On (ဖွင့်)</strong> ပေးပြီး <strong>Passcode Settings</strong> တွင် ဆိုင်ပိုင်ရှင်/မန်နေဂျာသာသိသော PIN နံပါတ် ၆ လုံး သတ်မှတ်ပါ။
                </li>
                <li>
                  ထို့နောက် <strong>Safari</strong> ဖြင့် ရွှေဆိုင် POS ကို ဖွင့်ပါ။
                </li>
                <li>
                  စက်၏ <strong>Side Button (Power Button) ကို ၃ ချက် ဆက်တိုက် နှိပ်ပါ (Triple-Click)</strong>။
                </li>
                <li>
                  ညာဘက်အပေါ်ထောင့်ရှိ <strong>"Start"</strong> ကို နှိပ်လိုက်ပါက စက်တစ်ခုလုံး ရွှေဆိုင် POS အတွင်း သော့ခတ်သွားမည်ဖြစ်ပြီး Home သို့ ပြန်ဆွဲတင်၍ မရတော့ပါ။ (ပြန်ထွက်လိုပါက Power Button ၃ ချက် ပြန်နှိပ်ပြီး Passcode ရိုက်ထည့်ရပါမည်)။
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 4: BENEFITS */}
        {activeTab === 'benefits' && (
          <div className="space-y-3 text-xs text-stone-300 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>၁။ အရောင်းစာရေးများ အခြားဆိုက်မဖွင့်နိုင်ခြင်း</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  ကောင်တာအရောင်းစက်တွင် ဝန်ထမ်းများ Facebook, YouTube, Games သို့မဟုတ် အခြားဝဘ်ဆိုက်များ ဖွင့်လှစ်သုံးစွဲခြင်းကို အပြည့်အဝ တားဆီးပေးပါသည်။
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-2 text-xs">
                  <Monitor className="w-4 h-4 text-amber-400" />
                  <span>၂။ မှားယွင်းပိတ်မိခြင်းမှ ကာကွယ်ခြင်း</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  အရောင်းဘောက်ချာ ရိုက်နေစဉ် Tab ကို မတော်တဆ Close လုပ်မိခြင်း၊ Back ပြန်ထွက်မိခြင်း မရှိတော့ဘဲ စာရင်းဒေတာများ မပျောက်ပျက်စေပါ။
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-2 text-xs">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>၃။ Auto Silent Printing (အမြန်ဘောက်ချာထုတ်ခြင်း)</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  <code className="text-amber-300 bg-stone-900 px-1 rounded">--kiosk-printing</code> ကြောင့် ဘောက်ချာထုတ်တိုင်း Print Preview မစောင့်ရတော့ဘဲ POS စလစ်ပရင်တာမှ စက္ကန့်ပိုင်းအတွင်း တိုက်ရိုက် ပရင့်ထွက်စေပါသည်။
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>၄။ ပရော်ဖက်ရှင်နယ် သီးသန့် POS အသွင်အပြင်</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Browser frame များ၊ Taskbar များ ဖျောက်ထားသဖြင့် ဆိုင်၏ Touch Monitor ပေါ်တွင် ပရော်ဖက်ရှင်နယ် Enterprise POS ဆော့ဖ်ဝဲလ် အသွင်ဆောင်စေပါသည်။
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-800">
          <span className="text-[11px] text-stone-500">
            {isFullscreen ? 'Press Esc to exit Full-screen' : 'Keyboard Shortcut: F11'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            ပိတ်မည် (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
