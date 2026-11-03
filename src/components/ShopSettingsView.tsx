import React, { useState, useEffect } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import {
  Settings,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Smartphone,
  Wifi,
  Lock,
  Store,
  Laptop,
  Terminal,
  FileText,
  Copy,
  Check,
  Archive,
  Trash2,
  Database,
  HardDrive,
  Sparkles,
  Cloud,
  Scan,
  QrCode,
  Volume2,
  Plug,
  Maximize2,
  Minimize2,
  Monitor,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { AuditLogsModal } from './AuditLogsModal';
import { DataCleanupArchivalModal } from './DataCleanupArchivalModal';
import { ConnectSupabaseModal } from './ConnectSupabaseModal';
import { AdminMobileSyncCard } from './AdminMobileSyncCard';
import { DeveloperGateModal, isDeveloperSessionActive } from './DeveloperGateModal';
import { KioskModeModal } from './KioskModeModal';
import { useKioskMode } from '../hooks/useKioskMode';
import {
  downloadSystemLogs,
  copySystemLogsToClipboard,
  getSystemLogs,
} from '../services/loggerService';
import { matchProductByBarcode, scannerSounds } from '../services/barcodeService';
import { Product } from '../types/gold';
import { getActiveSupabaseConfig } from '../lib/supabase';

export const ShopSettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    currentCounter,
    setCurrentCounter,
    counters,
    exportBackup,
    importBackup,
    resetToInitialData,
    lockSession,
    sales,
    purchases,
    expenses,
    products,
    workshopOrders,
    isSupabaseConnected,
    lastSyncedTime,
    deduplicateStock,
    syncProductsToSupabase,
  } = useGoldShop();

  const [shopName, setShopName] = useState(settings.shopName);
  const [shopNameMm, setShopNameMm] = useState(settings.shopNameMm || '');
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [tagline, setTagline] = useState(settings.tagline);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [defaultWastageYway, setDefaultWastageYway] = useState(settings.defaultWastageYway);
  const [autoLockMinutes, setAutoLockMinutes] = useState(settings.autoLockMinutes ?? 3);

  // Auto-sync form inputs whenever settings update from Cloud Database (e.g. on iPhone X / mobile terminals)
  useEffect(() => {
    setShopName(settings.shopName);
    setShopNameMm(settings.shopNameMm || '');
    setAddress(settings.address);
    setPhone(settings.phone);
    setTagline(settings.tagline);
    setInvoicePrefix(settings.invoicePrefix);
    setDefaultWastageYway(settings.defaultWastageYway);
    setAutoLockMinutes(settings.autoLockMinutes ?? 3);
    setScannerSuffix(settings.scannerSuffix || 'ENTER');
    setScannerBeep(settings.scannerBeep !== false);
    setScannerType(settings.scannerType || 'USB_GUN');
  }, [settings]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupJsonInput, setBackupJsonInput] = useState('');
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDeveloperGate, setShowDeveloperGate] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const { isFullscreen, toggleKiosk } = useKioskMode();
  const [copiedLogs, setCopiedLogs] = useState(false);

  const handleOpenDeveloperPortal = () => {
    if (isDeveloperSessionActive()) {
      setShowConnectModal(true);
    } else {
      setShowDeveloperGate(true);
    }
  };

  // Barcode Scanner Settings states
  const [scannerSuffix, setScannerSuffix] = useState<'ENTER' | 'TAB' | 'NONE'>(
    settings.scannerSuffix || 'ENTER'
  );
  const [scannerBeep, setScannerBeep] = useState<boolean>(
    settings.scannerBeep !== undefined ? settings.scannerBeep : true
  );
  const [scannerType, setScannerType] = useState<
    'USB_GUN' | 'WIRELESS_24G' | 'BLUETOOTH' | 'BARCODE_TO_PC'
  >(settings.scannerType || 'USB_GUN');
  const [scannerSavedSuccess, setScannerSavedSuccess] = useState(false);
  const [scannerTestInput, setScannerTestInput] = useState('');
  const [scannerTestResult, setScannerTestResult] = useState<{
    code: string;
    product: Product | null;
  } | null>(null);

  const handleSaveScannerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      scannerSuffix,
      scannerBeep,
      scannerType,
    });
    setScannerSavedSuccess(true);
    setTimeout(() => setScannerSavedSuccess(false), 3000);
  };

  const handleScannerTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerTestInput.trim()) return;
    const clean = scannerTestInput.trim();
    const found = matchProductByBarcode(clean, products);
    setScannerTestResult({ code: clean, product: found });
    if (found && scannerBeep) scannerSounds.playSuccessBeep();
    if (!found && scannerBeep) scannerSounds.playErrorBeep();
    setScannerTestInput('');
  };

  const handleCopyLogs = async () => {
    const ok = await copySystemLogsToClipboard();
    if (ok) {
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2500);
    }
  };

  const currentLogs = getSystemLogs();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      shopName,
      shopNameMm,
      address,
      phone,
      tagline,
      invoicePrefix,
      defaultWastageYway: Number(defaultWastageYway) || 2,
      autoLockMinutes: Number(autoLockMinutes),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDownloadBackup = () => {
    const dataStr = exportBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gold_shop_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = () => {
    if (!backupJsonInput.trim()) {
      setRestoreMessage({ type: 'error', text: 'Backup JSON စာသား ထည့်သွင်းပေးပါ' });
      return;
    }
    const ok = importBackup(backupJsonInput);
    if (ok) {
      setRestoreMessage({ type: 'success', text: 'ဒေတာများ အောင်မြင်စွာ ပြန်လည်ရယူပြီးပါပြီ (Restored Successfully)!' });
      setBackupJsonInput('');
      setTimeout(() => setRestoreMessage(null), 5000);
    } else {
      setRestoreMessage({ type: 'error', text: 'Backup ဖိုင် ပုံစံ မှားယွင်းနေပါသည် (Invalid JSON format)' });
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
            ဆိုင်ဆက်တင်နှင့် ဒေတာစီမံခန့်ခွဲမှု (Shop Settings)
          </h2>
          <p className="text-xs text-stone-500">
            ဆိုင်အမည်၊ လိပ်စာ၊ ပြေစာခေါင်းစဉ်၊ အလျော့တွက် စံသတ်မှတ်ချက်နှင့် ဒေတာ Backup
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold">ဆိုင်ဆက်တင်များကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Desktop နှင့် ဖုန်းများ (iPhone / Android) အားလုံးသို့ Cloud Database မှတစ်ဆင့် အလိုအလျောက် ပို့ဆောင်ချိတ်ဆက်ပြီးပါပြီ။</p>
          </div>
        </div>
      )}

      {/* Prominent Install App Banner at the top of Settings */}
      <div id="settings-pwa-install-banner">
        <PWAInstallButton variant="full" />
      </div>

      {/* Shop Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
        <h3 className="font-bold text-stone-900 text-base border-b pb-2">ဆိုင်ဆိုင်ရာ အချက်အလက်များ</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">ဆိုင်အမည် (Shop Name)</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">ဆိုင်အမည် (မြန်မာ အတိုကောက်)</label>
            <input
              type="text"
              value={shopNameMm}
              onChange={(e) => setShopNameMm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">ဆောင်ပုဒ် (Tagline / Slogan)</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">ဆိုင်လိပ်စာ (Address)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">ဖုန်းနံပါတ် (Phone Numbers)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Invoice Prefix (ပြေစာအမှတ် အစ)
            </label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              ပုံသေ အလျော့တွက် ရွေး (Default Wastage in Yway)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={defaultWastageYway}
              onChange={(e) => setDefaultWastageYway(Number(e.target.value) || 0)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-stone-700">
              စနစ် လုံခြုံရေး အလိုအလျောက် သော့ခတ်ချိန် (Auto-Lock Idle Timer)
            </label>
            <button
              type="button"
              onClick={lockSession}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-800 rounded-lg text-[11px] font-semibold transition-colors border border-stone-300 cursor-pointer"
              title="စနစ်လုံခြုံရေး သော့ခတ်မှုကို ယခုချက်ချင်း စမ်းသပ်မည်"
            >
              <Lock className="w-3 h-3 text-amber-600" />
              <span>ချက်ချင်း သော့ခတ်မည် (Test Lock)</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none"
            >
              <option value={0.5}>၃၀ စက္ကန့် (30 Seconds - စမ်းသပ်ရန် / Quick Test)</option>
              <option value={1}>၁ မိနစ် (1 Minute - မြန်ဆန်စွာသော့ခတ်မည်)</option>
              <option value={2}>၂ မိနစ် (2 Minutes)</option>
              <option value={3}>၃ မိနစ် (3 Minutes - အကြံပြုထားသော စံသတ်မှတ်ချိန်)</option>
              <option value={5}>၅ မိနစ် (5 Minutes)</option>
              <option value={10}>၁၀ မိနစ် (10 Minutes)</option>
              <option value={0}>ပိတ်ထားမည် (Never Auto-Lock)</option>
            </select>
            <p className="text-[11px] text-stone-500 leading-snug">
              ကောင်တာတွင်း အသုံးမပြုဘဲထားပါက လုံခြုံရေးအရ PIN Lock မျက်နှာပြင်သို့ အလိုအလျောက် သော့ခတ်ပေးပါမည်။
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ဆက်တင်များ သိမ်းဆည်းမည်</span>
          </button>
        </div>
      </form>

      {/* Counter / Terminal Assignment Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>ငွေရှင်းကောင်တာ သတ်မှတ်ချက် (Checkout Counters / Terminals)</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
                  {currentCounter.id}
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                ဤကွန်ပျူတာ/တက်ဘလက်တွင် တာဝန်ကျသော ကောင်တာနံပါတ်ကို ရွေးချယ်ပါ (စက် ၃ လုံး တပြိုင်နက် သုံးနိုင်သည်)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-600">လက်ရှိစက်:</span>
            <span className="px-3 py-1 bg-amber-500 text-stone-950 font-extrabold rounded-lg text-xs font-mono">
              {currentCounter.name} ({currentCounter.id})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {counters.map((c) => {
            const isSelected = currentCounter.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCurrentCounter(c)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/30 shadow-xs'
                    : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {c.id}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ လက်ရှိစက်
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-stone-900">{c.name}</div>
                <div className="text-[11px] text-stone-500 font-mono">{c.nameEn}</div>
                <div className="text-[10.5px] text-stone-600 mt-2 pt-2 border-t border-stone-200/60">
                  {c.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Laptop className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong>အကြံပြုချက်:</strong> ကောင်တာ ၁ စက်တွင် <strong>{counters[0]?.name}</strong>၊ ကောင်တာ ၂ စက်တွင် <strong>{counters[1]?.name}</strong>၊ ကောင်တာ ၃ စက်တွင် <strong>{counters[2]?.name}</strong> ဟု သတ်မှတ်ပေးထားပါ။ ထိုသို့သတ်မှတ်ခြင်းဖြင့် အင်တာနက်လိုင်း မရှိသည့်အခါ၌ပင် ပြေစာအမှတ်များ မထပ်ဘဲ ကောင်တာအလိုက် ဆိုင်းသိမ်းစလစ် သီးခြား ထုတ်ယူနိုင်ပါမည်။
          </span>
        </div>
      </div>

      {/* HARDWARE BARCODE SCANNER SETTINGS & DIAGNOSTICS CARD */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 border border-amber-500/30">
              <Scan className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  Barcode Scanner ဆက်တင်နှင့် စစ်ဆေးခြင်း (Hardware Barcode Scanner)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Scanner Active
                </span>
              </div>
              <p className="text-xs text-stone-500">
                ရွှေထည်ဆိုင်သုံး USB Barcode Gun၊ Wireless 2.4GHz Dongle နှင့် Bluetooth Scanner များအတွက် ဆက်တင်များ
              </p>
            </div>
          </div>

          {scannerSavedSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 animate-in fade-in">
              ✓ စကင်နာ ဆက်တင် သိမ်းဆည်းပြီးပါပြီ
            </span>
          )}
        </div>

        {/* Live Scanner Testing Bar */}
        <div className="p-4 bg-stone-950 rounded-xl text-stone-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
              <Scan className="w-4 h-4" />
              <span>စကင်နာ ချိတ်ဆက်မှု စမ်းသပ်စစ်ဆေးရန် (Live Test Box):</span>
            </span>
            <span className="text-[11px] text-stone-400 font-mono">
              Cursor ချပြီး Barcode Gun ဖြင့် Scan ဖတ်ပါ
            </span>
          </div>

          <form onSubmit={handleScannerTestSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <QrCode className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
              <input
                type="text"
                value={scannerTestInput}
                onChange={(e) => setScannerTestInput(e.target.value)}
                placeholder="Barcode Gun ဖြင့် ဤနေရာသို့ ချိန်၍ ဖတ်ကြည့်ပါ (ဥပမာ: RNG-15-01)..."
                className="w-full bg-stone-900 border border-amber-500/50 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm font-mono text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              စမ်းသပ်မည်
            </button>
          </form>

          {scannerTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                scannerTestResult.product
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {scannerTestResult.product ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>
                  {scannerTestResult.product
                    ? `✓ ပစ္စည်းတွေ့ရှိပါသည်: ${scannerTestResult.product.name} [${scannerTestResult.product.sku}] (${scannerTestResult.product.status})`
                    : `❌ ကုတ် "${scannerTestResult.code}" ရရှိသော်လည်း စတော့ထဲတွင် ပစ္စည်းမတွေ့ပါ`}
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                Code: "{scannerTestResult.code}"
              </span>
            </div>
          )}
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveScannerSettings} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                စကင်နာ အမျိုးအစား (Device Type)
              </label>
              <select
                value={scannerType}
                onChange={(e) => setScannerType(e.target.value as any)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="USB_GUN">🔌 USB Barcode Gun (ကြိုးတပ်စကင်နာ)</option>
                <option value="WIRELESS_24G">📶 2.4GHz Wireless Dongle Gun (ကြိုးမဲ့စကင်နာ)</option>
                <option value="BLUETOOTH">🔵 Bluetooth Barcode Scanner</option>
                <option value="BARCODE_TO_PC">📱 Mobile App (Barcode to PC Wi-Fi)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                အဆုံးသတ်ကုတ် (Suffix / Terminator)
              </label>
              <select
                value={scannerSuffix}
                onChange={(e) => setScannerSuffix(e.target.value as any)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ENTER">Enter Key (CR/LF) - အကြံပြုထားသည်</option>
                <option value="TAB">Tab Key</option>
                <option value="NONE">None (စနစ်မှ Auto အသိအမှတ်ပြုမည်)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                စကင်ဖတ် အသံမြည်ခြင်း (Audio Beep)
              </label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scannerBeep}
                  onChange={(e) => setScannerBeep(e.target.checked)}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>စကင်ဖတ်ပြီးပါက အသံမြည်စေမည်</span>
                </span>
              </label>
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-xs text-stone-600">
            <span className="font-bold text-stone-800 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-amber-600" />
              <span>စက်ရုံထုတ် Barcode Scanner Gun လမ်းညွှန်:</span>
            </span>
            <p className="leading-relaxed text-[11.5px]">
              ထုတ်လုပ်မှုသုံး Barcode Scanner Gun များသည် USB / Wireless receiver ကို ကွန်ပျူတာတွင် တပ်ဆင်လိုက်ရုံဖြင့် Driver မလိုဘဲ Plug &amp; Play တိုက်ရိုက် အသုံးပြုနိုင်ပါသည်။ Scanner Manual စာအုပ်ငယ်ထဲရှိ <strong>"Add Enter Suffix / Carriage Return (CR)"</strong> barcode ကို တစ်ချက် ဖတ်ပေးထားပါက Barcode ဖတ်ပြီးသည်နှင့် POS အရောင်းဘောက်ချာထဲသို့ အလိုအလျောက် တန်းရောက်သွားမည်ဖြစ်ပါသည်။
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Barcode Scanner ဆက်တင် သိမ်းဆည်းမည်</span>
            </button>
          </div>
        </form>
      </div>

      {/* PWA & Offline Support Card */}
      <div className="bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-950 border border-amber-500/30 rounded-2xl p-6 shadow-sm text-stone-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Progressive Web App (PWA) & Offline စနစ်</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
                  တပ်ဆင်ပြီးပါပြီ
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Internet မရှိသောအခါ၌လည်း အရောင်း၊ အဝယ်၊ ပစ္စည်းလက်ကျန်များကို ချောမွေ့စွာ အသုံးပြုနိုင်ခြင်း
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <PWAInstallButton />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-stone-300">
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <Wifi className="w-4 h-4" />
              <span>Offline-First ဒေတာသိမ်းဆည်းမှု</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              အင်တာနက်ပြတ်တောက်သွားသည့်အချိန်တွင် သင်လုပ်ဆောင်သော အရောင်းဘောက်ချာများ၊ ရွှေဝယ်ယူမှုများနှင့် စာရင်းများကို ကွန်ပျူတာ/ဖုန်း Local Cache တွင် အလိုအလျောက် သိမ်းဆည်းပေးထားပါသည်။
            </p>
          </div>
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>အလိုအလျောက် Cloud Auto-Sync</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              အင်တာနက်လိုင်း ပြန်လည်ရရှိသည်နှင့်တပြိုင်နက် သိမ်းဆည်းထားသော အချက်အလက်များအားလုံးကို Supabase Cloud Database သို့ နောက်ကွယ်မှ အလိုအလျောက် Sync ပြုလုပ်ပေးပါသည်။
            </p>
          </div>
        </div>
      </div>

      {/* Full-screen Kiosk Mode Setting Card */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-sm text-stone-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Full-screen Kiosk Mode (ကောင်တာသုံး မျက်နှာပြင်အပြည့် စနစ်)
                </h3>
                {isFullscreen ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Kiosk Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-400 border border-stone-700 font-semibold">
                    Normal View
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                Browser ဘားများနှင့် Taskbar များကို ဖျောက်၍ ကောင်တာ POS ကို မျက်နှာပြင်အပြည့် သီးသန့်ဆော့ဖ်ဝဲလ်ကဲ့သို့ သုံးစွဲခြင်း
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleKiosk}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isFullscreen
                  ? 'bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Kiosk မှ ပြန်ထွက်မည်</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>မျက်နှာပြင်အပြည့် ပြောင်းမည်</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowKioskModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-750 text-amber-300 rounded-xl text-xs font-semibold border border-stone-700 cursor-pointer transition"
            >
              <span>လမ်းညွှန် / Shortcut ကူးမည်</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-stone-300">
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3 space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <span>၁။ Shortcut: F11</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Keyboard မှ <strong>F11</strong> နှိပ်၍ Fullscreen သို့ ချက်ချင်းပြောင်းနိုင်ပြီး ပြန်ထွက်လိုပါက <strong>Esc</strong> သို့မဟုတ် <strong>F11</strong> ကို ပြန်နှိပ်နိုင်ပါသည်။
            </p>
          </div>
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3 space-y-1">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <span>၂။ အခြားဆိုက် ဖွင့်မရအောင် ကာကွယ်ခြင်း</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              အရောင်းဝန်ထမ်းများ ကောင်တာစက်တွင် Facebook, YouTube စသည်တို့ ဖွင့်သုံးခြင်းနှင့် ဘောက်ချာ Tab မတော်တဆ ပိတ်မိခြင်းများကို ကာကွယ်ပေးပါသည်။
            </p>
          </div>
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3 space-y-1">
            <div className="font-semibold text-sky-300 flex items-center gap-1.5">
              <span>၃။ Silent Printing ပံ့ပိုးမှု</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Windows Kiosk shortcut တွင် <code className="text-amber-300 bg-stone-900 px-1 rounded">--kiosk-printing</code> ထည့်ထားပါက ဘောက်ချာ ထုတ်တိုင်း Print preview မစောင့်ရဘဲ တိုက်ရိုက် စက္ကူထွက်စေပါသည်။
            </p>
          </div>
        </div>
      </div>

      {/* Mobile App Sync QR Code Card for Admin */}
      <AdminMobileSyncCard onOpenDeveloperPortal={handleOpenDeveloperPortal} />

      {/* DATA BACKUP & RESTORE SECTION */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
        <h3 className="font-bold text-stone-900 text-base border-b pb-2">
          ဒေတာ အရန်သိမ်းခြင်းနှင့် ပြန်လည်ရယူခြင်း (Backup & Restore)
        </h3>
        <p className="text-xs text-stone-600">
          အရောင်းစာရင်းများ၊ ပစ္စည်းလက်ကျန်၊ နေ့စဉ်ရွှေဈေးနှင့် ဖောက်သည်စာရင်း အားလုံးကို JSON ဖိုင်အဖြစ်
          သိမ်းဆည်းထားနိုင်ပြီး လိုအပ်ပါက အချိန်မရွေး ပြန်လည် Upload တင်နိုင်ပါသည်။
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download Backup File (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 font-semibold rounded-xl text-xs border border-stone-300 cursor-pointer ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>မူလနမူနာအတိုင်း Reset လုပ်မည်</span>
          </button>
        </div>

        {/* Restore Textarea */}
        <div className="pt-4 border-t space-y-2">
          <label className="block text-xs font-semibold text-stone-700">
            Restore Backup JSON စာသားထည့်သွင်းရန်:
          </label>
          <textarea
            rows={3}
            value={backupJsonInput}
            onChange={(e) => setBackupJsonInput(e.target.value)}
            placeholder="Download ထားသော backup JSON စာသားကို ဤနေရာတွင် Paste လုပ်ပြီး Restore နှိပ်ပါ..."
            className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {restoreMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                restoreMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
            >
              <span>{restoreMessage.text}</span>
              <button
                type="button"
                onClick={() => setRestoreMessage(null)}
                className="text-stone-400 hover:text-stone-700 ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleRestore}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>ဒေတာ ပြန်လည်ရယူမည် (Restore Data)</span>
          </button>
        </div>
      </div>

      {/* STOCK DEDUPLICATION & INTEGRITY CARD */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-base">
                  စတော့စာရင်း သန့်စင်ခြင်းနှင့် ဒေတာတိကျမှု (Stock Deduplication & Data Clean)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Data Integrity
                </span>
              </div>
              <p className="text-xs text-stone-500">
                စတော့စာရင်းတွင် ပစ္စည်းများ ထပ်နေခြင်း၊ မတူညီသော SKU/ID များကြောင့် အရေအတွက် ကွဲလွဲနေခြင်းများကို ရှင်းလင်းစစ်ဆေးပေးပါသည်
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-purple-950/20 rounded-xl border border-purple-500/30 text-xs text-stone-300 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-white">
              လက်ရှိ စတော့ပစ္စည်း စုစုပေါင်း: <strong className="text-amber-400 text-sm">{products.length}</strong> ထည်
              (ဆိုင်တွင်းလက်ကျန်: <strong className="text-emerald-400 text-sm">{products.filter((p) => p.status === 'In Stock').length}</strong> ထည်)
            </span>
          </div>
          <p className="text-[11.5px] text-stone-300 leading-relaxed">
            စတော့ကတ်ရှိ အရေအတွက်နှင့် ဇယားရှိ အရေအတွက် ကွဲလွဲနေပါက အောက်ပါခလုတ်ကို နှိပ်၍ ထပ်နေသော ပစ္စည်းများကို အလိုအလျောက် ပေါင်းစပ်ဖယ်ရှားနိုင်ပါသည်။
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={async () => {
                const res = await deduplicateStock();
                alert(`စတော့သန့်စင်ပြီးစီးပါပြီ: ထပ်နေသောပစ္စည်း ${res.removedCount} ခု ဖယ်ရှားပြီး လက်ကျန် ${res.remainingCount} ခု တိကျစွာ သတ်မှတ်ပြီးပါပြီ`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>စတော့ ထပ်နေမှုများ ရှင်းလင်းမည် (Clean Stock)</span>
            </button>

            {isSupabaseConnected && (
              <button
                type="button"
                onClick={async () => {
                  const res = await syncProductsToSupabase();
                  if (res.success) {
                    alert(`စတော့ပစ္စည်း ${res.count} ထည်ကို Supabase Cloud Database သို့ အောင်မြင်စွာ Upload တင်ပြီးပါပြီ`);
                  } else {
                    alert(`Upload အမှား: ${res.error || 'Failed'}`);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer transition-colors"
              >
                <Cloud className="w-4 h-4" />
                <span>Cloud သို့ စတော့အပြည့် Upload တင်မည်</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DATA CLEANUP & ARCHIVAL CARD */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-base">
                  ဒေတာဟောင်းများ သိမ်းဆည်းခြင်းနှင့် ရှင်းလင်းခြင်း (Data Cleanup &amp; Archival)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Storage Management
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Supabase 500MB Free Tier ပြည့်ခါနီးပါက သို့မဟုတ် စနစ် ပိုမိုသွက်လက်ပေါ့ပါးစေရန် စာရင်းအဟောင်းများကို အရန်သိမ်းဒေါင်းလုဒ်ဆွဲပြီးမှ ရှင်းထုတ်ခြင်း
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCleanupModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>ရှင်းလင်းမည့် စာရင်းများ ရွေးချယ်မည် (Cleanup Tool)</span>
          </button>
        </div>

        {/* Current Database Records Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[11px] text-stone-500 block">အရောင်းဘောင်ချာများ</span>
            <span className="font-mono font-extrabold text-stone-900 text-base">{sales.length}</span>
            <span className="text-[10px] text-stone-400 block">ဘောက်ချာ</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[11px] text-stone-500 block">ရွှေအဝယ်စာရင်း</span>
            <span className="font-mono font-extrabold text-stone-900 text-base">{purchases.length}</span>
            <span className="text-[10px] text-stone-400 block">အဝယ်ဘောင်ချာ</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[11px] text-stone-500 block">ကုန်ကျစရိတ်</span>
            <span className="font-mono font-extrabold text-stone-900 text-base">{expenses.length}</span>
            <span className="text-[10px] text-stone-400 block">မှတ်တမ်း</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[11px] text-stone-500 block">ရောင်းပြီးပစ္စည်းများ</span>
            <span className="font-mono font-extrabold text-amber-700 text-base">
              {products.filter((p) => p.status === 'Sold').length}
            </span>
            <span className="text-[10px] text-stone-400 block">Sold Items</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[11px] text-stone-500 block">ပန်းထိမ်အပ်ထည်</span>
            <span className="font-mono font-extrabold text-stone-900 text-base">{workshopOrders.length}</span>
            <span className="text-[10px] text-stone-400 block">အော်ဒါ</span>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>လုံခြုံစိတ်ချရသော Archival စနစ်:</strong> စာရင်းဟောင်းများကို မရှင်းလင်းမီ <strong>JSON / CSV Backup ဖိုင်</strong> ကို သင့်ကွန်ပျူတာထဲသို့ ဦးစွာ အလိုအလျောက် Download ရယူပေးမည်ဖြစ်၍ မည်သည့်အခါမျှ အချက်အလက်များ မဆုံးရှုံးနိုင်ပါ။ Cloud Database (Supabase) တွင်ပါ သက်ဆိုင်ရာ records များကို အလိုအလျောက် ဖျက်ပေးမည်ဖြစ်သဖြင့် <strong>500MB Free Storage ကို အမြဲတမ်း ပေါ့ပါးလွတ်လပ်စွာ ထိန်းသိမ်းထားနိုင်ပါသည်</strong>။
          </div>
        </div>
      </div>

      {/* SYSTEM DIAGNOSTIC & AUDIT LOGS CARD */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-stone-900 text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <span>စနစ်မှတ်တမ်းနှင့် Error / Audit Logs</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold border border-stone-200">
                  {currentLogs.length} မှတ်တမ်း
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                စနစ်အတွင်း ဖြစ်ပေါ်သော Error များနှင့် အရေးကြီးလုပ်ဆောင်ချက်များ (ဘောက်ချာထုတ်ခြင်း၊ ပယ်ဖျက်ခြင်း၊ ဆိုင်ဖွင့်/ပိတ်) ကို နောက်ကွယ်တွင် မှတ်တမ်းတင်ထားပါသည်။
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLogsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-300"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>မှတ်တမ်းများ ကြည့်မည်</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          စနစ်တွင် အမှားတစ်ခုခု သို့မဟုတ် ချို့ယွင်းချက်တစ်ခုခု ဖြစ်ပေါ်ပါက အောက်ပါခလုတ်ဖြင့် Diagnostic Log ဖိုင်ကို တစ်ချက်နှိပ် ဒေါင်းလုဒ်ဆွဲ၍ နည်းပညာအကူအညီထံသို့ တိုက်ရိုက် ပေးပို့နိုင်ပါသည်။
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => downloadSystemLogs('txt')}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Log ဖိုင် ဒေါင်းလုဒ် (.txt)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 cursor-pointer transition-colors"
          >
            {copiedLogs ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-stone-400" />}
            <span>{copiedLogs ? 'ကူးယူပြီးပါပြီ (Copied!)' : 'Log စာသား ကူးယူမည် (Copy)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLogsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs border border-stone-300 cursor-pointer ml-auto"
          >
            <Terminal className="w-4 h-4 text-stone-600" />
            <span>အသေးစိတ် စစ်ဆေးမည် (Viewer)</span>
          </button>
        </div>
      </div>

      {showLogsModal && (
        <AuditLogsModal
          isOpen={showLogsModal}
          onClose={() => setShowLogsModal(false)}
        />
      )}

      {showCleanupModal && (
        <DataCleanupArchivalModal
          isOpen={showCleanupModal}
          onClose={() => setShowCleanupModal(false)}
        />
      )}

      {showConnectModal && (
        <ConnectSupabaseModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />
      )}

      {showDeveloperGate && (
        <DeveloperGateModal
          isOpen={showDeveloperGate}
          onClose={() => setShowDeveloperGate(false)}
          onSuccess={() => setShowConnectModal(true)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-rose-400">မူလနမူနာဒေတာအတိုင်း Reset ပြုလုပ်မည်လား?</h4>
            <p className="text-xs text-stone-300 leading-relaxed">
              ⚠️ လက်ရှိ ထည့်သွင်းထားသော ဒေတာအားလုံး ပျက်ပြယ်သွားပြီး မူလနမူနာအတိုင်း ပြန်လည်ရောက်ရှိပါမည်။
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 bg-stone-800 text-stone-300 hover:bg-stone-750 rounded-xl text-xs font-semibold cursor-pointer"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToInitialData();
                  setShowResetConfirm(false);
                  window.location.reload();
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset ပြုလုပ်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {showKioskModal && (
        <KioskModeModal
          isOpen={showKioskModal}
          onClose={() => setShowKioskModal(false)}
        />
      )}
    </div>
  );
};
