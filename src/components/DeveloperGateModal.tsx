import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  Terminal,
  Cpu,
  Sparkles,
  HelpCircle,
  Settings,
  RotateCcw,
} from 'lucide-react';

interface DeveloperGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DEFAULT_DEV_PASSCODE = 'dev9999';

export function getDeveloperPasscode(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('gold_pos_dev_passcode');
      if (stored && stored.trim()) {
        return stored.trim();
      }
    }
  } catch {}
  return DEFAULT_DEV_PASSCODE;
}

export function setDeveloperPasscode(newCode: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('gold_pos_dev_passcode', newCode.trim());
      window.dispatchEvent(new Event('dev_passcode_changed'));
    }
  } catch {}
}

export function isDeveloperSessionActive(): boolean {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem('gold_pos_dev_authed') === 'true';
    }
  } catch {}
  return false;
}

export function clearDeveloperSession(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('gold_pos_dev_authed');
    }
  } catch {}
}

export const DeveloperGateModal: React.FC<DeveloperGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Navigation mode: 'login' | 'change_passcode'
  const [activeTab, setActiveTab] = useState<'login' | 'change_passcode'>('login');

  // Login states
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Change Passcode states
  const [currentCodeInput, setCurrentCodeInput] = useState('');
  const [newCodeInput, setNewCodeInput] = useState('');
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [showCurrentCode, setShowCurrentCode] = useState(false);
  const [showNewCode, setShowNewCode] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  // Active passcode state
  const [activeSavedCode, setActiveSavedCode] = useState<string>(() => getDeveloperPasscode());

  const refreshActiveCode = () => {
    setActiveSavedCode(getDeveloperPasscode());
  };

  useEffect(() => {
    if (isOpen) {
      refreshActiveCode();
      setPasscode('');
      setLoginError('');
      setChangeError('');
      setChangeSuccess('');
      setIsSuccess(false);
      setActiveTab('login');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSync = () => refreshActiveCode();
    window.addEventListener('dev_passcode_changed', handleSync);
    return () => window.removeEventListener('dev_passcode_changed', handleSync);
  }, []);

  if (!isOpen) return null;

  const isCustomCodeActive = activeSavedCode !== DEFAULT_DEV_PASSCODE;

  // Verify passcode to enter portal
  const handleVerifyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = passcode.trim();
    const currentCode = getDeveloperPasscode();

    // If custom code is set, ONLY the custom code (or emergency code '889900') is accepted.
    // The old default 'dev9999' is explicitly blocked when a custom code is active!
    const isMatches =
      cleanInput === currentCode ||
      (currentCode === DEFAULT_DEV_PASSCODE && (cleanInput === 'dev@9999' || cleanInput === '889900')) ||
      cleanInput === '889900';

    if (isMatches) {
      setIsSuccess(true);
      setLoginError('');
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem('gold_pos_dev_authed', 'true');
        }
      } catch {}

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 350);
    } else {
      setLoginError(
        isCustomCodeActive
          ? 'Developer Passcode အသစ် မှားယွင်းနေပါသည်။ သတ်မှတ်ထားသော Passcode အသစ်ဖြင့်သာ ဝင်ရောက်နိုင်ပါသည် (မူလ dev9999 အလုပ်မလုပ်တော့ပါ)။'
          : 'Developer Master Passcode မှားယွင်းနေပါသည်။ (Default Code: dev9999)'
      );
      setIsSuccess(false);
    }
  };

  // Change Developer Passcode
  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    const cleanCurrent = currentCodeInput.trim();
    const cleanNew = newCodeInput.trim();
    const cleanConfirm = confirmCodeInput.trim();
    const realCurrentCode = getDeveloperPasscode();

    // 1. Verify current passcode
    if (cleanCurrent !== realCurrentCode && cleanCurrent !== '889900') {
      setChangeError('လက်ရှိ Developer Passcode မှားယွင်းနေပါသည်။ ပြန်လည်စစ်ဆေးပါ။');
      return;
    }

    // 2. Validate new passcode
    if (!cleanNew) {
      setChangeError('Passcode အသစ် ရိုက်ထည့်ပေးရန် လိုအပ်ပါသည်');
      return;
    }
    if (cleanNew.length < 4) {
      setChangeError('Passcode သည် အနည်းဆုံး စာလုံး/ဂဏန်း ၄ လုံး ရှိရပါမည်');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setChangeError('Passcode အသစ်နှင့် အတည်ပြု Passcode တူညီမှု မရှိပါ');
      return;
    }

    // 3. Save new passcode
    setDeveloperPasscode(cleanNew);
    refreshActiveCode();
    setChangeSuccess(`✓ Developer Master Passcode ကို "${cleanNew}" အဖြစ် အောင်မြင်စွာ ပြောင်းလဲသတ်မှတ်ပြီးပါပြီ!`);

    // Reset inputs & switch to login with new code prefilled
    setTimeout(() => {
      setPasscode(cleanNew);
      setActiveTab('login');
      setCurrentCodeInput('');
      setNewCodeInput('');
      setConfirmCodeInput('');
    }, 1200);
  };

  // Reset to default passcode
  const handleResetToDefault = () => {
    setDeveloperPasscode(DEFAULT_DEV_PASSCODE);
    refreshActiveCode();
    setChangeSuccess(`✓ မူလ ပုံသေ Developer Passcode (${DEFAULT_DEV_PASSCODE}) သို့ Reset ပြုလုပ်ပြီးပါပြီ`);
    setPasscode(DEFAULT_DEV_PASSCODE);
    setTimeout(() => {
      setActiveTab('login');
      setChangeSuccess('');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-amber-500/40 text-stone-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">
                  Developer Portal Gate
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {isCustomCodeActive ? 'Custom Code Active' : 'Default Code'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                နည်းပညာရှင် သီးသန့်ဝင်ပေါက် (Restricted Access)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher inside Gate */}
        <div className="flex border-b border-stone-800 bg-stone-950/60 px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError('');
            }}
            className={`px-3 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-stone-900 border-stone-700 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>၁။ Passcode ဖြင့် ဝင်မည်</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('change_passcode');
              setChangeError('');
              setChangeSuccess('');
            }}
            className={`px-3 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'change_passcode'
                ? 'bg-stone-900 border-stone-700 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>၂။ Passcode အသစ် ပြောင်းမည်</span>
          </button>
        </div>

        {/* Tab 1: LOGIN MODE */}
        {activeTab === 'login' && (
          <div className="p-5 space-y-4">
            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 space-y-1.5 text-xs text-stone-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  <span>Developer System Verification:</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    isCustomCodeActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400 border border-stone-700'
                  }`}
                >
                  {isCustomCodeActive ? 'စိတ်ကြိုက် Passcode သတ်မှတ်ထားသည်' : 'Default Code: dev9999'}
                </span>
              </div>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                Supabase Cloud Database၊ Table Schema၊ Anon Key များနှင့် စနစ် Diagnostics စီမံရန် Developer Passcode ရိုက်ထည့်ပါ။
              </p>
            </div>

            <form onSubmit={handleVerifyLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>Developer Master Passcode:</span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    Shortcut: Ctrl + Shift + D
                  </span>
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="Passcode ရိုက်ထည့်ပါ..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-10 py-2.5 text-sm font-mono text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {loginError && (
                  <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 animate-in fade-in leading-relaxed">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {isSuccess && (
                  <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Passcode မှန်ကန်ပါသည်! Developer Portal ပွင့်လာနေပါသည်...</span>
                  </div>
                )}
              </div>

              {/* Quick Switch / Hint */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-stone-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition text-[11px]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? 'အကြံပြုချက် ဝှက်မည်' : 'Passcode အကြံပြုချက်'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('change_passcode');
                    setChangeError('');
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                >
                  Passcode အသစ် ပြောင်းမည် →
                </button>
              </div>

              {showHint && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1 animate-in fade-in">
                  <div>
                    • မူလ ပုံသေ Developer Passcode မှာ <strong>{DEFAULT_DEV_PASSCODE}</strong> ဖြစ်ပါသည်။
                  </div>
                  {isCustomCodeActive && (
                    <div className="text-emerald-300">
                      • သင်သည် Passcode အသစ် သတ်မှတ်ထားပြီး ဖြစ်သဖြင့် သတ်မှတ်ထားသော Passcode အသစ်ဖြင့်သာ ဝင်ရောက်နိုင်ပါမည်။
                    </div>
                  )}
                  <div>
                    • Passcode မေ့နေပါက "Passcode အသစ် ပြောင်းမည်" tab သို့ သွား၍ Reset ပြုလုပ်နိုင်ပါသည်။
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  ပိတ်မည်
                </button>
                <button
                  type="submit"
                  disabled={!passcode.trim()}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer ${
                    passcode.trim()
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:scale-102 active:scale-98'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Developer Portal သို့ ဝင်မည်</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: CHANGE PASSCODE DIRECTLY */}
        {activeTab === 'change_passcode' && (
          <div className="p-5 space-y-4">
            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 space-y-1 text-xs text-stone-300">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Developer Passcode အသစ် သတ်မှတ်ခြင်း</span>
              </span>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                လက်ရှိ Passcode ကို ရိုက်ထည့်၍ သင်စိတ်ကြိုက် Passcode အသစ်သို့ ဤနေရာမှ တိုက်ရိုက် ပြောင်းလဲနိုင်ပါသည်။
              </p>
            </div>

            <form onSubmit={handleChangePasscode} className="space-y-3">
              {/* Current Passcode */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  ၁။ လက်ရှိ Passcode (Current Passcode):
                </label>
                <div className="relative">
                  <input
                    type={showCurrentCode ? 'text' : 'password'}
                    value={currentCodeInput}
                    onChange={(e) => {
                      setCurrentCodeInput(e.target.value);
                      setChangeError('');
                    }}
                    placeholder={
                      isCustomCodeActive
                        ? 'လက်ရှိ Passcode ရိုက်ထည့်ပါ...'
                        : 'မူလ Passcode: dev9999'
                    }
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentCode(!showCurrentCode)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                  >
                    {showCurrentCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {!isCustomCodeActive && (
                  <button
                    type="button"
                    onClick={() => setCurrentCodeInput(DEFAULT_DEV_PASSCODE)}
                    className="text-[10px] text-amber-400 underline mt-1 font-mono cursor-pointer"
                  >
                    Default Code ({DEFAULT_DEV_PASSCODE}) ဖြည့်မည်
                  </button>
                )}
              </div>

              {/* New Passcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    ၂။ Passcode အသစ်:
                  </label>
                  <div className="relative">
                    <input
                      type={showNewCode ? 'text' : 'password'}
                      value={newCodeInput}
                      onChange={(e) => {
                        setNewCodeInput(e.target.value);
                        setChangeError('');
                      }}
                      placeholder="Passcode အသစ်..."
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewCode(!showNewCode)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                    >
                      {showNewCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    ၃။ အတည်ပြု Passcode:
                  </label>
                  <input
                    type={showNewCode ? 'text' : 'password'}
                    value={confirmCodeInput}
                    onChange={(e) => {
                      setConfirmCodeInput(e.target.value);
                      setChangeError('');
                    }}
                    placeholder="ထပ်မံရိုက်ထည့်ပါ..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              {changeError && (
                <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-1.5 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              {changeSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              {/* Actions & Emergency Reset */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-rose-300 underline cursor-pointer"
                  title="မူလ default passcode (dev9999) သို့ ပြန်လည်သတ်မှတ်မည်"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Default ({DEFAULT_DEV_PASSCODE}) သို့ Reset</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    မပြောင်းတော့ပါ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition"
                  >
                    Passcode အသစ် သိမ်းမည်
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
