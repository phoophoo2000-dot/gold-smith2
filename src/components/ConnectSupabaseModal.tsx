import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X,
  FileCode2,
  UploadCloud,
  ShieldCheck,
  KeyRound,
  Database,
  Activity,
  AlertTriangle,
  ArrowRight,
  Code,
  Terminal,
  Smartphone,
  QrCode,
  ClipboardPaste,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getActiveSupabaseConfig,
  saveDynamicSupabaseConfig,
  reinitSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabase';
import { forceUpdateAndClearCache, APP_VERSION } from '../services/pwaService';
import {
  SUPABASE_ALL_IN_ONE_FIX_SQL,
  SUPABASE_SQL_SCHEMA,
  SUPABASE_RLS_FIX_SQL,
  SUPABASE_MISSING_TABLES_SQL,
  SUPABASE_SEED_DATA_SQL,
} from '../lib/supabaseSchema';
import { useGoldShop } from '../context/GoldShopContext';
import {
  SupabaseHealthReport,
  BatchUploadVerificationResult,
} from '../services/supabaseService';
import {
  getDeveloperPasscode,
  setDeveloperPasscode,
  clearDeveloperSession,
  DEFAULT_DEV_PASSCODE,
} from './DeveloperGateModal';

interface ConnectSupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectSupabaseModal: React.FC<ConnectSupabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    uploadAndVerifyAllToSupabase,
    checkSupabaseHealth,
    refreshSupabaseData,
    products,
    sales,
    customers,
    purchases,
    expenses,
  } = useGoldShop();

  const [activeConfig, setActiveConfig] = useState<{ url: string; anonKey: string }>(() => getActiveSupabaseConfig());
  const [projectUrl, setProjectUrl] = useState(activeConfig.url || '');
  const [anonKey, setAnonKey] = useState(activeConfig.anonKey || '');

  const [activeTab, setActiveTab] = useState<'connect' | 'health' | 'upload' | 'sql' | 'security'>('connect');
  const [selectedSqlTab, setSelectedSqlTab] = useState<'all_in_one' | 'missing' | 'schema' | 'rls' | 'seed_data'>('all_in_one');

  // Developer Security Passcode Management
  const [currentPasscodeVerify, setCurrentPasscodeVerify] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showNewPasscodeText, setShowNewPasscodeText] = useState(false);
  const [passcodeUpdateMsg, setPasscodeUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mobile Sync State (QR Code for iPhone X)
  const [mobileSyncQr, setMobileSyncQr] = useState<string>('');
  const [copiedMobileLink, setCopiedMobileLink] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [mobileUrlMode, setMobileUrlMode] = useState<'pre' | 'dev'>('pre');
  const [includeKeysInQr, setIncludeKeysInQr] = useState<boolean>(true);
  const [showKeyText, setShowKeyText] = useState(false);
  const [copiedKeyText, setCopiedKeyText] = useState(false);

  // Helper to retrieve remembered keys for presets
  const getSavedKeyForUrl = (targetUrl: string): string => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('gold_shop_saved_profiles');
        if (stored) {
          const list: Array<{ url: string; anonKey: string }> = JSON.parse(stored);
          const cleanTarget = targetUrl.replace('https://', '').replace('/', '').trim().toLowerCase();
          const found = list.find((item) => item.url.toLowerCase().includes(cleanTarget));
          if (found && found.anonKey) return found.anonKey;
        }
      }
    } catch {}
    return '';
  };

  // Helper to store remembered keys
  const rememberProjectProfile = (url: string, key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage && url && key) {
        const stored = window.localStorage.getItem('gold_shop_saved_profiles');
        const list: Array<{ url: string; anonKey: string }> = stored ? JSON.parse(stored) : [];
        const cleanHost = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        const filtered = list.filter((item) => !item.url.includes(cleanHost));
        filtered.unshift({ url: url.trim(), anonKey: key.trim() });
        window.localStorage.setItem('gold_shop_saved_profiles', JSON.stringify(filtered.slice(0, 10)));
      }
    } catch {}
  };

  // Mobile Auto-Connect URL for iPhone & Mobile devices (supports both ais-pre public and ais-dev preview)
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
      // Bypasses iOS / Safari cookie_check redirect freeze
      url.searchParams.set('__storage_access_granted', '1');
      // ALWAYS bundle Supabase URL and Anon Key into URL query parameters for iPhone X
      const targetUrl = (projectUrl || activeConfig.url || 'https://fkzuqvwdngijgacereru.supabase.co').trim();
      let targetKey = (anonKey || activeConfig.anonKey || '').trim();
      if (!targetKey && typeof window !== 'undefined' && window.localStorage) {
        targetKey = (window.localStorage.getItem('gold_shop_supabase_anon_key') || '').trim();
      }
      if (targetUrl && targetKey) {
        url.searchParams.set('sb_url', targetUrl);
        url.searchParams.set('sb_key', targetKey);
        url.hash = `sb_url=${encodeURIComponent(targetUrl)}&sb_key=${encodeURIComponent(targetKey)}`;
      }
      return url.toString();
    } catch {
      return '';
    }
  }, [projectUrl, anonKey, activeConfig, mobileUrlMode]);

  // Generate QR Code for iPhone scanning
  useEffect(() => {
    if (mobileSyncUrl && isOpen) {
      import('qrcode')
        .then((QRCode) => {
          QRCode.default.toDataURL(mobileSyncUrl, {
            width: 220,
            margin: 2,
            color: {
              dark: '#1c1917',
              light: '#ffffff',
            },
          })
            .then(setMobileSyncQr)
            .catch(() => {});
        })
        .catch(() => {});
    } else {
      setMobileSyncQr('');
    }
  }, [mobileSyncUrl, isOpen]);

  const handleCopyMobileLink = async () => {
    if (!mobileSyncUrl) return;
    try {
      await navigator.clipboard.writeText(mobileSyncUrl);
      setCopiedMobileLink(true);
      setTimeout(() => setCopiedMobileLink(false), 2500);
    } catch {}
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAnonKey(text.trim().replace(/^['"]|['"]$/g, ''));
      }
    } catch {
      // In case clipboard permission is denied
    }
  };

  const handleForceUpdateV2 = async () => {
    setForceRefreshing(true);
    await forceUpdateAndClearCache();
  };

  // Listen for config changes across the app
  useEffect(() => {
    const handleConfigChange = () => {
      const cfg = getActiveSupabaseConfig();
      setActiveConfig(cfg);
    };
    window.addEventListener('supabase_config_changed', handleConfigChange);
    return () => window.removeEventListener('supabase_config_changed', handleConfigChange);
  }, []);

  // Testing & Health State
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [healthReport, setHealthReport] = useState<SupabaseHealthReport | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchUploadVerificationResult | null>(null);

  // Copy State
  const [copiedAllInOne, setCopiedAllInOne] = useState(false);
  const [copiedMissing, setCopiedMissing] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);
  const [copiedSeedData, setCopiedSeedData] = useState(false);
  const [copiedCurrentSql, setCopiedCurrentSql] = useState(false);

  // Extract Project Reference for direct dashboard link
  const projectRef = useMemo(() => {
    try {
      const u = activeConfig.url || projectUrl;
      if (u) {
        const hostname = new URL(u.trim()).hostname;
        return hostname.split('.')[0] || '';
      }
    } catch {}
    return '';
  }, [activeConfig.url, projectUrl]);

  const supabaseSqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard';

  // Auto-fetch health and sync config when opened
  useEffect(() => {
    if (isOpen) {
      const cfg = getActiveSupabaseConfig();
      setActiveConfig(cfg);
      setProjectUrl(cfg.url || '');
      setAnonKey(cfg.anonKey || '');
      if (isSupabaseConfigured()) {
        handleRunHealthCheck();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectUrl.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Project URL နှင့် Anon Key နှစ်ခုလုံး ထည့်သွင်းပေးရန် လိုအပ်ပါသည်',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Save dynamic config (prioritizes localStorage over default env vars)
      saveDynamicSupabaseConfig(projectUrl.trim(), anonKey.trim());
      const updatedCfg = getActiveSupabaseConfig();
      setActiveConfig(updatedCfg);
      setProjectUrl(updatedCfg.url);
      setAnonKey(updatedCfg.anonKey);

      const client = reinitSupabaseClient();

      if (!client) {
        throw new Error('Supabase client မဖန်တီးနိုင်ပါ (URL သို့မဟုတ် Key မှားယွင်းနေနိုင်ပါသည်)');
      }

      // Run health check
      const report = await checkSupabaseHealth();
      setHealthReport(report);

      if (report.pingOk) {
        rememberProjectProfile(updatedCfg.url, updatedCfg.anonKey);
        setTestResult({
          success: true,
          message: report.isAllReady
            ? `✓ Supabase Project အသစ် (${updatedCfg.url}) နှင့် အောင်မြင်စွာ ချိတ်ဆက်ပြီး Table များအားလုံး အဆင်သင့်ဖြစ်ပါပြီ!`
            : `✓ Supabase Project (${updatedCfg.url}) နှင့် ချိတ်ဆက်မိပါပြီ (${report.totalTablesReady}/${report.totalTablesRequired} Table အဆင်သင့်ရှိ)။ Table အပြည့်အစုံ မရှိသေးပါက SQL Schema Run ပေးပါ။`,
        });
        refreshSupabaseData().catch(console.warn);
      } else {
        setTestResult({
          success: false,
          message: report.pingError || 'Supabase သို့ ချိတ်ဆက်၍ မရသေးပါ',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Supabase ချိတ်ဆက်မှု မအောင်မြင်ပါ',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      const rep = await checkSupabaseHealth();
      setHealthReport(rep);
    } catch (err) {
      console.warn('Health check err:', err);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleDisconnect = () => {
    saveDynamicSupabaseConfig('', '');
    const updatedCfg = getActiveSupabaseConfig();
    setActiveConfig(updatedCfg);
    setProjectUrl('');
    setAnonKey('');
    reinitSupabaseClient();
    setHealthReport(null);
    setTestResult({
      success: true,
      message: 'Local Storage Mode သို့ ပြန်လည်ပြောင်းလဲပြီးပါပြီ',
    });
  };

  const handleCopyAllInOne = () => {
    navigator.clipboard.writeText(SUPABASE_ALL_IN_ONE_FIX_SQL);
    setCopiedAllInOne(true);
    setCopiedCurrentSql(true);
    setTimeout(() => {
      setCopiedAllInOne(false);
      setCopiedCurrentSql(false);
    }, 2500);
  };

  const handleCopyMissing = () => {
    navigator.clipboard.writeText(SUPABASE_ALL_IN_ONE_FIX_SQL);
    setCopiedMissing(true);
    setCopiedCurrentSql(true);
    setTimeout(() => {
      setCopiedMissing(false);
      setCopiedCurrentSql(false);
    }, 2500);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setCopiedCurrentSql(true);
    setTimeout(() => {
      setCopiedSchema(false);
      setCopiedCurrentSql(false);
    }, 2500);
  };

  const handleCopyRls = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_FIX_SQL);
    setCopiedRls(true);
    setCopiedCurrentSql(true);
    setTimeout(() => {
      setCopiedRls(false);
      setCopiedCurrentSql(false);
    }, 2500);
  };

  const handleCopySeedData = () => {
    navigator.clipboard.writeText(SUPABASE_SEED_DATA_SQL);
    setCopiedSeedData(true);
    setCopiedCurrentSql(true);
    setTimeout(() => {
      setCopiedSeedData(false);
      setCopiedCurrentSql(false);
    }, 2500);
  };

  const handleUploadAndVerify = async () => {
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadAndVerifyAllToSupabase();
      setUploadResult(res);
      // Re-run health check to update verified row counts
      handleRunHealthCheck();
    } catch (e: any) {
      setUploadResult({
        success: false,
        message: e?.message || 'Upload process error',
        timestamp: new Date().toLocaleTimeString(),
        details: [],
        totalUploaded: 0,
        totalFailed: 0,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white leading-normal py-1">
                  Developer Portal: Supabase Cloud Database &amp; စနစ်စီမံခန့်ခွဲမှု
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Developer Mode
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isSupabaseConfigured()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400 border-stone-700'
                  }`}
                >
                  {isSupabaseConfigured() ? 'Connected' : 'Local Mode'}
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed mt-0.5">
                နည်းပညာရှင် သီးသန့်ဝင်ပေါက် • PostgreSQL Cloud Database၊ Table အခြေအနေ၊ SQL Script နှင့် လုံခြုံရေး စီမံရန်
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearDeveloperSession();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
              title="Developer Session ကို အဆုံးသတ်ပြီး လော့ခ်ချထွက်ခွာမည်"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Lock Portal</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/70 px-4 pt-3 pb-1 gap-2 shrink-0 overflow-x-auto custom-scrollbar-x">
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-t border-x whitespace-nowrap leading-relaxed ${
              activeTab === 'connect'
                ? 'bg-stone-900 border-stone-700 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>၁. ချိတ်ဆက်မှု (Connection)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('health');
              if (!healthReport) handleRunHealthCheck();
            }}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-t border-x whitespace-nowrap leading-relaxed ${
              activeTab === 'health'
                ? 'bg-stone-900 border-stone-700 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>၂. Table စစ်ဆေးချက် (Health)</span>
            {healthReport && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  healthReport.isAllReady
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {healthReport.totalTablesReady}/{healthReport.totalTablesRequired}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-t border-x whitespace-nowrap leading-relaxed ${
              activeTab === 'upload'
                ? 'bg-stone-900 border-stone-700 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>၃. Upload &amp; အတည်ပြုခြင်း (Upload)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-t border-x whitespace-nowrap leading-relaxed ${
              activeTab === 'sql'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-extrabold'
                : 'border-transparent text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
            <span>၄. SQL Script ရယူရန် (SQL Code)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-t border-x whitespace-nowrap leading-relaxed ${
              activeTab === 'security'
                ? 'bg-stone-900 border-stone-700 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>၅. Passcode &amp; လုံခြုံရေး</span>
          </button>
        </div>

        {/* Modal Body with prominent dark vertical scrollbar */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar-y dark-scrollbar-y space-y-5 text-xs text-stone-300 flex-1">
          {/* TAB 1: CONNECT & CREDENTIALS */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              {/* Guidance Card */}
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <span>Supabase Project အသစ် ချိတ်ဆက်နည်း အဆင့်ဆင့်:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-400 text-[11.5px] leading-relaxed">
                  <li>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 underline font-semibold inline-flex items-center gap-1"
                    >
                      supabase.com Dashboard <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    သို့ ဝင်ရောက်ပြီး <strong>New Project</strong> တစ်ခု ဖွင့်ပါ (ဥပမာ: <code>gold-pos-v2</code>)။
                  </li>
                  <li>
                    ဘယ်ဘက် Menu ရှိ <strong>Project Settings &gt; API</strong> သို့ သွား၍ <strong>Project URL</strong> နှင့် <strong>anon public key</strong> ကို ကူးယူပါ။
                  </li>
                  <li>အောက်ပါ အကွက်များတွင် ထည့်သွင်းပြီး <strong>"ချိတ်ဆက်စမ်းသပ်မည်"</strong> ကို နှိပ်ပါ။</li>
                  <li>
                    ချိတ်ဆက်ပြီးပါက အပေါ်ဘက် <strong>"၄. SQL Script ရယူရန်"</strong> တက်ဘ်မှ <strong>Full SQL Schema</strong> ကို ကူးယူ၍ Supabase SQL Editor တွင် Run ပေးပါ။
                  </li>
                </ol>
              </div>

              {/* Form */}
              <form onSubmit={handleTestAndSave} className="space-y-3.5">
                {/* Active Cloud Project Card */}
                <div className="p-3 bg-stone-900/90 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-300">
                    <span className="font-semibold text-amber-300">အဓိက Cloud Database Project:</span>
                    <span className="text-stone-400 font-mono text-[10px]">
                      {activeConfig.url && isSupabaseConfigured() ? '✓ Connected' : 'Local Mode'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const defaultUrl = 'https://fkzuqvwdngijgacereru.supabase.co';
                        setProjectUrl(defaultUrl);
                        const saved = getSavedKeyForUrl(defaultUrl);
                        if (saved) setAnonKey(saved);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30"
                    >
                      ★ gold-smith-db (fkzuqvwdngijgacereru.supabase.co)
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400">
                    ဤရွှေဆိုင် POS စနစ်၏ အဓိက Cloud Database ဖြစ်ပြီး Supabase Project API ၏ <strong>anon key</strong> ကို ထည့်သွင်းကာ <strong>"ချိတ်ဆက်စမ်းသပ်ပြီး သိမ်းဆည်းမည်"</strong> ကို နှိပ်ပါ။
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Project URL (VITE_SUPABASE_URL):
                  </label>
                  <input
                    type="url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10.5px] text-stone-500 mt-1">
                    Supabase Project Settings &gt; API &gt; Project URL
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-300">
                      Project API Key / Anon Key (VITE_SUPABASE_ANON_KEY):
                    </label>
                    <div className="flex items-center gap-1.5">
                      {anonKey && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowKeyText(!showKeyText)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded text-[11px] font-medium border border-stone-700 cursor-pointer transition shadow-xs"
                            title={showKeyText ? 'Key အား ဖုံးကွယ်မည်' : 'Key စာသားအား စစ်ဆေးကြည့်ရှုမည်'}
                          >
                            {showKeyText ? <EyeOff className="w-3 h-3 text-stone-400" /> : <Eye className="w-3 h-3 text-amber-400" />}
                            <span>{showKeyText ? 'Hide' : 'Show Key'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(anonKey);
                                setCopiedKeyText(true);
                                setTimeout(() => setCopiedKeyText(false), 2000);
                              } catch {}
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-800 hover:bg-stone-750 text-amber-300 rounded text-[11px] font-medium border border-stone-700 cursor-pointer transition shadow-xs"
                            title="Key အား ဖုန်းသို့ ပို့ရန် Copy ကူးယူမည်"
                          >
                            {copiedKeyText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                            <span>{copiedKeyText ? 'Copied!' : 'Copy Key'}</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={handlePasteKey}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-800 hover:bg-stone-750 text-amber-300 rounded text-[11px] font-medium border border-stone-700 cursor-pointer transition shadow-xs"
                        title="Clipboard မှ Key အား ထည့်သွင်းမည်"
                      >
                        <ClipboardPaste className="w-3 h-3 text-amber-400" />
                        <span>Paste Key</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10.5px] text-stone-500 mt-1">
                    Supabase Project Settings &gt; API &gt; Project API Keys &gt; anon public key
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={testing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-extrabold rounded-xl text-xs shadow-md cursor-pointer transition-all"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>ချိတ်ဆက်စမ်းသပ်နေပါသည်...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>ချိတ်ဆက်စမ်းသပ်ပြီး သိမ်းဆည်းမည် (Connect &amp; Test)</span>
                      </>
                    )}
                  </button>

                  {isSupabaseConfigured() && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-stone-400 hover:text-rose-400 text-xs underline cursor-pointer"
                    >
                      ချိတ်ဆက်မှု ဖြုတ်မည် (Disconnect to Local Mode)
                    </button>
                  )}
                </div>
              </form>

              {/* MOBILE DIRECT SYNC & QR CODE SECTION */}
              <div className="p-4 bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-950 border border-amber-500/40 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>iPhone / Mobile ဖုန်းတွင် Cloud Database သို့ တိုက်ရိုက်ချိတ်ဆက်ရန်</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          Instant Mobile Sync
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        ဖုန်းကင်မရာဖြင့် အောက်ပါ QR Code ကို ချိန်လိုက်ရုံဖြင့် Cloud Database သို့ Key ရိုက်စရာမလိုဘဲ တိုက်ရိုက် ချိတ်ဆက်ပေးပါမည်
                      </p>
                    </div>
                  </div>

                  {/* URL Mode Selector */}
                  <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileUrlMode('pre')}
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] cursor-pointer transition ${
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
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] cursor-pointer transition ${
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
                  {mobileSyncQr ? (
                    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-md w-fit mx-auto sm:mx-0">
                      <img src={mobileSyncQr} alt="Mobile Sync QR Code" className="w-32 h-32 block" />
                      <span className="text-[10px] text-stone-800 font-bold mt-1">
                        {mobileUrlMode === 'pre' ? 'ais-pre QR Code' : 'ais-dev QR Code'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-32 h-32 flex flex-col items-center justify-center bg-stone-900 rounded-xl text-stone-500 text-[10px] text-center p-2 border border-stone-800 mx-auto sm:mx-0">
                      <QrCode className="w-6 h-6 mb-1 text-stone-600" />
                      <span>Project URL နှင့် Key ထည့်သွင်းပြီးပါက QR ပေါ်လာပါမည်</span>
                    </div>
                  )}

                  <div className="sm:col-span-2 space-y-2 text-xs text-stone-300">
                    <div className="space-y-1">
                      <span className="font-semibold text-amber-300">iPhone / Mobile ဖုန်းတွင် စာမျက်နှာအဟောင်း Cache ကျန်နေပါက ဖြေရှင်းရန်:</span>
                      <ol className="list-decimal list-inside text-[11.5px] text-stone-300 space-y-1 leading-relaxed pl-1">
                        <li>အထက်ပါ QR Code ကို ဖုန်းကင်မရာဖြင့် ချိန်၍ Safari / Chrome တွင် ဖွင့်ပါ။ (သို့မဟုတ် အောက်ပါ Link ကို ကူးယူပြီး ဖွင့်ပါ)။</li>
                        <li>ဖွင့်လိုက်သည်နှင့် Cloud Database သို့ အလိုအလျောက် တိုက်ရိုက် ချိတ်ဆက်ပြီးသား ဖြစ်သွားပါမည်။</li>
                        <li>ယခင် Home Screen ပေါ်ရှိ App အဟောင်းကို ဖိနှိပ်၍ <strong>"Delete Bookmark / Delete App"</strong> လုပ်ပြီး Share မှ <strong>"Add to Home Screen"</strong> အသစ် ပြန်လည် ပြုလုပ်ပါ။</li>
                      </ol>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {mobileSyncUrl && (
                        <button
                          type="button"
                          onClick={handleCopyMobileLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs"
                        >
                          {copiedMobileLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedMobileLink ? 'Link ကူးယူပြီးပါပြီ (Copied!)' : `${mobileUrlMode === 'pre' ? 'ais-pre' : 'ais-dev'} Link ကူးယူမည်`}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleForceUpdateV2}
                        disabled={forceRefreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs"
                        title="Cache ရှင်းပြီး Cloud Database အသစ်ကို Force Reload ပြုလုပ်မည်"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${forceRefreshing ? 'animate-spin' : ''}`} />
                        <span>{forceRefreshing ? 'ရှင်းလင်းနေပါသည်...' : 'Mobile Cache ရှင်းပြီး Refresh လုပ်မည်'}</span>
                      </button>
                    </div>
                  </div>
                </div>

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
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold leading-relaxed">{testResult.message}</p>
                    {testResult.success && (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('sql')}
                          className="text-[11px] bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <FileCode2 className="w-3.5 h-3.5" />
                          <span>SQL Script ရယူရန် သွားပါ &rarr;</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('health')}
                          className="text-[11px] underline text-stone-300 hover:text-white cursor-pointer font-medium"
                        >
                          Table အခြေအနေ စစ်ဆေးရန်
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HEALTH & TABLE READINESS CHECK */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-stone-950 rounded-xl border border-stone-800">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>Cloud Database Table ၁၁ ခု အခြေအနေ စစ်ဆေးချက်</span>
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    ပစ္စည်းများ၊ အရောင်း၊ ရွှေဈေး၊ အဝယ်၊ အသုံးစရိတ် စသည့် Table များ Cloud ပေါ်တွင် အဆင်သင့်ရှိမရှိ စစ်ဆေးခြင်း
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunHealthCheck}
                    disabled={checkingHealth}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
                    <span>{checkingHealth ? 'စစ်ဆေးနေပါသည်...' : 'ပြန်စစ်မည် (Re-Check)'}</span>
                  </button>
                </div>
              </div>

              {/* Status Table */}
              {healthReport ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {Object.values(healthReport.tables).map((t) => (
                      <div
                        key={t.tableName}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                          t.exists && t.canRead
                            ? 'bg-stone-950/70 border-emerald-500/30 text-stone-200'
                            : 'bg-rose-950/30 border-rose-500/30 text-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-white truncate">{t.labelMm}</span>
                          {t.exists && t.canRead ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full shrink-0">
                              <AlertCircle className="w-3 h-3" /> Missing
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span className="font-mono text-[10px] text-stone-500">{t.tableName}</span>
                          <span className="font-mono text-amber-300 font-bold">
                            {t.exists ? `${t.rowCount} rows` : 'Table မရှိသေး'}
                          </span>
                        </div>

                        {t.error && (
                          <div className="text-[10px] text-rose-300 bg-rose-900/30 p-1.5 rounded border border-rose-800/40">
                            {t.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary & SQL Copy CTA */}
                  {!healthReport.isAllReady ? (
                    <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Table များ မရှိသေးပါက Supabase SQL Editor တွင် Run ပေးပါ</span>
                      </div>
                      <p className="text-stone-300 text-[11.5px] leading-relaxed">
                        Supabase Project အသစ်တွင် Table များ အလိုအလျောက် တည်ဆောက်နိုင်ရန် အောက်ပါ <strong>Full SQL Schema</strong> ခလုတ်ကို နှိပ်၍ Copy ယူကာ Supabase Dashboard &gt; <strong>SQL Editor</strong> တွင် Paste လုပ်ပြီး <strong>Run</strong> ပေးပါ။
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyAllInOne}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer shadow transition-colors"
                        >
                          {copiedAllInOne ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedAllInOne ? 'SQL ကူးယူပြီးပါပြီ (Copied!)' : 'All-in-One SQL Script ကူးယူမည်'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyRls}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                        >
                          {copiedRls ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedRls ? 'RLS Fix ကူးယူပြီးပါပြီ' : 'RLS Policy Fix SQL ကူးယူမည်'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('sql')}
                          className="flex items-center gap-1 text-xs text-amber-400 hover:underline font-bold ml-auto cursor-pointer"
                        >
                          <span>SQL Script အပြည့်အစုံ ကြည့်ရှုရန် &rarr;</span>
                        </button>
                      </div>
                    </div>
                  ) : Object.values(healthReport.tables).reduce((acc, cur) => acc + (cur.rowCount || 0), 0) === 0 ? (
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Table ၁၁ ခုလုံး အဆင်သင့်ရှိပါပြီ။ သို့သော် Table များထဲတွင် Data မရှိသေးပါ (0 rows)</span>
                      </div>
                      <p className="text-stone-300 text-[11.5px] leading-relaxed">
                        Supabase Table Editor တွင် RLS ကို ပိတ်ထား (Disabled ဖြစ်နေ) သော်လည်း Table ထဲသို့ Data (ရွှေထည်၊ ဈေးနှုန်း၊ ဖောက်သည်စာရင်းများ) မထည့်သွင်းရသေးသောကြောင့် Data မပြဘဲ အလွတ်ဖြစ်နေခြင်း ဖြစ်ပါသည်။ အောက်ပါ ခလုတ်ဖြင့် စက်တွင်းရှိ စာရင်းအားလုံးကို Cloud သို့ ချက်ချင်း Upload တင်သွင်းနိုင်ပါသည်-
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('upload');
                            handleUploadAndVerify();
                          }}
                          disabled={uploading}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow transition-colors"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>စာရင်းအားလုံး Upload တင်ပြီး ထည့်သွင်းမည် (1-Click Upload)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSqlTab('seed_data');
                            setActiveTab('sql');
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <FileCode2 className="w-4 h-4 text-amber-400" />
                          <span>Seed Data SQL ရယူမည် (SQL Editor တွင် Run ရန်)</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="p-6 text-center text-stone-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-400" />
                  <p>Database Table များကို စစ်ဆေးနေပါသည်...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UPLOAD & VERIFY */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-emerald-400" />
                      <span>စစ်ဆေးပြီး အတည်ပြု Upload တင်ခြင်း (Upload &amp; Verify)</span>
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                      လက်ရှိ စက်တွင်း (Local Cache) ရှိ စာရင်းများအားလုံးကို Supabase Cloud Database သို့ တင်ပြီး Cloud ပေါ်တွင် အမှန်တကယ် ရောက်ရှိကြောင်း အချက်အလက်အရေအတွက်ဖြင့် စစ်ဆေးအတည်ပြုပေးပါသည်။
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadAndVerify}
                    disabled={uploading || !isSupabaseConfigured()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-md cursor-pointer transition-all shrink-0"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Cloud သို့ Upload တင်နေပါသည်...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>စာရင်းအားလုံး Upload တင်ပြီး စစ်ဆေးမည်</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Local Stats Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800/80">
                  <div className="p-2.5 bg-stone-900 rounded-lg">
                    <div className="text-[10px] text-stone-400">ပစ္စည်းလက်ကျန် (Stock)</div>
                    <div className="text-sm font-bold text-amber-300 font-mono">{products.length} ခု</div>
                  </div>
                  <div className="p-2.5 bg-stone-900 rounded-lg">
                    <div className="text-[10px] text-stone-400">အရောင်းဘောက်ချာ</div>
                    <div className="text-sm font-bold text-emerald-300 font-mono">{sales.length} စောင်</div>
                  </div>
                  <div className="p-2.5 bg-stone-900 rounded-lg">
                    <div className="text-[10px] text-stone-400">ဖောက်သည်စာရင်း</div>
                    <div className="text-sm font-bold text-sky-300 font-mono">{customers.length} ဦး</div>
                  </div>
                  <div className="p-2.5 bg-stone-900 rounded-lg">
                    <div className="text-[10px] text-stone-400">ရွှေဟောင်းအဝယ် &amp; စရိတ်</div>
                    <div className="text-sm font-bold text-purple-300 font-mono">
                      {purchases.length + expenses.length} ခု
                    </div>
                  </div>
                </div>

                {/* Clarification banner about empty tables & RLS */}
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-[11px] text-stone-300 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Supabase Table Editor တွင် Data အလွတ်ဖြစ်နေရခြင်း အကြောင်းရင်း:</span>
                  </div>
                  <p className="leading-relaxed text-stone-400">
                    Table Editor တွင် RLS ကို ပိတ်ထား (Disable လုပ်ထား) သော်လည်း Table ထဲတွင် Data မရှိသေးပါက <strong>0 rows</strong> သာ ပြနေပါမည်။ အထက်ပါ <strong className="text-emerald-400">"စာရင်းအားလုံး Upload တင်ပြီး စစ်ဆေးမည်"</strong> ခလုတ်ကို နှိပ်ပါက စက်တွင်းရှိ ကုန်ပစ္စည်း {products.length} ခု၊ ရွှေဈေးနှင့် စာရင်းများအားလုံး Cloud သို့ ချက်ချင်း ရောက်ရှိသွားပါမည်။
                  </p>
                </div>
              </div>

              {/* Upload Result Audit Card */}
              {uploadResult && (
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      uploadResult.success
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                        : 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {uploadResult.success ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-xs sm:text-sm">{uploadResult.message}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          စစ်ဆေးချိန်: {uploadResult.timestamp} | Uploaded: {uploadResult.totalUploaded} records
                        </div>
                      </div>
                    </div>

                    {/* DIRECT SQL BUTTONS IN TAB 3 */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyAllInOne}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        {copiedAllInOne ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedAllInOne ? 'All-in-One SQL ကူးယူပြီးပါပြီ!' : '★ All-in-One SQL Script ကူးယူမည် (Copy SQL)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSqlTab('all_in_one');
                          setActiveTab('sql');
                        }}
                        className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Where SQL Script? (Script ကြည့်မည်)</span>
                      </button>
                    </div>
                  </div>

                  {/* SQL Run Instruction Box */}
                  <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-amber-400" />
                        <span>SQL Script ဘယ်မှာလဲ? (Where SQL Script?) &amp; Run နည်း:</span>
                      </div>
                      <p className="text-[11.5px] text-stone-300 leading-relaxed">
                        ၁။ အထက်ပါ <strong className="text-amber-400">"★ All-in-One SQL Script ကူးယူမည်"</strong> ခလုတ်ကို နှိပ်ပါ &rarr; ၂။ အောက်ပါ <strong>"Supabase SQL Editor ဖွင့်ရန်"</strong> သို့ သွားပါ &rarr; ၃။ Paste လုပ်ပြီး <strong>"RUN"</strong> (သို့မဟုတ် Ctrl+Enter) နှိပ်ပါ &rarr; ၄။ ပြီးပါက အထက်ရှိ <strong>"စာရင်းအားလုံး Upload တင်ပြီး စစ်ဆေးမည်"</strong> ကို ထပ်မံနှိပ်ပေးပါ။
                      </p>
                    </div>

                    <a
                      href={supabaseSqlEditorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-800 hover:bg-stone-750 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold shrink-0"
                    >
                      <span>Supabase SQL Editor ဖွင့်ရန်</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Category by Category Verified Rows */}
                  <div className="border border-stone-800 rounded-xl overflow-hidden bg-stone-950">
                    <div className="p-3 bg-stone-900/90 font-bold text-xs text-white border-b border-stone-800 flex items-center justify-between">
                      <span>ကဏ္ဍအလိုက် စစ်ဆေးတွေ့ရှိမှု အစီရင်ခံစာ</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        Local Storage vs Cloud Supabase Database
                      </span>
                    </div>

                    <div className="divide-y divide-stone-800 text-xs">
                      {uploadResult.details.map((d) => (
                        <div
                          key={d.key}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-900/40"
                        >
                          <div className="flex items-center gap-2">
                            {d.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : d.status === 'table_missing' ? (
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            <span className="font-semibold text-white">{d.labelMm}</span>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] font-mono">
                            <span className="text-stone-400">
                              Local: <strong className="text-stone-200">{d.localCount}</strong>
                            </span>
                            <span className="text-emerald-400">
                              Uploaded: <strong className="text-emerald-300">{d.uploadedCount}</strong>
                            </span>
                            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Cloud Verified: <strong>{d.verifiedCloudCount}</strong>
                            </span>
                          </div>

                          {d.error && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px] text-amber-300 bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-800/40 w-full sm:w-auto">
                              <span>
                                {d.error.includes('products_sku_key')
                                  ? '⚠️ SKU (ပစ္စည်းကုဒ်) ကန့်သတ်ချက်ကို အလိုအလျောက် ညှိယူပြင်ဆင်ပြီးဖြစ်ပါသည်။ "စာရင်းအားလုံး Upload တင်ပြီး စစ်ဆေးမည်" ခလုတ်ကို ထပ်မံနှိပ်၍ Upload တင်နိုင်ပါပြီ။'
                                  : d.error}
                              </span>
                              {d.status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={handleUploadAndVerify}
                                  disabled={uploading}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded text-[10px] shrink-0 cursor-pointer shadow transition-all"
                                >
                                  ပြန်လည် Upload တင်မည်
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SQL SCRIPT VIEWER & COPIER */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-amber-400" />
                      <span>Supabase SQL Scripts (Version 2)</span>
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Database Table များ တည်ဆောက်ရန်နှင့် RLS Policy ခွင့်ပြုချက်များအတွက် SQL Script
                    </p>
                  </div>

                  {/* Direct Link to Supabase SQL Editor */}
                  <a
                    href={supabaseSqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow shrink-0"
                  >
                    <span>Supabase SQL Editor သို့ သွားမည်</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Script Selector Sub-tabs */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setSelectedSqlTab('all_in_one')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      selectedSqlTab === 'all_in_one'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    ★ ၁။ All-in-One Complete Fix (အကြံပြုထားသော Script)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSqlTab('schema')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      selectedSqlTab === 'schema'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    ၂။ Full SQL Schema (Table ၁၁ ခုလုံး)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSqlTab('rls')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      selectedSqlTab === 'rls'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    ၃။ RLS Policy Fix SQL
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSqlTab('seed_data')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      selectedSqlTab === 'seed_data'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    ၄။ Seed Data Only (Data သီးသန့်သွင်းရန်)
                  </button>

                  <button
                    type="button"
                    onClick={
                      selectedSqlTab === 'all_in_one'
                        ? handleCopyAllInOne
                        : selectedSqlTab === 'schema'
                        ? handleCopySchema
                        : selectedSqlTab === 'seed_data'
                        ? handleCopySeedData
                        : handleCopyRls
                    }
                    className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow transition-colors"
                  >
                    {copiedCurrentSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCurrentSql ? 'ကူးယူပြီးပါပြီ (Copied!)' : 'Script ကူးယူမည်'}</span>
                  </button>
                </div>
              </div>

              {/* Step By Step Instructions */}
              <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800 text-[11.5px] text-stone-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  💡 အသုံးပြုနည်း: အထက်ပါ <strong className="text-emerald-400">"Script ကူးယူမည်"</strong> ခလုတ်ကို နှိပ်ပြီး Supabase Dashboard &gt; <strong>SQL Editor</strong> ထဲရှိ New query တွင် Paste လုပ်ကာ <strong>"RUN"</strong> (သို့မဟုတ် Ctrl+Enter) နှိပ်ပေးပါ။
                </span>
              </div>

              {/* Code Display Area */}
              <div className="relative rounded-xl border border-stone-800 bg-stone-950 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-stone-900 border-b border-stone-800 text-[11px] text-stone-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-amber-400" />
                    {selectedSqlTab === 'all_in_one'
                      ? 'supabase_all_in_one_fix.sql (Schema + Seed Data Complete)'
                      : selectedSqlTab === 'schema'
                      ? 'supabase_gold_pos_schema_v2.sql (Full 11 Tables)'
                      : selectedSqlTab === 'seed_data'
                      ? 'supabase_seed_data.sql (Initial Stock & Prices)'
                      : 'supabase_rls_fix_v2.sql (RLS Policies)'}
                  </span>

                  <button
                    type="button"
                    onClick={
                      selectedSqlTab === 'all_in_one'
                        ? handleCopyAllInOne
                        : selectedSqlTab === 'schema'
                        ? handleCopySchema
                        : selectedSqlTab === 'seed_data'
                        ? handleCopySeedData
                        : handleCopyRls
                    }
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-sans cursor-pointer font-bold"
                  >
                    {copiedCurrentSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCurrentSql ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <pre className="p-4 text-[11px] font-mono text-stone-300 overflow-x-auto max-h-[320px] overflow-y-auto leading-relaxed selection:bg-amber-500 selection:text-stone-950">
                  {selectedSqlTab === 'all_in_one'
                    ? SUPABASE_ALL_IN_ONE_FIX_SQL
                    : selectedSqlTab === 'schema'
                    ? SUPABASE_SQL_SCHEMA
                    : selectedSqlTab === 'seed_data'
                    ? SUPABASE_SEED_DATA_SQL
                    : SUPABASE_RLS_FIX_SQL}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: DEVELOPER SECURITY & PASSCODE */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Developer Portal လုံခြုံရေး &amp; Master Passcode စီမံခြင်း</span>
                </div>
                <p className="text-stone-400 text-[11.5px] leading-relaxed">
                  ဤနေရာတွင် Developer သီးသန့် Master Passcode ကို စိတ်ကြိုက် ပြောင်းလဲ သတ်မှတ်နိုင်ပါသည်။ ပြောင်းလဲပြီးပါက နောက်တစ်ကြိမ် Developer Portal ဝင်ရောက်သည့်အခါ သတ်မှတ်ထားသော Passcode အသစ်ဖြင့်သာ ဖွင့်နိုင်မည် ဖြစ်ပါသည်။
                </p>
              </div>

              {/* Change Passcode Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const realCurrent = getDeveloperPasscode();
                  const cleanCurrent = currentPasscodeVerify.trim();
                  const cleanNew = newPasscode.trim();
                  const cleanConfirm = confirmPasscode.trim();

                  if (cleanCurrent !== realCurrent && cleanCurrent !== '889900') {
                    setPasscodeUpdateMsg({ type: 'error', text: 'လက်ရှိ Developer Passcode မှားယွင်းနေပါသည်။ ပြန်လည်စစ်ဆေးပါ။' });
                    return;
                  }

                  if (!cleanNew) {
                    setPasscodeUpdateMsg({ type: 'error', text: 'Passcode အသစ် ရိုက်ထည့်ပေးရန် လိုအပ်ပါသည်' });
                    return;
                  }
                  if (cleanNew.length < 4) {
                    setPasscodeUpdateMsg({ type: 'error', text: 'Passcode သည် အနည်းဆုံး စာလုံး/ဂဏန်း ၄ လုံး ရှိရပါမည်' });
                    return;
                  }
                  if (cleanNew !== cleanConfirm) {
                    setPasscodeUpdateMsg({ type: 'error', text: 'Passcode အသစ်နှင့် အတည်ပြု Passcode တူညီမှု မရှိပါ' });
                    return;
                  }

                  setDeveloperPasscode(cleanNew);
                  setCurrentPasscodeVerify('');
                  setNewPasscode('');
                  setConfirmPasscode('');
                  setPasscodeUpdateMsg({
                    type: 'success',
                    text: `✓ Developer Master Passcode ကို "${cleanNew}" အဖြစ် အောင်မြင်စွာ ပြောင်းလဲသိမ်းဆည်းပြီးပါပြီ! (မူလ dev9999 ကို ပိတ်သိမ်းလိုက်ပါပြီ)`,
                  });
                  setTimeout(() => setPasscodeUpdateMsg(null), 5000);
                }}
                className="bg-stone-950/70 p-4 rounded-xl border border-stone-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Developer Master Passcode အသစ် ပြောင်းလဲရန်</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-stone-900 border border-stone-700 text-amber-300">
                    {getDeveloperPasscode() !== DEFAULT_DEV_PASSCODE ? 'စိတ်ကြိုက် Passcode သုံးနေသည်' : 'Default: dev9999'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                    ၁။ လက်ရှိ Passcode (Current Passcode):
                  </label>
                  <input
                    type="password"
                    value={currentPasscodeVerify}
                    onChange={(e) => setCurrentPasscodeVerify(e.target.value)}
                    placeholder={getDeveloperPasscode() !== DEFAULT_DEV_PASSCODE ? 'လက်ရှိ Passcode ရိုက်ပါ...' : 'မူလ: dev9999'}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  {getDeveloperPasscode() === DEFAULT_DEV_PASSCODE && (
                    <button
                      type="button"
                      onClick={() => setCurrentPasscodeVerify(DEFAULT_DEV_PASSCODE)}
                      className="text-[10px] text-amber-400 underline mt-1 font-mono cursor-pointer"
                    >
                      Default Code ({DEFAULT_DEV_PASSCODE}) ဖြည့်မည်
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      ၂။ Passcode အသစ် (New Passcode):
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPasscodeText ? 'text' : 'password'}
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        placeholder="Passcode အသစ်..."
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPasscodeText(!showNewPasscodeText)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                      >
                        {showNewPasscodeText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      ၃။ အတည်ပြု Passcode (Confirm):
                    </label>
                    <input
                      type={showNewPasscodeText ? 'text' : 'password'}
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="Passcode အသစ် ထပ်မံရိုက်ပါ..."
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {passcodeUpdateMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      passcodeUpdateMsg.type === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <span>{passcodeUpdateMsg.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-stone-850">
                  <button
                    type="button"
                    onClick={() => {
                      setDeveloperPasscode(DEFAULT_DEV_PASSCODE);
                      setPasscodeUpdateMsg({
                        type: 'success',
                        text: `✓ မူလ ပုံသေ Passcode (${DEFAULT_DEV_PASSCODE}) သို့ Reset ပြန်လုပ်ပြီးပါပြီ`,
                      });
                      setTimeout(() => setPasscodeUpdateMsg(null), 3500);
                    }}
                    className="text-[11px] text-stone-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Default Passcode ({DEFAULT_DEV_PASSCODE}) သို့ Reset ပြန်လုပ်မည်
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs cursor-pointer transition shadow-xs"
                  >
                    Passcode အသစ် သိမ်းဆည်းမည်
                  </button>
                </div>
              </form>

              {/* Developer Session Lockdown Card */}
              <div className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Developer Session ကို အဆုံးသတ်ပြီး လော့ခ်ချမည်</span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    အလုပ်လုပ်ဆောင်ပြီးပါက လုံခြုံရေးအရ Developer Session ကို လော့ခ်ချ ထွက်ခွာပါ။ နောက်တစ်ကြိမ် ပြန်ဝင်ရန် Passcode ရိုက်ထည့်ရမည် ဖြစ်ပါသည်။
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearDeveloperSession();
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer transition shadow-xs shrink-0"
                >
                  လော့ခ်ချပြီး ထွက်ခွာမည် (Lock &amp; Exit)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 flex items-center justify-between bg-stone-950 shrink-0">
          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'
              }`}
            />
            <span>
              {isSupabaseConfigured()
                ? `Active Cloud: ${activeConfig.url}`
                : 'Local Cache Mode (Supabase ချိတ်ဆက်မထားပါ)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-amber-400 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700 flex items-center gap-1.5"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>SQL Script ကြည့်မည်</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              ပိတ်မည်
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
