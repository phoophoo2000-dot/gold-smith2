import React, { useState } from 'react';
import { GoldWeight } from '../types/gold';
import {
  weightToTotalPe,
  weightToKyatDecimal,
  weightToGrams,
  gramsToWeight,
  formatWeightMm,
} from '../services/calculationEngine';
import { Scale, ArrowRightLeft } from 'lucide-react';

interface WeightInputProps {
  value: GoldWeight;
  onChange: (newWeight: GoldWeight) => void;
  label?: string;
  allowQuickAdjust?: boolean;
  compact?: boolean;
}

export const WeightInput: React.FC<WeightInputProps> = ({
  value,
  onChange,
  label = 'ရွှေအလေးချိန် (Weight)',
  allowQuickAdjust = true,
  compact = false,
}) => {
  const [inputMode, setInputMode] = useState<'kpy' | 'grams'>('kpy');
  const [gramInput, setGramInput] = useState<string>('');

  const currentWeight: GoldWeight = value || { kyat: 0, pe: 0, yway: 0 };

  const handleKyatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const kyat = Math.max(0, parseInt(e.target.value, 10) || 0);
    onChange({ ...currentWeight, kyat });
  };

  const handlePeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pe = Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0));
    onChange({ ...currentWeight, pe });
  };

  const handleYwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const yway = Math.max(0, Math.min(7.99, parseFloat(e.target.value) || 0));
    onChange({ ...currentWeight, yway });
  };

  const handleGramConvert = (gVal: string) => {
    setGramInput(gVal);
    const num = parseFloat(gVal);
    if (!isNaN(num) && num >= 0) {
      const converted = gramsToWeight(num);
      onChange(converted);
    }
  };

  const adjustPe = (delta: number) => {
    let totalPe = currentWeight.kyat * 16 + currentWeight.pe + delta;
    if (totalPe < 0) totalPe = 0;
    const kyat = Math.floor(totalPe / 16);
    const pe = totalPe % 16;
    onChange({ ...currentWeight, kyat, pe });
  };

  const adjustYway = (delta: number) => {
    let totalYway = (currentWeight.kyat * 16 + currentWeight.pe) * 8 + currentWeight.yway + delta;
    if (totalYway < 0) totalYway = 0;
    const kyat = Math.floor(totalYway / 128);
    const remKyat = totalYway % 128;
    const pe = Math.floor(remKyat / 8);
    const yway = Number((remKyat % 8).toFixed(2));
    onChange({ kyat, pe, yway });
  };

  const clearWeight = () => {
    onChange({ kyat: 0, pe: 0, yway: 0 });
    setGramInput('');
  };

  const totalPe = weightToTotalPe(currentWeight);
  const kyatDec = weightToKyatDecimal(currentWeight);
  const grams = weightToGrams(currentWeight);

  if (compact) {
    return (
      <div className="space-y-1">
        {label && <label className="text-xs font-semibold text-stone-700">{label}</label>}
        <div className="grid grid-cols-3 gap-1">
          <div className="relative">
            <input
              type="number"
              min="0"
              value={currentWeight.kyat || ''}
              placeholder="0"
              onChange={handleKyatChange}
              className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-sm text-right pr-6 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <span className="absolute right-1.5 top-1.5 text-xs text-stone-600 font-medium">ကျပ်</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="15"
              value={currentWeight.pe || ''}
              placeholder="0"
              onChange={handlePeChange}
              className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-sm text-right pr-5 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <span className="absolute right-1.5 top-1.5 text-xs text-stone-600 font-medium">ပဲ</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="7.99"
              step="0.5"
              value={currentWeight.yway || ''}
              placeholder="0"
              onChange={handleYwayChange}
              className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-sm text-right pr-6 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <span className="absolute right-1.5 top-1.5 text-xs text-stone-600 font-medium">ရွေး</span>
          </div>
        </div>
        <div className="text-[11px] text-amber-800 font-medium text-right truncate">
          {formatWeightMm(currentWeight)} ({grams}g)
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-stone-800 font-medium text-sm">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInputMode(inputMode === 'kpy' ? 'grams' : 'kpy')}
            className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-2 py-0.5 rounded transition-colors"
          >
            <ArrowRightLeft className="w-3 h-3" />
            {inputMode === 'kpy' ? 'ဂရမ် (Grams) ဖြင့်ထည့်မည်' : 'ကျပ်/ပဲ/ရွေး ပြောင်းမည်'}
          </button>
          <button
            type="button"
            onClick={clearWeight}
            className="text-xs text-stone-600 hover:text-rose-600 transition-colors"
          >
            ရှင်းမည် (Clear)
          </button>
        </div>
      </div>

      {inputMode === 'kpy' ? (
        <div className="grid grid-cols-3 gap-2">
          {/* Kyat input */}
          <div className="bg-white border border-stone-300 rounded-lg p-2.5 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500 transition-all">
            <span className="block text-xs font-semibold text-stone-600 leading-normal pb-0.5">
              ကျပ်သား (Kyat)
            </span>
            <div className="flex items-baseline mt-1">
              <input
                type="number"
                min="0"
                value={currentWeight.kyat === 0 ? '' : currentWeight.kyat}
                placeholder="0"
                onChange={handleKyatChange}
                className="w-full text-lg font-bold text-stone-900 focus:outline-none placeholder:text-stone-300 leading-normal"
              />
              <span className="text-xs font-bold text-amber-800 ml-1 shrink-0">ကျပ်</span>
            </div>
          </div>

          {/* Pe input */}
          <div className="bg-white border border-stone-300 rounded-lg p-2.5 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500 transition-all">
            <span className="block text-xs font-semibold text-stone-600 leading-normal pb-0.5">
              ပဲ (0 - 15)
            </span>
            <div className="flex items-baseline mt-1">
              <input
                type="number"
                min="0"
                max="15"
                value={currentWeight.pe === 0 ? '' : currentWeight.pe}
                placeholder="0"
                onChange={handlePeChange}
                className="w-full text-lg font-bold text-stone-900 focus:outline-none placeholder:text-stone-300 leading-normal"
              />
              <span className="text-xs font-bold text-amber-800 ml-1 shrink-0">ပဲ</span>
            </div>
          </div>

          {/* Yway input */}
          <div className="bg-white border border-stone-300 rounded-lg p-2.5 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500 transition-all">
            <span className="block text-xs font-semibold text-stone-600 leading-normal pb-0.5">
              ရွေး (0 - 7.9)
            </span>
            <div className="flex items-baseline mt-1">
              <input
                type="number"
                min="0"
                max="7.99"
                step="0.5"
                value={currentWeight.yway === 0 ? '' : currentWeight.yway}
                placeholder="0"
                onChange={handleYwayChange}
                className="w-full text-lg font-bold text-stone-900 focus:outline-none placeholder:text-stone-300 leading-normal"
              />
              <span className="text-xs font-bold text-amber-800 ml-1 shrink-0">ရွေး</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-300 rounded-lg p-3">
          <label className="block text-xs font-semibold text-stone-600 mb-1.5 leading-normal">
            ဂရမ်အလေးချိန် ထည့်ပါ (Input in Grams)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 3.375"
              value={gramInput}
              onChange={(e) => handleGramConvert(e.target.value)}
              className="flex-1 bg-stone-50 border border-stone-300 rounded px-3 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-sm font-semibold text-stone-600">Grams</span>
          </div>
        </div>
      )}

      {/* Quick Adjust Buttons */}
      {allowQuickAdjust && inputMode === 'kpy' && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
          <span className="text-xs text-stone-600 font-medium mr-1 leading-normal">အမြန်ထည့်:</span>
          <button
            type="button"
            onClick={() => adjustPe(1)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-amber-100/70 border border-stone-200 text-stone-700 rounded transition-colors leading-normal"
          >
            +1 ပဲ
          </button>
          <button
            type="button"
            onClick={() => adjustPe(2)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-amber-100/70 border border-stone-200 text-stone-700 rounded transition-colors leading-normal"
          >
            +2 ပဲ
          </button>
          <button
            type="button"
            onClick={() => adjustPe(4)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-amber-100/70 border border-stone-200 text-stone-700 rounded transition-colors leading-normal"
          >
            +1 မတ် (4 ပဲ)
          </button>
          <button
            type="button"
            onClick={() => adjustYway(1)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-amber-100/70 border border-stone-200 text-stone-700 rounded transition-colors leading-normal"
          >
            +1 ရွေး
          </button>
          <button
            type="button"
            onClick={() => adjustYway(2)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-amber-100/70 border border-stone-200 text-stone-700 rounded transition-colors leading-normal"
          >
            +2 ရွေး
          </button>
          <button
            type="button"
            onClick={() => adjustYway(4)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-amber-100/70 border border-stone-200 text-stone-700 rounded transition-colors leading-normal"
          >
            +0.5 ပဲ (4 ရွေး)
          </button>
        </div>
      )}

      {/* Automatic Live Mathematical Conversion Display */}
      <div className="bg-amber-100/60 border border-amber-200/60 rounded-lg px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-amber-950 flex items-center gap-1.5">
          <span>{formatWeightMm(currentWeight)}</span>
        </div>
        <div className="flex items-center gap-3 text-stone-600 font-mono text-[11px]">
          <span>
            = <strong className="text-stone-800">{totalPe}</strong> ပဲ
          </span>
          <span>
            = <strong className="text-stone-800">{kyatDec.toFixed(4)}</strong> ကျပ်သား
          </span>
          <span>
            = <strong className="text-amber-800">{grams}</strong> g
          </span>
        </div>
      </div>
    </div>
  );
};
