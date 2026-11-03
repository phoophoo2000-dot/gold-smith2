import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  KeyRound,
  RefreshCw,
  X,
  ExternalLink,
  ShieldAlert,
  Camera,
  Check,
  Server,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  PRIMARY_SUPABASE_URL,
  saveDynamicSupabaseConfig,
  syncActiveConfigFromServer,
  isSupabaseConfigured,
  getActiveSupabaseConfig,
} from '../lib/supabase';
import { useGoldShop } from '../context/GoldShopContext';

interface MobileCloudConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeveloperPortal?: () => void;
}

export const MobileCloudConnectModal: React.FC<MobileCloudConnectModalProps> = ({
  isOpen,
  onClose,
  onOpenDeveloperPortal,
}) => {
  const { isSupabaseConnected, refreshSupabaseData } = useGoldShop();
  const [projectUrl, setProjectUrl] = useState(() => getActiveSupabaseConfig().url || PRIMARY_SUPABASE_URL);
  const [anonKey, setAnonKey] = useState(() => getActiveSupabaseConfig().anonKey || '');
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // QR Camera Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRegionId = 'mobile-qr-reader-region';

  useEffect(() => {
    if (isOpen) {
      const current = getActiveSupabaseConfig();
      setProjectUrl(current.url || PRIMARY_SUPABASE_URL);
      setAnonKey(current.anonKey || '');
      setStatusMessage(null);
      setIsScanning(false);
    }
  }, [isOpen]);

  // Clean up QR scanner when modal closes
  useEffect(() => {
    let qrScanner: Html5Qrcode | null = null;
    if (isScanning && isOpen) {
      const startScanner = async () => {
        try {
          qrScanner = new Html5Qrcode(scannerRegionId);
          await qrScanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
            },
            async (decodedText) => {
              try {
                const urlObj = new URL(decodedText);
                let targetUrl = urlObj.searchParams.get('sb_url');
                let targetKey = urlObj.searchParams.get('sb_key');

                if (!targetUrl || !targetKey) {
                  if (urlObj.hash && urlObj.hash.includes('sb_url')) {
                    const hashParams = new URLSearchParams(urlObj.hash.replace(/^#\/?/, ''));
                    targetUrl = targetUrl || hashParams.get('sb_url');
                    targetKey = targetKey || hashParams.get('sb_key');
                  }
                }

                if (targetUrl && targetKey) {
                  await qrScanner?.stop();
                  setIsScanning(false);
                  setProjectUrl(targetUrl);
                  setAnonKey(targetKey);
                  saveDynamicSupabaseConfig(targetUrl, targetKey);
                  await refreshSupabaseData();
                  setStatusMessage({
                    type: 'success',
                    text: 'QR Code မှ Cloud DB ချိတ်ဆက်မှု အောင်မြင်ပါသည်!',
                  });
                  setTimeout(() => onClose(), 1500);
                } else {
                  setScannerError('QR Code တွင် Supabase ချိတ်ဆက်မှု အချက်အလက် မပါဝင်ပါ။');
                }
              } catch {
                setScannerError('မှန်ကန်သော Mobile Sync QR Code ဖြစ်ရန် လိုအပ်ပါသည်။');
              }
            },
            () => {}
          );
        } catch (err: any) {
          setScannerError(err?.message || 'ကင်မရာ ဖွင့်မရပါ။ ကင်မရာခွင့်ပြုချက် စစ်ဆေးပေးပါ။');
          setIsScanning(false);
        }
      };
      startScanner();
    }

    return () => {
      if (qrScanner?.isScanning) {
        qrScanner.stop().catch(() => {});
      }
    };
  }, [isScanning, isOpen]);

  // 1. One-tap Auto Sync from Server
  const handleAutoSyncFromServer = async () => {
    setIsSyncingServer(true);
    setStatusMessage(null);
    try {
      const res = await syncActiveConfigFromServer();
      if (res.success && res.anonKey) {
        setProjectUrl(res.url || PRIMARY_SUPABASE_URL);
        setAnonKey(res.anonKey);
        await refreshSupabaseData();
        setStatusMessage({
          type: 'success',
          text: 'ဆာဗာမှ Cloud DB အချက်အလက်များ အောင်မြင်စွာ ရယူပြီး ချိတ်ဆက်ပြီးပါပြီ!',
        });
        setTimeout(() => onClose(), 1400);
      } else {
        setStatusMessage({
          type: 'info',
          text: 'ဆာဗာတွင် သိမ်းဆည်းထားသော Supabase Key မတွေ့ရှိသေးပါ။ အောက်ပါ ကွက်လပ်တွင် Anon Key ရိုက်ထည့်၍ "ချိတ်ဆက်မည်" ကို နှိပ်ပါ သို့မဟုတ် QR Code scan ဖတ်ပါ။',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'ဆာဗာသို့ ချိတ်ဆက်၍ အချက်အလက် ရယူရာတွင် မအောင်မြင်ပါ။',
      });
    } finally {
      setIsSyncingServer(false);
    }
  };

  // 2. Manual Connect using input
  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!anonKey.trim()) {
      setStatusMessage({ type: 'error', text: 'ကျေးဇူးပြု၍ Supabase Project Anon Key ကို ထည့်သွင်းပေးပါ။' });
      return;
    }

    setIsConnecting(true);
    setStatusMessage(null);
    try {
      const cleanUrl = projectUrl.trim();
      const cleanKey = anonKey.trim();
      saveDynamicSupabaseConfig(cleanUrl, cleanKey);
      await refreshSupabaseData();
      setStatusMessage({
        type: 'success',
        text: 'Cloud DB သို့ အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ!',
      });
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Cloud DB သို့ ချိတ်ဆက်ရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါသည်။',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Cloud DB ချိတ်ဆက်မှု</span>
                {isSupabaseConnected ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    Local Mode
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-stone-400">
                iPhone X Standalone POS Cloud Synchronization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border leading-relaxed ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                  : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Cloud className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Target Cloud Database Card */}
          <div className="p-3.5 bg-stone-950/80 border border-stone-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">ရွေးချယ်ထားသော Database:</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                gold-smith-db
              </span>
            </div>
            <div className="text-[11px] font-mono text-stone-400 truncate">
              {projectUrl}
            </div>
          </div>

          {/* Quick Action 1: Auto Sync from Server */}
          <button
            type="button"
            onClick={handleAutoSyncFromServer}
            disabled={isSyncingServer}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <Server className={`w-4 h-4 ${isSyncingServer ? 'animate-spin' : ''}`} />
            <span>
              {isSyncingServer ? 'ဆာဗာမှ ရယူနေပါသည်...' : 'ဆာဗာမှ Cloud DB အချက်အလက် အလိုအလျောက် ရယူမည်'}
            </span>
          </button>

          {/* Quick Action 2: Scan QR with iPhone Camera */}
          <div className="border border-stone-800 rounded-xl p-3.5 bg-stone-950/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>QR Code Scan ဖြင့် ချိတ်ဆက်မည်</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setScannerError(null);
                  setIsScanning(!isScanning);
                }}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/30 cursor-pointer transition flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                <span>{isScanning ? 'Scanner ပိတ်မည်' : 'ကင်မရာဖွင့်မည်'}</span>
              </button>
            </div>

            {isScanning && (
              <div className="space-y-2 pt-1">
                <div
                  id={scannerRegionId}
                  className="w-full max-w-[260px] mx-auto rounded-lg overflow-hidden border border-amber-500/50 bg-black min-h-[220px]"
                />
                <p className="text-[10.5px] text-stone-400 text-center">
                  Desktop စခရင်ပေါ်ရှိ Admin Mobile Sync QR Code သို့မဟုတ် Developer Portal QR Code ကို ထိုးပေးပါ။
                </p>
                {scannerError && (
                  <p className="text-[11px] text-rose-400 text-center bg-rose-950/50 p-2 rounded-lg border border-rose-800/60">
                    {scannerError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Action 3: Direct Anon Key Paste & Connect */}
          <form onSubmit={handleConnect} className="border border-stone-800 rounded-xl p-3.5 bg-stone-950/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Anon Key တိုက်ရိုက် ရိုက်ထည့်မည်</span>
              </label>
            </div>

            <div>
              <input
                type="text"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Supabase Dashboard &gt; Project Settings &gt; API &gt; Anon Key
              </p>
            </div>

            <button
              type="submit"
              disabled={isConnecting || !anonKey.trim()}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 active:bg-stone-900 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/40 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'ချိတ်ဆက်နေပါသည်...' : 'Cloud DB သို့ ချိတ်ဆက်မည်'}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between text-xs">
          {onOpenDeveloperPortal ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDeveloperPortal();
              }}
              className="text-[11px] text-stone-400 hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Developer Portal (SQL / Schema)</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-medium cursor-pointer transition"
          >
            ပိတ်မည်
          </button>
        </div>
      </div>
    </div>
  );
};
