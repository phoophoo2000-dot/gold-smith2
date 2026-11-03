import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  AlertTriangle,
  QrCode,
  Scan,
  RefreshCw,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Image,
  CheckCircle2,
  Settings,
  Plug,
  Wifi,
  Volume2,
  Check,
  Laptop,
  Play,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useGoldShop } from '../context/GoldShopContext';
import { scannerSounds, matchProductByBarcode } from '../services/barcodeService';
import { Product } from '../types/gold';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const { products, settings, updateSettings } = useGoldShop();

  // Mode: 'hardware_scanner' (default recommended for production) or 'camera_scanner'
  const [activeTab, setActiveTab] = useState<'hardware_scanner' | 'camera_scanner'>('hardware_scanner');

  // Hardware Scanner Settings
  const [scannerSuffix, setScannerSuffix] = useState<'ENTER' | 'TAB' | 'NONE'>(
    settings.scannerSuffix || 'ENTER'
  );
  const [scannerBeep, setScannerBeep] = useState<boolean>(
    settings.scannerBeep !== undefined ? settings.scannerBeep : true
  );
  const [scannerType, setScannerType] = useState<
    'USB_GUN' | 'WIRELESS_24G' | 'BLUETOOTH' | 'BARCODE_TO_PC'
  >(settings.scannerType || 'USB_GUN');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Live Test Box States
  const [testInput, setTestInput] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [detectedSuffix, setDetectedSuffix] = useState<string>('Enter (CR)');
  const [showHardwareGuide, setShowHardwareGuide] = useState<boolean>(true);

  // Camera Scanner States
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string>('');
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const testInputRef = useRef<HTMLInputElement | null>(null);

  // Focus test input when opened
  useEffect(() => {
    if (isOpen && activeTab === 'hardware_scanner') {
      setTimeout(() => {
        testInputRef.current?.focus();
      }, 120);
    }
  }, [isOpen, activeTab]);

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsCameraScanning(false);
  };

  const startCamera = async () => {
    setIsCameraInitializing(true);
    setCameraErrorMsg('');

    try {
      await stopCameraScanner();

      const readerElementId = 'html5qr-code-modal-region';
      const el = document.getElementById(readerElementId);
      if (!el) {
        throw new Error('Scanner container not ready');
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxWidth = Math.max(220, Math.floor(minEdge * 0.78));
          const boxHeight = Math.max(130, Math.floor(boxWidth * 0.55));
          return { width: boxWidth, height: boxHeight };
        },
        aspectRatio: 1.333334,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          const cleanCode = decodedText.trim();
          if (cleanCode) {
            scannerSounds.playSuccessBeep();
            onDetected(cleanCode);
            stopCameraScanner().finally(() => {
              onClose();
            });
          }
        },
        () => {}
      );

      setIsCameraScanning(true);
      setIsCameraInitializing(false);
    } catch (err: any) {
      setIsCameraScanning(false);
      setIsCameraInitializing(false);
      const errStr = (err?.name || err?.message || String(err)).toLowerCase();

      if (errStr.includes('notallowed') || errStr.includes('denied') || errStr.includes('permission')) {
        setCameraErrorMsg('စက်၏ ကင်မရာ ခွင့်ပြုချက် (Permission) ပိတ်ထားပါသည်');
      } else if (errStr.includes('notfound') || errStr.includes('no camera')) {
        setCameraErrorMsg('ကွန်ပျူတာ/စက်တွင် ကင်မရာ ရှာမတွေ့ပါ');
      } else {
        setCameraErrorMsg('ကင်မရာ ချိတ်ဆက်၍ မရနိုင်ပါ (Hardware Barcode Gun သုံးရန် အကြံပြုပါသည်)');
      }
    }
  };

  // Clean up camera on close
  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
    }
  }, [isOpen]);

  // Handle saving scanner settings
  const handleSaveScannerSettings = () => {
    updateSettings({
      scannerSuffix,
      scannerBeep,
      scannerType,
    });
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  // Test scan submission
  const handleTestKeyReceived = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    setLastScannedCode(clean);
    const found = matchProductByBarcode(clean, products);
    setMatchedProduct(found);

    if (found) {
      if (scannerBeep) scannerSounds.playSuccessBeep();
    } else {
      if (scannerBeep) scannerSounds.playErrorBeep();
    }
  };

  const handleApplyToSale = (sku: string) => {
    onDetected(sku);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      scannerSounds.playSuccessBeep();
      onDetected(manualCode.trim());
      onClose();
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCameraInitializing(true);
      setCameraErrorMsg('');

      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('html5qr-code-modal-region');
        html5QrCodeRef.current = scanner;
      }

      const decodedResult = await scanner.scanFile(file, true);
      if (decodedResult) {
        scannerSounds.playSuccessBeep();
        onDetected(decodedResult.trim());
        onClose();
      }
    } catch {
      setCameraErrorMsg('ရိုက်ထားသော ဓာတ်ပုံထဲမှ Barcode/QR ကို မဖတ်နိုင်ပါ');
    } finally {
      setIsCameraInitializing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Barcode Scanner &amp; စကင်နာ ဆက်တင်များ
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Production Ready
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                ရွှေထည်ဆိုင်သုံး Barcode Scanner Gun ဆက်တင်များနှင့် စကင်စစ်ဆေးခြင်း
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Hardware Scanner vs Camera/Photo */}
        <div className="flex border-b border-stone-800 bg-stone-950/60 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('hardware_scanner');
              stopCameraScanner();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'hardware_scanner'
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Plug className="w-4 h-4" />
            <span>🔫 Barcode Scanner Gun ဆက်တင် (Hardware)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('camera_scanner');
              startCamera();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'camera_scanner'
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>📷 ကင်မရာ / ဓာတ်ပုံ Scan</span>
          </button>
        </div>

        {/* Modal Body Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar-y text-xs sm:text-sm">
          {activeTab === 'hardware_scanner' ? (
            /* TAB 1: HARDWARE BARCODE SCANNER SETTINGS & DIAGNOSTICS (REPLACES SAFARI) */
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    Hardware Scanner ချိတ်ဆက်မှု အဆင်သင့်ဖြစ်နေပါသည် (USB / Wireless Plug &amp; Play)
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  HID Keyboard
                </span>
              </div>

              {/* 1. Live Interactive Test Scanner Box */}
              <div className="bg-stone-950 border border-amber-500/40 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Scan className="w-4 h-4 text-amber-400 animate-pulse" />
                    စကင်ဖတ် စမ်းသပ်ရန်နေရာ (Live Scanner Test Box):
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Cursor ထားပြီး Barcode Gun ဖြင့် Scan ဖတ်ပါ
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTestKeyReceived(testInput);
                    setTestInput('');
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <QrCode className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                    <input
                      ref={testInputRef}
                      type="text"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Barcode Gun ဖြင့် ဤနေရာသို့ ချိန်၍ ဖတ်ကြည့်ပါ (ဥပမာ: RNG-15-01)..."
                      className="w-full bg-stone-900 border border-amber-500/50 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    စမ်းသပ်မည်
                  </button>
                </form>

                {/* Match Result Preview */}
                {lastScannedCode && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      matchedProduct
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                    }`}
                  >
                    {matchedProduct ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="font-bold flex items-center justify-between text-xs">
                        <span>
                          {matchedProduct
                            ? `✓ ရွှေထည်ပစ္စည်း အောင်မြင်စွာ တွေ့ရှိပါသည်!`
                            : `❌ စကင်ကုတ် ရရှိသော်လည်း စတော့ထဲတွင် ပစ္စည်းမတွေ့ပါ`}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/50 text-amber-300">
                          Code: "{lastScannedCode}"
                        </span>
                      </div>
                      {matchedProduct ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-emerald-200">
                          <div>
                            <span className="font-bold text-white">{matchedProduct.name}</span>
                            <span className="text-[11px] text-stone-300 ml-1.5 font-mono">
                              [{matchedProduct.sku}]
                            </span>
                            <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-emerald-500/20 rounded font-semibold text-emerald-300">
                              Status: {matchedProduct.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyToSale(matchedProduct.sku)}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold rounded-lg text-xs cursor-pointer shadow-sm transition-colors"
                          >
                            အရောင်းထဲထည့်မည် &rarr;
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-rose-300/90 leading-relaxed">
                          စကင်ဖတ်စက်မှ စာလုံးများ ကွန်ပျူတာသို့ ရောက်ရှိနေပါပြီ။ စတော့ထဲရှိ SKU နာမည် (ဥပမာ: RNG-15-01) နှင့် ကိုက်ညီမှုရှိမရှိ စစ်ဆေးပါ။
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Hardware Barcode Scanner Settings Card */}
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-amber-400" />
                    Barcode Scanner သတ်မှတ်ချက်များ (Scanner Settings)
                  </span>
                  {saveSuccessMsg && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ✓ သိမ်းဆည်းပြီးပါပြီ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Scanner Device Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                      ချိတ်ဆက်မှု အမျိုးအစား (Device Type)
                    </label>
                    <select
                      value={scannerType}
                      onChange={(e) => setScannerType(e.target.value as any)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="USB_GUN">🔌 USB Barcode Gun (ကြိုးတပ်စကင်နာ)</option>
                      <option value="WIRELESS_24G">📶 2.4GHz Wireless Dongle Gun (ကြိုးမဲ့စကင်နာ)</option>
                      <option value="BLUETOOTH">🔵 Bluetooth Barcode Scanner</option>
                      <option value="BARCODE_TO_PC">📱 Mobile App (Barcode to PC Wi-Fi)</option>
                    </select>
                  </div>

                  {/* Suffix / Terminator */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                      အဆုံးသတ်ကုတ် (Suffix / Terminator)
                    </label>
                    <select
                      value={scannerSuffix}
                      onChange={(e) => setScannerSuffix(e.target.value as any)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="ENTER">Enter Key (CR / LF) - အကြံပြုထားသည်</option>
                      <option value="TAB">Tab Key</option>
                      <option value="NONE">None (စနစ်မှ Auto အသိအမှတ်ပြုမည်)</option>
                    </select>
                  </div>
                </div>

                {/* Beep sound toggle */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={scannerBeep}
                      onChange={(e) => setScannerBeep(e.target.checked)}
                      className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>စကင်ဖတ် အောင်မြင်ပါက အသံမြည်စေမည် (Beep Sound)</span>
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveScannerSettings}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    ဆက်တင် သိမ်းဆည်းမည်
                  </button>
                </div>
              </div>

              {/* 3. Detailed Hardware Scanner Setup Guide (Replaces Safari Guide) */}
              <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 text-left space-y-2">
                <button
                  type="button"
                  onClick={() => setShowHardwareGuide(!showHardwareGuide)}
                  className="w-full flex items-center justify-between font-bold text-amber-400 text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-amber-400" />
                    <span>📖 စက်ရုံထုတ် Barcode Scanner Gun ဆက်တင် ချိန်ညှိနည်း လမ်းညွှန်:</span>
                  </div>
                  {showHardwareGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showHardwareGuide && (
                  <div className="space-y-2 text-[11.5px] text-stone-300 leading-relaxed pt-2 border-t border-stone-800/80">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px] leading-relaxed">
                      <strong>💡 အကြံပြုချက်:</strong> ရွှေထည်ဆိုင်များတွင် သေးငယ်သော Rat-tail / Barbell ရွှေထည်စတစ်ကာများကို ဖတ်ရာ၌ ဖုန်းကင်မရာ (Safari) သုံးမည့်အစား <strong>USB / 2.4G Laser Barcode Scanner Gun</strong> ကို အသုံးပြုခြင်းသည် အမြန်ဆုံးနှင့် အတိကျဆုံး နည်းလမ်းဖြစ်ပါသည်။
                    </div>

                    <ol className="list-decimal list-inside space-y-2 text-stone-300 pt-1">
                      <li>
                        <strong className="text-white">USB / Wireless Dongle တပ်ဆင်ခြင်း:</strong>
                        <span className="block text-stone-400 pl-4 text-[11px]">
                          စကင်ဖတ်စက်၏ USB ကြိုး (သို့မဟုတ် Wireless USB receiver) ကို ကွန်ပျူတာတွင် တပ်ဆင်ပါ။ Driver သီးသန့်သွင်းရန် မလိုဘဲ Plug &amp; Play အဖြစ် စာလုံးများ တန်းရိုက်ပေးမည်ဖြစ်ပါသည်။
                        </span>
                      </li>
                      <li>
                        <strong className="text-white">Scanner Manual မှ "Add Enter Suffix (CR)" Barcode ဖတ်ခြင်း:</strong>
                        <span className="block text-stone-400 pl-4 text-[11px]">
                          စကင်ဖတ်စက် ဝယ်ယူစဉ်ပါရှိသော စာအုပ်ငယ်ထဲမှ <strong>"Add Enter Suffix / Carriage Return"</strong> barcode ကို scan တစ်ချက် ဖတ်ပေးထားပါက barcode ဖတ်ပြီးသည်နှင့် အလိုအလျောက် Enter ကျပြီး အရောင်းစာရင်းထဲသို့ တန်းရောက်သွားမည်ဖြစ်ပါသည်။
                        </span>
                      </li>
                      <li>
                        <strong className="text-white">ကွန်ပျူတာ Keyboard Input Language:</strong>
                        <span className="block text-stone-400 pl-4 text-[11px]">
                          ကွန်ပျူတာ၏ လက်ကွက်ကို <strong>English (US)</strong> သို့ ထားရှိပေးပါ။ (စနစ်မှ မြန်မာစာလက်ကွက် ဖြစ်နေပါကလည်း auto ပြောင်းလဲပေးနိုင်အောင် စီစဉ်ထားပါသည်)။
                        </span>
                      </li>
                      <li>
                        <strong className="text-white">POS တွင် Cursor ထားရန် မလိုဘဲ အသင့်ဖတ်နိုင်ခြင်း:</strong>
                        <span className="block text-stone-400 pl-4 text-[11px]">
                          POS အရောင်းစာမျက်နှာကို ဖွင့်ထားရုံဖြင့် Barcode Gun ဖြင့် ပစ္စည်းစတစ်ကာများကို ဆက်တိုက် Scan ဖတ်၍ ဘောက်ချာ ထုတ်နိုင်ပါသည်။
                        </span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: CAMERA / PHOTO SCANNER */
            <div className="space-y-3.5">
              <div className="relative bg-black rounded-xl overflow-hidden min-h-[240px] flex flex-col items-center justify-center border border-stone-800">
                <div
                  id="html5qr-code-modal-region"
                  className={`w-full ${cameraErrorMsg ? 'hidden' : 'block'} text-stone-300 text-xs`}
                  style={{ width: '100%' }}
                />

                {isCameraInitializing && !cameraErrorMsg && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-stone-300 gap-2.5 z-10">
                    <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                    <p className="text-xs font-semibold">ကင်မရာကို ချိတ်ဆက်ဖွင့်လှစ်နေပါသည်...</p>
                  </div>
                )}

                {cameraErrorMsg && (
                  <div className="p-5 text-center space-y-3 text-xs text-stone-200">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-400 text-sm">{cameraErrorMsg}</h4>
                      <p className="text-stone-400 text-[11px] mt-1">
                        ကင်မရာဖြင့် ဖတ်မရပါက အထက်ပါ <strong>"Barcode Scanner Gun"</strong> သို့မဟုတ် အောက်ပါ <strong>"ဓာတ်ပုံရိုက်၍ ဖတ်မည်"</strong> ကို အသုံးပြုနိုင်ပါသည်။
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-colors"
                      >
                        ပြန်လည်စတင်မည်
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        ဓာတ်ပုံရွေးမည်
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>ကင်မရာ ပြန်စမည်</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Image className="w-3.5 h-3.5 text-amber-400" />
                    <span>ဓာတ်ပုံရိုက်၍ ဖတ်မည်</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileScan}
                  />
                </div>

                <span className="text-[11px] text-stone-400">
                  ရွှေထည်စတစ်ကာကို ကင်မရာရှေ့ ကပ်ပေးပါ
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Manual Barcode / SKU Input Backup */}
        <div className="p-3.5 bg-stone-950 border-t border-stone-800 space-y-1.5 shrink-0">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="SKU / Barcode တိုက်ရိုက်ရိုက်ထည့်ရန် (ဥပမာ: RNG-15-01, RIN-15-34)"
              className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer shrink-0 transition-colors"
            >
              ထည့်မည်
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
