import React, { useState, useMemo } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import {
  Archive,
  Trash2,
  Download,
  AlertTriangle,
  Database,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  ShieldAlert,
  HardDrive,
  RefreshCw,
  X,
  Lock,
} from 'lucide-react';
import { DataCleanupFilter, DataCleanupStats, CleanupResult } from '../types/gold';

interface DataCleanupArchivalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PresetPeriod = '1year' | '6months' | '3months' | '30days' | 'all' | 'custom';

export const DataCleanupArchivalModal: React.FC<DataCleanupArchivalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    calculateCleanupStats,
    downloadArchiveJson,
    downloadSalesArchiveCsv,
    generateSupabaseCleanupSql,
    executeDataCleanup,
    currentUser,
    isSupabaseConnected,
  } = useGoldShop();

  // Calculate default cutoff date (1 year ago)
  const getPresetCutoffDate = (preset: PresetPeriod): string => {
    const now = new Date();
    if (preset === '1year') {
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString().split('T')[0];
    }
    if (preset === '6months') {
      now.setMonth(now.getMonth() - 6);
      return now.toISOString().split('T')[0];
    }
    if (preset === '3months') {
      now.setMonth(now.getMonth() - 3);
      return now.toISOString().split('T')[0];
    }
    if (preset === '30days') {
      now.setDate(now.getDate() - 30);
      return now.toISOString().split('T')[0];
    }
    if (preset === 'all') {
      return new Date().toISOString().split('T')[0]; // Everything up to today
    }
    return now.toISOString().split('T')[0];
  };

  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>('1year');
  const [customDate, setCustomDate] = useState<string>(getPresetCutoffDate('1year'));
  const [includeSales, setIncludeSales] = useState(true);
  const [includePurchases, setIncludePurchases] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeWorkshopOrders, setIncludeWorkshopOrders] = useState(true);
  const [includeSoldProducts, setIncludeSoldProducts] = useState(false);
  const [includeSystemLogs, setIncludeSystemLogs] = useState(true);

  // Modal and Confirmation state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);

  const activeCutoffDate = useMemo(() => {
    return selectedPreset === 'custom' ? customDate : getPresetCutoffDate(selectedPreset);
  }, [selectedPreset, customDate]);

  const filter: DataCleanupFilter = useMemo(
    () => ({
      cutoffDate: activeCutoffDate,
      includeSales,
      includePurchases,
      includeExpenses,
      includeWorkshopOrders,
      includeSoldProducts,
      includeSystemLogs,
    }),
    [
      activeCutoffDate,
      includeSales,
      includePurchases,
      includeExpenses,
      includeWorkshopOrders,
      includeSoldProducts,
      includeSystemLogs,
    ]
  );

  const stats: DataCleanupStats = useMemo(() => {
    return calculateCleanupStats(filter);
  }, [calculateCleanupStats, filter]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: PresetPeriod) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setCustomDate(getPresetCutoffDate(preset));
    }
  };

  const handleCopySql = async () => {
    const sql = generateSupabaseCleanupSql(filter);
    try {
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {}
  };

  const handleDownloadJson = () => {
    downloadArchiveJson(filter);
  };

  const handleDownloadCsv = () => {
    downloadSalesArchiveCsv(filter);
  };

  const handleStartCleanup = () => {
    if (stats.totalItems === 0) return;
    setConfirmPin('');
    setConfirmError('');
    setShowConfirmModal(true);
  };

  const handleConfirmExecute = async () => {
    // Check manager/admin authorization
    const validPins = ['1111', '2222', '3333'];
    if (confirmPin.trim() !== 'CLEANUP' && !validPins.includes(confirmPin.trim())) {
      setConfirmError('အတည်ပြု PIN နံပါတ် မှားယွင်းနေပါသည် (Admin/Manager PIN သို့မဟုတ် CLEANUP ဟု ရိုက်ပါ)');
      return;
    }

    setIsProcessing(true);
    setConfirmError('');
    try {
      // Execute cleanup with auto-archive enabled
      const res = await executeDataCleanup(filter, true);
      setCleanupResult(res);
      setShowConfirmModal(false);
    } catch (err: any) {
      setConfirmError(err?.message || 'ရှင်းလင်းရာတွင် အမှားတစ်ခုခု ဖြစ်ပေါ်ခဲ့သည်');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  ဒေတာဟောင်းများ သိမ်းဆည်းခြင်းနှင့် ရှင်းလင်းခြင်း
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Data Cleanup & Archival
                </span>
              </div>
              <p className="text-xs text-stone-400">
                စာရင်းအဟောင်းများကို အရန်သိမ်း (Download) ပြီးမှ Supabase နှင့် Local Storage ပေါ်မှ စိတ်ချစွာ ရှင်းထုတ်ခြင်း
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-stone-300">
          {/* Post-cleanup Success Banner */}
          {cleanupResult && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 space-y-2 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>ဒေတာဟောင်းများကို အောင်မြင်စွာ အရန်သိမ်းပြီး ရှင်းလင်းပြီးပါပြီ!</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                စုစုပေါင်း မှတ်တမ်း <strong>{cleanupResult.totalPurged} ခု</strong> ကို ရှင်းလင်းခဲ့ပြီး အရန်သိမ်း JSON ဖိုင်ကိုလည်း သင့်ကွန်ပျူတာထဲသို့ အလိုအလျောက် Download ရယူပြီးဖြစ်ပါသည်။
                {cleanupResult.supabaseCleanedCount > 0 && (
                  <span className="text-emerald-300 block mt-1">
                    ☁️ Supabase Cloud Database မှလည်း မှတ်တမ်း {cleanupResult.supabaseCleanedCount} ခု ကို ဖျက်ပစ်ပြီး 500MB သုံးစွဲမှုကို လျှော့ချပေးခဲ့ပါသည်။
                  </span>
                )}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCleanupResult(null)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-lg text-xs cursor-pointer"
                >
                  နားလည်ပါပြီ
                </button>
              </div>
            </div>
          )}

          {/* Safety Notice Banner */}
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-300">ဘေးကင်းလုံခြုံမှုအတွက် အလိုအလျောက် Backup ယူခြင်း</div>
              <p className="text-[11.5px] text-stone-400 leading-relaxed">
                စနစ်မှ ဒေတာများကို ဖျက်ပစ်ခြင်း မပြုမီ ရွေးချယ်ထားသော စာရင်းအဟောင်းများအားလုံးကို <strong>JSON Backup File</strong> အဖြစ် သင့်စက်ထဲသို့ အလိုအလျောက် ဦးစွာ Download ရယူပေးပါမည်။ နောင်တစ်ချိန် အဆိုပါ စာရင်းများကို Settings &gt; Restore မှ ပြန်လည် Upload တင်၍ အချိန်မရွေး ကြည့်ရှုနိုင်ပါသည်။
              </p>
            </div>
          </div>

          {/* Preset Period Buttons */}
          <div className="space-y-2">
            <label className="font-bold text-white flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>ရှင်းလင်းမည့် ကာလအပိုင်းအခြား သတ်မှတ်ပါ (Retention Cutoff)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { id: '1year', label: '၁ နှစ်ကျော်', desc: 'Older than 1 yr' },
                { id: '6months', label: '၆ လကျော်', desc: 'Older than 6 mos' },
                { id: '3months', label: '၃ လကျော်', desc: 'Older than 3 mos' },
                { id: '30days', label: '၃၀ ရက်ကျော်', desc: 'Older than 30 d' },
                { id: 'all', label: 'အားလုံး', desc: 'All Records' },
                { id: 'custom', label: 'စိတ်ကြိုက်ရက်စွဲ', desc: 'Custom Date' },
              ].map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p.id as PresetPeriod)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500/40'
                        : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <span className="font-bold text-xs">{p.label}</span>
                    <span className="text-[10px] text-stone-500">{p.desc}</span>
                  </button>
                );
              })}
            </div>

            {selectedPreset === 'custom' && (
              <div className="pt-2 flex items-center gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400">ဤရက်စွဲမတိုင်မီ စာရင်းဟောင်းများကို ရှင်းမည်:</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Selectable Categories */}
          <div className="space-y-2.5">
            <label className="font-bold text-white flex items-center gap-2 text-xs">
              <Database className="w-4 h-4 text-amber-400" />
              <span>ရှင်းလင်းမည့် အချက်အလက် အမျိုးအစားများ ရွေးချယ်ပါ</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeSales
                    ? 'bg-amber-500/10 border-amber-500/40 text-stone-200'
                    : 'bg-stone-950/60 border-stone-800 text-stone-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeSales}
                  onChange={(e) => setIncludeSales(e.target.checked)}
                  className="mt-0.5 accent-amber-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>အရောင်းဘောင်ချာများ (Sales Records)</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-300">
                      {stats.salesCount} ခု
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    သတ်မှတ်ရက်စွဲ မတိုင်မီ အရောင်းဘောင်ချာများနှင့် ငွေရှင်းမှတ်တမ်းများ
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includePurchases
                    ? 'bg-amber-500/10 border-amber-500/40 text-stone-200'
                    : 'bg-stone-950/60 border-stone-800 text-stone-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includePurchases}
                  onChange={(e) => setIncludePurchases(e.target.checked)}
                  className="mt-0.5 accent-amber-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>ရွှေအဝယ်ဘောင်ချာများ (Buy-Back Purchases)</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-300">
                      {stats.purchasesCount} ခု
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    ဧည့်သည်များထံမှ ရွှေဟောင်းအဝယ်နှင့် အလဲအထပ် မှတ်တမ်းများ
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeExpenses
                    ? 'bg-amber-500/10 border-amber-500/40 text-stone-200'
                    : 'bg-stone-950/60 border-stone-800 text-stone-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeExpenses}
                  onChange={(e) => setIncludeExpenses(e.target.checked)}
                  className="mt-0.5 accent-amber-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>ဆိုင်သုံးစရိတ်မှတ်တမ်းများ (Shop Expenses)</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-300">
                      {stats.expensesCount} ခု
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    မီးဖိုး၊ အိမ်လခ၊ လစာနှင့် အထွေထွေ အသုံးစရိတ်ဟောင်းများ
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeWorkshopOrders
                    ? 'bg-amber-500/10 border-amber-500/40 text-stone-200'
                    : 'bg-stone-950/60 border-stone-800 text-stone-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeWorkshopOrders}
                  onChange={(e) => setIncludeWorkshopOrders(e.target.checked)}
                  className="mt-0.5 accent-amber-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>ပြီးစီး/ပယ်ဖျက်ပြီး ပန်းထိမ်အပ်ထည်များ</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-300">
                      {stats.workshopOrdersCount} ခု
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    စတော့သွင်းပြီး သို့မဟုတ် ပယ်ဖျက်ပြီးစီးသော ပန်းထိမ်အော်ဒါဟောင်းများ
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeSoldProducts
                    ? 'bg-amber-500/10 border-amber-500/40 text-stone-200'
                    : 'bg-stone-950/60 border-stone-800 text-stone-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeSoldProducts}
                  onChange={(e) => setIncludeSoldProducts(e.target.checked)}
                  className="mt-0.5 accent-amber-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>ရောင်းပြီးသား ပစ္စည်းစာရင်းများ (Sold Inventory)</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-300">
                      {stats.soldProductsCount} ခု
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    စတော့တွင် 'Sold' အဆင့်ဖြစ်နေသော ရောင်းထွက်ပြီးသား ရွှေထည်စာရင်းဟောင်းများ
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeSystemLogs
                    ? 'bg-amber-500/10 border-amber-500/40 text-stone-200'
                    : 'bg-stone-950/60 border-stone-800 text-stone-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeSystemLogs}
                  onChange={(e) => setIncludeSystemLogs(e.target.checked)}
                  className="mt-0.5 accent-amber-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>စနစ်မှတ်တမ်းနှင့် Error Logs (System Logs)</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-300">
                      {stats.systemLogsCount} ခု
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    ကောင်တာအတွင်း ဖြစ်ပေါ်ခဲ့သော Audit & Error Diagnostic မှတ်တမ်းများ
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Impact Overview Card */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-stone-500" />
                <span>ရှင်းလင်းမည့် စုစုပေါင်း မှတ်တမ်းအရေအတွက်:</span>
              </span>
              <span className="font-mono text-sm font-extrabold text-amber-400">
                {stats.totalItems.toLocaleString()} ခု
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-stone-800/80 pt-2">
              <span className="text-stone-400">ခန့်မှန်းလွတ်သွားမည့် Storage ပမာဏ:</span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                ~ {formatBytes(stats.estimatedBytes)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-stone-800/80 pt-2">
              <span className="text-stone-400">သတ်မှတ် Cutoff ရက်စွဲ:</span>
              <span className="font-mono text-xs font-semibold text-stone-300">
                {activeCutoffDate} မတိုင်မီ
              </span>
            </div>
          </div>

          {/* Quick Download & Supabase SQL Options */}
          <div className="pt-2 border-t border-stone-800 space-y-2">
            <div className="text-xs font-bold text-stone-300">အပိုဆောင်း ရွေးချယ်စရာများ (Export & SQL Tools)</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={stats.totalItems === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                title="ရွေးချယ်ထားသော စာရင်းဟောင်းများကို JSON ဖြင့် ဒေါင်းလုဒ်သီးသန့်ယူမည်"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Archive (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={stats.salesCount === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                title="အရောင်းစာရင်းဟောင်းများကို Excel တွင် ဖွင့်ဖတ်နိုင်ရန် CSV ဒေါင်းလုဒ်ဆွဲမည်"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sales CSV ({stats.salesCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSqlViewer(!showSqlViewer)}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Supabase SQL Script</span>
              </button>
            </div>
          </div>

          {/* Optional SQL Viewer */}
          {showSqlViewer && (
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-stone-400">
                  Supabase Dashboard &gt; SQL Editor တွင် run နိုင်သော Script:
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[11px] font-semibold cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-2.5 bg-black/60 rounded-lg text-[10.5px] font-mono text-stone-300 overflow-x-auto leading-relaxed border border-stone-800/80">
                {generateSupabaseCleanupSql(filter)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-950/80 shrink-0">
          <div className="text-[11px] text-stone-400">
            {stats.totalItems > 0 ? (
              <span>
                မှတ်တမ်း <strong>{stats.totalItems}</strong> ခု ကို ရှင်းလင်းရန် ရွေးချယ်ထားပါသည်
              </span>
            ) : (
              <span className="text-stone-500">ရှင်းလင်းရန် သတ်မှတ်ချက်နှင့် ကိုက်ညီသော မှတ်တမ်း မရှိပါ</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              ပိတ်မည်
            </button>

            <button
              type="button"
              onClick={handleStartCleanup}
              disabled={stats.totalItems === 0 || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>အရန်သိမ်းပြီး ရှင်းလင်းမည် (Archive &amp; Cleanup)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation & Security PIN Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-rose-400">
                  ဒေတာရှင်းလင်းရန် သေချာပါသလား?
                </h4>
                <p className="text-xs text-stone-400">လုံခြုံရေးအရ စိစစ်အတည်ပြုချက် လိုအပ်ပါသည်</p>
              </div>
            </div>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-stone-300 space-y-1.5 leading-relaxed">
              <p>
                • <strong>{activeCutoffDate}</strong> မတိုင်မီ စာရင်းဟောင်း စုစုပေါင်း{' '}
                <strong className="text-rose-400">{stats.totalItems} ခု</strong> ကို Local နှင့် Supabase Cloud Database မှ အပြီးပိုင် ဖျက်ပစ်ပါမည်။
              </p>
              <p className="text-amber-300">
                • ရှင်းလင်းခြင်း မပြုမီ <strong>JSON Backup File</strong> ကို ဦးစွာ အလိုအလျောက် ဒေါင်းလုဒ် ဆွဲပေးပါမည်။
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-300">
                အတည်ပြုရန် Admin / Manager PIN (သို့မဟုတ် "CLEANUP") ရိုက်ထည့်ပါ:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="PIN ရိုက်ပါ (ဥပမာ: 1111 သို့မဟုတ် 2222)"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  autoFocus
                />
                <Lock className="w-4 h-4 text-stone-500 absolute right-3 top-3" />
              </div>
              {confirmError && (
                <div className="text-[11px] text-rose-400 font-medium">{confirmError}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="button"
                onClick={handleConfirmExecute}
                disabled={isProcessing || !confirmPin.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ရှင်းလင်းနေပါသည်...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>အတည်ပြု ရှင်းလင်းမည်</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
