import React, { useState, useEffect } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { Product } from '../types/gold';
import {
  formatWeightMm,
  formatWeightEn,
  getPurityLabel,
  formatMMK,
  formatNumber,
} from '../services/calculationEngine';
import {
  buildJewelryLabelData,
  JewelryLabelData,
} from '../services/barcodeService';
import {
  Printer,
  X,
  Tag,
  Check,
  QrCode,
  Layers,
  Sparkles,
  Info,
  Sliders,
} from 'lucide-react';

export type LabelFormat = 'barbell' | 'compact' | 'standard';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const { settings } = useGoldShop();
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('compact');
  const [copies, setCopies] = useState<number>(1);
  const [showMakingCharge, setShowMakingCharge] = useState<boolean>(true);
  const [labelDataList, setLabelDataList] = useState<JewelryLabelData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Generate barcodes and QR codes for all products
  useEffect(() => {
    if (!isOpen || products.length === 0) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all(products.map((p) => buildJewelryLabelData(p, settings))).then(
      (results) => {
        if (isMounted) {
          setLabelDataList(results);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [isOpen, products, settings]);

  if (!isOpen || products.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      {/* Container - hide during print so only printable section is rendered */}
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:m-0 print:border-none print:shadow-none print:max-h-none print:bg-white print:text-black">
        {/* Header - Not printed */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950/70 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  ရွှေထည် Barcode &amp; QR Code စတစ်ကာ ရိုက်ထုတ်ခြင်း
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {products.length} ထည်
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Jewelry Tag &amp; Sticker Label ပုံစံများ (Thermal / Barcode Printer အဆင်သင့်)
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

        {/* Configuration Toolbar - Not printed */}
        <div className="p-4 bg-stone-950/40 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-4 text-xs print:hidden shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-semibold text-stone-300">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>စတစ်ကာ ပုံစံ:</span>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => setLabelFormat('compact')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  labelFormat === 'compact'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                အသေးစား (38x25mm)
              </button>

              <button
                type="button"
                onClick={() => setLabelFormat('barbell')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  labelFormat === 'barbell'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                ကြိုးပါ Barbell Tag (70x12mm)
              </button>

              <button
                type="button"
                onClick={() => setLabelFormat('standard')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  labelFormat === 'standard'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                စံချိန်မီ (50x30mm)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMakingCharge}
                onChange={(e) => setShowMakingCharge(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span className="text-stone-300">လက်ခဖော်ပြမည်</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">စောင်ရေ:</span>
              <select
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
                className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-white text-xs font-mono focus:outline-none"
              >
                <option value={1}>၁ ရွက်စီ</option>
                <option value={2}>၂ ရွက်စီ</option>
                <option value={3}>၃ ရွက်စီ</option>
                <option value={5}>၅ ရွက်စီ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Printable & Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-950 print:bg-white print:p-0 print:overflow-visible">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-400">
                Barcode နှင့် QR Code စတစ်ကာများ ထုတ်လုပ်နေပါသည်...
              </p>
            </div>
          ) : (
            <div id="jewelry-sticker-print-area" className="space-y-4 print:space-y-0">
              <div className="text-[11px] text-stone-400 pb-2 print:hidden flex items-center justify-between">
                <span>စတစ်ကာ နမူနာ (Live Preview - {labelDataList.length * copies} Labels)</span>
                <span className="text-amber-400 font-mono">
                  Thermal Label Printer တွင် တိုက်ရိုက် Print ထုတ်ရန် အသင့်ဖြစ်ပါသည်
                </span>
              </div>

              {/* Grid of Stickers */}
              <div
                className={`grid gap-4 print:gap-1.5 justify-center ${
                  labelFormat === 'barbell'
                    ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-2'
                }`}
              >
                {labelDataList.flatMap((item, itemIdx) =>
                  Array.from({ length: copies }).map((_, copyIdx) => (
                    <div
                      key={`${item.product.id}-${itemIdx}-${copyIdx}`}
                      className="print:break-inside-avoid"
                    >
                      {/* 1. COMPACT JEWELRY TAG (38x25mm / 40x25mm) */}
                      {labelFormat === 'compact' && (
                        <div className="w-[280px] bg-white text-black p-2.5 rounded-lg border border-stone-300 shadow-md print:shadow-none print:border-black font-sans leading-tight mx-auto flex flex-col justify-between h-[175px]">
                          {/* Top Row: Shop Name & SKU */}
                          <div className="flex items-center justify-between border-b border-black pb-1">
                            <span className="font-extrabold text-[11px] truncate max-w-[170px]">
                              {item.shopName}
                            </span>
                            <span className="font-mono font-black text-[11px] bg-black text-white px-1.5 py-0.2 rounded">
                              {item.product.sku}
                            </span>
                          </div>

                          {/* Middle: Barcode & QR Code */}
                          <div className="flex items-center justify-between gap-1 my-1">
                            <div className="flex-1 flex flex-col items-center">
                              {item.barcodeDataUrl ? (
                                <img
                                  src={item.barcodeDataUrl}
                                  alt={item.product.sku}
                                  className="h-8 max-w-full object-contain"
                                />
                              ) : (
                                <div className="h-8 font-mono text-[9px] flex items-center">
                                  {item.product.sku}
                                </div>
                              )}
                              <span className="font-mono text-[9.5px] font-bold tracking-widest text-center mt-0.5">
                                *{item.product.sku}*
                              </span>
                            </div>

                            {item.qrCodeDataUrl && (
                              <div className="shrink-0 pl-1 border-l border-stone-300">
                                <img
                                  src={item.qrCodeDataUrl}
                                  alt="QR"
                                  className="w-10 h-10 object-contain"
                                />
                              </div>
                            )}
                          </div>

                          {/* Bottom: Item Details */}
                          <div className="border-t border-black pt-1 space-y-0.5 text-[10px]">
                            <div className="flex items-center justify-between font-bold">
                              <span className="truncate max-w-[160px]">{item.product.name}</span>
                              <span className="text-[10px] bg-stone-100 px-1 rounded border border-stone-400 font-extrabold shrink-0">
                                {getPurityLabel(item.product.purity)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between font-extrabold text-[10.5px]">
                              <span>ရွှေချိန်: {formatWeightMm(item.product.weight)}</span>
                              {showMakingCharge && item.product.makingCharge > 0 && (
                                <span className="font-mono text-[9.5px]">
                                  လက်ခ: {formatNumber(item.product.makingCharge)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. JEWELRY BARBELL / DUMBBELL TAG (70x12mm Foldable Tag) */}
                      {labelFormat === 'barbell' && (
                        <div className="w-[340px] bg-white text-black p-2 rounded-lg border border-stone-300 shadow-md print:shadow-none print:border-black font-sans leading-tight mx-auto flex items-center justify-between h-[100px] relative">
                          {/* Left Flap */}
                          <div className="w-[42%] flex flex-col justify-between h-full pr-1.5 border-r border-dashed border-stone-400">
                            <div className="font-black text-[10px] truncate">{item.shopName}</div>
                            {item.barcodeDataUrl && (
                              <img
                                src={item.barcodeDataUrl}
                                alt={item.product.sku}
                                className="h-6 w-full object-contain my-0.5"
                              />
                            )}
                            <div className="font-mono text-[9px] font-black tracking-wider text-center">
                              {item.product.sku}
                            </div>
                          </div>

                          {/* Middle Narrow Tail (Folds around ring/jewelry) */}
                          <div className="w-[14%] flex flex-col items-center justify-center text-center px-0.5">
                            <span className="text-[7.5px] uppercase font-mono text-stone-500 rotate-90 whitespace-nowrap">
                              FOLD HERE
                            </span>
                          </div>

                          {/* Right Flap */}
                          <div className="w-[44%] flex flex-col justify-between h-full pl-1.5 border-l border-dashed border-stone-400 text-[9.5px]">
                            <div className="flex items-center justify-between font-bold">
                              <span className="truncate">{item.product.name}</span>
                            </div>
                            <div className="font-black text-[10px]">
                              {getPurityLabel(item.product.purity)}
                            </div>
                            <div className="font-extrabold text-[9.5px]">
                              {formatWeightMm(item.product.weight)}
                            </div>
                            {showMakingCharge && item.product.makingCharge > 0 && (
                              <div className="font-mono text-[8.5px] text-stone-700">
                                လက်ခ: {formatNumber(item.product.makingCharge)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3. STANDARD JEWELRY LABEL (50x30mm) */}
                      {labelFormat === 'standard' && (
                        <div className="w-[300px] bg-white text-black p-3 rounded-lg border border-stone-300 shadow-md print:shadow-none print:border-black font-sans leading-tight mx-auto flex flex-col justify-between h-[195px]">
                          {/* Header */}
                          <div className="flex items-center justify-between border-b-2 border-black pb-1">
                            <div>
                              <div className="font-black text-xs leading-none">
                                {item.shopName}
                              </div>
                              {item.phone && (
                                <div className="text-[8.5px] font-mono text-stone-600">
                                  {item.phone}
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-black text-xs bg-black text-white px-2 py-0.5 rounded">
                              {item.product.sku}
                            </span>
                          </div>

                          {/* Center: Barcode & QR Code */}
                          <div className="flex items-center justify-between gap-2 my-1">
                            <div className="flex-1 flex flex-col items-center">
                              {item.barcodeDataUrl && (
                                <img
                                  src={item.barcodeDataUrl}
                                  alt={item.product.sku}
                                  className="h-10 max-w-full object-contain"
                                />
                              )}
                              <span className="font-mono text-[10px] font-black tracking-widest text-center mt-0.5">
                                {item.product.sku}
                              </span>
                            </div>

                            {item.qrCodeDataUrl && (
                              <img
                                src={item.qrCodeDataUrl}
                                alt="QR"
                                className="w-12 h-12 object-contain border border-stone-300 p-0.5 rounded"
                              />
                            )}
                          </div>

                          {/* Footer Details */}
                          <div className="border-t-2 border-black pt-1 space-y-1 text-[10.5px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold truncate max-w-[180px]">
                                {item.product.name}
                              </span>
                              <span className="font-extrabold text-[10.5px] bg-stone-100 px-1.5 py-0.5 rounded border border-black">
                                {getPurityLabel(item.product.purity)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between font-black text-xs">
                              <span>ရွှေချိန်: {formatWeightMm(item.product.weight)}</span>
                              {showMakingCharge && item.product.makingCharge > 0 && (
                                <span className="font-mono text-[10px] font-bold text-stone-800">
                                  လက်ခ: {formatNumber(item.product.makingCharge)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions - Not printed */}
        <div className="p-4 sm:p-5 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-950/80 shrink-0 print:hidden">
          <div className="text-xs text-stone-400">
            စတစ်ကာ စုစုပေါင်း <strong>{products.length * copies} ရွက်</strong> ပရင့်ထုတ်မည်
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              ပိတ်မည်
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>စတစ်ကာ ပရင့်ထုတ်မည် (Print Sticker Labels)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
