import React, { useState, useEffect, useRef } from 'react';
import {
  Laptop,
  Wifi,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  QrCode,
  Scan,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Product } from '../types/gold';
import { matchProductByBarcode, scannerSounds } from '../services/barcodeService';

interface BarcodeToPcHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestScan: (code: string) => void;
  products: Product[];
}

export const BarcodeToPcHelpModal: React.FC<BarcodeToPcHelpModalProps> = ({
  isOpen,
  onClose,
  onTestScan,
  products,
}) => {
  const [testInput, setTestInput] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [keystrokeLog, setKeystrokeLog] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKeyReceived = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    setLastScannedCode(clean);
    setKeystrokeLog((prev) => [
      `[${new Date().toLocaleTimeString()}] "${clean}"`,
      ...prev.slice(0, 4),
    ]);

    const found = matchProductByBarcode(clean, products);
    setMatchedProduct(found);

    if (found) {
      scannerSounds.playSuccessBeep();
    } else {
      scannerSounds.playErrorBeep();
    }
  };

  const handleApplyToSale = (sku: string) => {
    onTestScan(sku);
    onClose();
  };

  // Sample in-stock products for 1-click test
  const sampleProducts = products
    .filter((p) => p.status === 'In Stock')
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-700 text-stone-100 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  iPhone "Barcode to PC" ချိတ်ဆက်မှု &amp; စကင်စစ်ဆေးခြင်း
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5 animate-pulse" />
                  Listener Active
                </span>
              </div>
              <p className="text-xs text-stone-400">
                iPhone X နှင့် Computer ကြား Barcode အချက်အလက်များ တိုက်ရိုက် စမ်းသပ်စစ်ဆေးရန်
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar-y text-xs sm:text-sm">
          {/* 1. Live Interactive Test Box */}
          <div className="bg-stone-950 border border-amber-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                <Scan className="w-4 h-4 text-amber-400 animate-pulse" />
                အဆင့် (၁) - တိုက်ရိုက် Scan စမ်းသပ်ရန်နေရာ (Live Test Box)
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                Cursor ထားပြီး ဖုန်းဖြင့် Scan ဖတ်ပါ
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
                <QrCode className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  ref={inputRef}
                  type="text"
                  value={testInput}
                  onChange={(e) => {
                    setTestInput(e.target.value);
                  }}
                  placeholder="iPhone Barcode to PC ဖြင့် ဤနေရာသို့ Scan ဖတ်ကြည့်ပါ (ဥပမာ: RIN-15-34)..."
                  className="w-full bg-stone-900 border border-amber-500/50 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
              >
                စမ်းသပ်မည်
              </button>
            </form>

            {/* Test result display */}
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
                  <div className="font-bold flex items-center justify-between">
                    <span>
                      {matchedProduct
                        ? `✓ ပစ္စည်း အောင်မြင်စွာ တွေ့ရှိပါသည်!`
                        : `❌ စကင်ကုတ် ရရှိသော်လည်း စတော့ထဲတွင် ပစ္စည်းမတွေ့ပါ`}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40">
                      Code: "{lastScannedCode}"
                    </span>
                  </div>
                  {matchedProduct ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-emerald-200">
                        {matchedProduct.name} [{matchedProduct.sku}] - (Status: {matchedProduct.status})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyToSale(matchedProduct.sku)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        အရောင်းထဲထည့်မည် &rarr;
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">
                      ဖုန်းမှ စာလုံးများ ကွန်ပျူတာသို့ ရောက်ရှိနေသော်လည်း ရွှေထည် SKU နာမည် မကိုက်ညီခြင်း ဖြစ်ပါသည်။ အောက်ပါ နမူနာ စတော့ကုတ်များကို စမ်းသပ်ကြည့်နိုင်ပါသည်။
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. One-click Quick Test Buttons */}
          <div className="space-y-2">
            <span className="font-bold text-stone-200 text-xs flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-amber-400" />
              အသင့်ရှိသော စတော့ပစ္စည်း ကုတ်များဖြင့် စမ်းသပ်ရန် (1-Click Test):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sampleProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyToSale(p.sku)}
                  className="flex items-center justify-between p-2.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 hover:border-amber-500/50 rounded-xl text-left transition-colors cursor-pointer group"
                >
                  <div className="truncate pr-2">
                    <span className="font-mono font-bold text-amber-400 text-xs block">
                      [{p.sku}]
                    </span>
                    <span className="text-[11px] text-stone-300 truncate block">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold shrink-0 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                    စမ်းသပ်မည်
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Essential Troubleshooting Checklist */}
          <div className="space-y-2.5 pt-2 border-t border-stone-800">
            <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              iPhone X Barcode to PC အလုပ်မလုပ်ရခြင်း အဓိက အကြောင်းရင်း ၄ ချက်:
            </h4>

            <div className="space-y-2 text-stone-300 text-xs">
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                  ၁
                </div>
                <div>
                  <strong className="text-white block">ကွန်ပျူတာ Browser မျက်နှာပြင်ကို အရင် Click ထားပါ (အရေးကြီးဆုံး)</strong>
                  <span className="text-stone-400 text-[11px] leading-relaxed">
                    Barcode to PC app သည် keyboard စာလုံးရိုက်ပေးသည့် နည်းပညာဖြစ်သောကြောင့် ကွန်ပျူတာပေါ်ရှိ ဤ Chrome / Browser မျက်နှာပြင်ပေါ်တွင် mouse ဖြင့် တစ်ချက် click နှိပ်ထားပေးရပါမည်။
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                  ၂
                </div>
                <div>
                  <strong className="text-white block">iPhone app တွင် "Enter" (သို့မဟုတ် Append Enter) ထည့်ထားရန်</strong>
                  <span className="text-stone-400 text-[11px] leading-relaxed">
                    iPhone ပေါ်ရှိ Barcode to PC app &gt; <strong>Settings &gt; Output</strong> (သို့မဟုတ် <strong>Components</strong>) သို့သွား၍ [Barcode] အောက်တွင် <strong>[Enter]</strong> key ပါဝင်နေစေရန် စစ်ဆေးပါ။ (ယခု POS မှ Enter မပါလျှင်လည်း ၄၀၀ မီလီစက္ကန့်အတွင်း auto ဖမ်းယူနိုင်အောင် ပြင်ဆင်ပေးထားပါသည်)။
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                  ၃
                </div>
                <div>
                  <strong className="text-white block">ကွန်ပျူတာ Keyboard Input Language</strong>
                  <span className="text-stone-400 text-[11px] leading-relaxed">
                    ကွန်ပျူတာတွင် မြန်မာစာလက်ကွက်ဖြစ်နေပါကလည်း စနစ်မှ auto ပြောင်းလဲပေးပါမည်။ သို့သော် အကောင်းဆုံးမှာ ကွန်ပျူတာ၏ လက်ကွက်ကို <strong>English (US)</strong> သို့ ထားရှိခြင်း ဖြစ်ပါသည်။
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                  ၄
                </div>
                <div>
                  <strong className="text-white block">Wi-Fi Router ကွန်ရက် တူညီမှု</strong>
                  <span className="text-stone-400 text-[11px] leading-relaxed">
                    iPhone နှင့် Computer နှစ်ခုစလုံးသည် တူညီသော Wi-Fi Router ကွန်ရက်တွင် ချိတ်ဆက်ထားရပါမည်။ ကွန်ပျူတာရှိ Barcode to PC Desktop Server တွင် <strong>Connected (အစိမ်းရောင်)</strong> ပြနေရပါမည်။
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 flex items-center justify-between bg-stone-950/80">
          <span className="text-[11px] text-stone-400">
            စတော့ထဲရှိ စတစ်ကာနမူနာများကို "အထည်စာရင်း" tab ရှိ Barcode Label ဖြင့် ပရင့်ထုတ်နိုင်ပါသည်
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            ပိတ်မည်
          </button>
        </div>
      </div>
    </div>
  );
};
