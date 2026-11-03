import { GoldWeight, PurityType, SaleItem, ProductCategory, GoldPrice } from '../types/gold';

/**
 * Myanmar Gold Measurement Constants:
 * 1 ကျပ်သား (Kyat) = 16 ပဲ (Pe) = 128 ရွေး (Yway)
 * 1 ပဲ (Pe) = 8 ရွေး (Yway)
 * 1 မတ် (Mat) = 4 ပဲ = 32 ရွေး (Yway)
 * 1 ကျပ်သား = ~16.606 grams
 */
export const YWAY_PER_PE = 8;
export const PE_PER_KYAT = 16;
export const YWAY_PER_KYAT = 128;
export const GRAMS_PER_KYAT = 16.606;

/**
 * Converts a weight object { kyat, pe, yway } to total atomic Yway (ရွေး)
 */
export function weightToTotalYway(w: GoldWeight | undefined | null): number {
  if (!w) return 0;
  const kyat = Number(w.kyat) || 0;
  const pe = Number(w.pe) || 0;
  const yway = Number(w.yway) || 0;
  return kyat * YWAY_PER_KYAT + pe * YWAY_PER_PE + yway;
}

/**
 * Converts total atomic Yway back to normal normalized { kyat, pe, yway }
 * E.g., 130 Yway -> 1 Kyat, 0 Pe, 2 Yway
 */
export function totalYwayToWeight(totalYway: number): GoldWeight {
  const safeYway = Math.max(0, Number(totalYway) || 0);
  const kyat = Math.floor(safeYway / YWAY_PER_KYAT);
  const remainderAfterKyat = safeYway % YWAY_PER_KYAT;
  const pe = Math.floor(remainderAfterKyat / YWAY_PER_PE);
  const yway = Number((remainderAfterKyat % YWAY_PER_PE).toFixed(3));

  return { kyat, pe, yway };
}

/**
 * Converts weight to total Pe (ပဲ) as a decimal
 * E.g. 3 ပဲ 2 ရွေး = 3 + (2/8) = 3.25 ပဲ
 */
export function weightToTotalPe(w: GoldWeight): number {
  const totalYway = weightToTotalYway(w);
  return Number((totalYway / YWAY_PER_PE).toFixed(4));
}

/**
 * Converts weight to decimal Kyat-tha (ကျပ်သား)
 * E.g. 3.25 ပဲ / 16 = 0.203125 ကျပ်သား
 */
export function weightToKyatDecimal(w: GoldWeight): number {
  const totalYway = weightToTotalYway(w);
  return totalYway / YWAY_PER_KYAT;
}

/**
 * Converts weight to Grams (ဂရမ်)
 * 1 Kyat = 16.606 grams
 */
export function weightToGrams(w: GoldWeight): number {
  const kyatDecimal = weightToKyatDecimal(w);
  return Number((kyatDecimal * GRAMS_PER_KYAT).toFixed(3));
}

/**
 * Converts Grams to Myanmar Gold Weight
 */
export function gramsToWeight(grams: number): GoldWeight {
  const kyatDecimal = grams / GRAMS_PER_KYAT;
  const totalYway = kyatDecimal * YWAY_PER_KYAT;
  return totalYwayToWeight(totalYway);
}

/**
 * Add two gold weights
 */
export function addWeights(w1: GoldWeight, w2: GoldWeight): GoldWeight {
  const y1 = weightToTotalYway(w1);
  const y2 = weightToTotalYway(w2);
  return totalYwayToWeight(y1 + y2);
}

/**
 * Subtract w2 from w1 (never negative)
 */
export function subtractWeights(w1: GoldWeight, w2: GoldWeight): GoldWeight {
  const y1 = weightToTotalYway(w1);
  const y2 = weightToTotalYway(w2);
  return totalYwayToWeight(Math.max(0, y1 - y2));
}

/**
 * Formatted string in Myanmar (e.g., "၁ ကျပ် ၂ ပဲ ၄ ရွေး" or "၃ ပဲ ၂ ရွေး")
 */
export function formatWeightMm(w: GoldWeight): string {
  const parts: string[] = [];
  const enToMmDigits = (num: number | string) => {
    const mmDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
    return String(num).replace(/[0-9]/g, (d) => mmDigits[Number(d)] || d);
  };

  if (w.kyat > 0) {
    parts.push(`${enToMmDigits(w.kyat)} ကျပ်`);
  }
  if (w.pe > 0 || (w.kyat === 0 && w.yway === 0)) {
    parts.push(`${enToMmDigits(w.pe)} ပဲ`);
  }
  if (w.yway > 0) {
    parts.push(`${enToMmDigits(w.yway)} ရွေး`);
  }

  return parts.length > 0 ? parts.join(' ') : '၀ ကျပ်';
}

/**
 * Formatted string in English short form (e.g. "1K 2P 4Y" or "3P 2Y")
 */
export function formatWeightEn(w: GoldWeight): string {
  const parts: string[] = [];
  if (w.kyat > 0) parts.push(`${w.kyat}K`);
  if (w.pe > 0 || (w.kyat === 0 && w.yway === 0)) parts.push(`${w.pe}P`);
  if (w.yway > 0) parts.push(`${w.yway}Y`);
  return parts.length > 0 ? parts.join(' ') : '0K';
}

/**
 * Format currency to MMK string with commas
 */
export function formatMMK(amount: number): string {
  const safeAmount = Math.round(Number(amount) || 0);
  return new Intl.NumberFormat('en-US').format(safeAmount) + ' MMK';
}

/**
 * Format currency without suffix for compact displays
 */
export function formatNumber(amount: number): string {
  const safeAmount = Math.round(Number(amount) || 0);
  return new Intl.NumberFormat('en-US').format(safeAmount);
}

/**
 * Purity display details
 */
export const PURITY_CONFIG: Record<string, { labelMm: string; labelEn: string; percentage: number; description: string }> = {
  '16_PE': { labelMm: '၁၆ ပဲရည် (ရွှေစင်)', labelEn: '16 Pe (24K / Pure Gold)', percentage: 99.99, description: 'Academy / 99.99% ရွှေစင်အခေါက်' },
  '15_PE': { labelMm: '၁၅ ပဲရည် (အခေါက်)', labelEn: '15 Pe (Standard Jewelry)', percentage: 93.75, description: 'စံချိန်မီ အခေါက် လက်ဝတ်ရတနာ' },
  '14_PE': { labelMm: '၁၄ ပဲရည်', labelEn: '14 Pe Gold', percentage: 87.5, description: '၁၄ ပဲရည် ရွှေထည်' },
  '13_PE': { labelMm: '၁၃ ပဲရည်', labelEn: '13 Pe Gold', percentage: 81.25, description: '၁၃ ပဲရည် ရွှေထည်' },
  '12_PE': { labelMm: '၁၂ ပဲရည်', labelEn: '12 Pe Gold', percentage: 75.0, description: '၁၂ ပဲရည် (18K)' },
};

export function getPurityLabel(purity: string, lang: 'my' | 'en' = 'my'): string {
  const conf = PURITY_CONFIG[purity];
  if (conf) {
    return lang === 'my' ? conf.labelMm : conf.labelEn;
  }
  return purity;
}

/**
 * Calculation parameters for a sale item
 */
export interface SaleCalculationParams {
  productId?: string;
  sku?: string;
  name: string;
  category?: ProductCategory;
  purity: PurityType;
  actualWeight: GoldWeight;
  wastage: GoldWeight;
  goldPricePerKyat: number;
  makingCharge?: number;
  stoneCharge?: number;
  discount?: number;
}

/**
 * CORE CALCULATION ENGINE: SALES
 * Actual Weight + Wastage (အလျော့တွက်)
 *  = Billable Weight
 *  x Purity Price per Kyat
 *  = Gold Amount
 *  + Making Charge (လက်ခ)
 *  + Stone Charge (ကျောက်ဖိုး)
 *  - Discount (လျှော့ဈေး)
 *  = Grand Total
 */
export function calculateSaleItem(params: SaleCalculationParams): SaleItem {
  const actualWeight = params.actualWeight || { kyat: 0, pe: 0, yway: 0 };
  const wastage = params.wastage || { kyat: 0, pe: 0, yway: 0 };
  const actualTotalYway = weightToTotalYway(actualWeight);
  const isZeroWeight = actualTotalYway <= 0;

  // 1. Billable Weight = Actual Weight + Wastage (if actualWeight is 0, billableWeight is 0)
  const billableWeight = isZeroWeight ? { kyat: 0, pe: 0, yway: 0 } : addWeights(actualWeight, wastage);

  // 2. Billable Weight in Kyat Decimal
  const billableKyatDecimal = isZeroWeight ? 0 : weightToKyatDecimal(billableWeight);

  // 3. Gold Amount = Billable Kyat Decimal * Gold Price Per Kyat
  const goldPricePerKyat = Number(params.goldPricePerKyat) || 0;
  const goldAmount = isZeroWeight ? 0 : Math.round(billableKyatDecimal * goldPricePerKyat);

  // 4. Other Charges
  const makingCharge = Number(params.makingCharge) || 0;
  const stoneCharge = Number(params.stoneCharge) || 0;
  const discount = Number(params.discount) || 0;

  // 5. Total
  const total = isZeroWeight ? 0 : Math.max(0, goldAmount + makingCharge + stoneCharge - discount);

  return {
    id: 'item_' + Math.random().toString(36).substr(2, 9),
    productId: params.productId,
    sku: params.sku,
    name: params.name || 'ရွှေထည်',
    category: params.category || 'Ring',
    purity: params.purity,
    actualWeight,
    wastage,
    billableWeight,
    goldPricePerKyat,
    goldAmount,
    makingCharge,
    stoneCharge,
    discount,
    total,
  };
}

/**
 * Calculate approximate price for 1 Pe
 */
export function calculatePricePerPe(pricePerKyat: number): number {
  return Math.round(pricePerKyat / PE_PER_KYAT);
}

/**
 * Calculate approximate price for 1 Yway
 */
export function calculatePricePerYway(pricePerKyat: number): number {
  return Math.round(pricePerKyat / YWAY_PER_KYAT);
}

/**
 * Rate multiplier based on Pe purity relative to 16 Pe (Base 16)
 */
export function peToKyatRate(pePurity: number, basePrice16: number): number {
  return Math.round((pePurity / 16) * basePrice16);
}

/**
 * CORE CALCULATION ENGINE: GOLD PURCHASE / BUY BACK
 * Gross Weight - Deduction (နုတ်တွက် / အလျော့)
 *  = Net Gold Weight
 *  x Buy Price per Kyat
 *  = Total Payout Amount
 */
export function calculatePurchase(params: {
  grossWeight: GoldWeight;
  deduction: GoldWeight;
  buyPricePerKyat: number;
  purity?: PurityType;
}): {
  netWeight: GoldWeight;
  netKyatDecimal: number;
  totalAmount: number;
} {
  const grossWeight = params.grossWeight || { kyat: 0, pe: 0, yway: 0 };
  const deduction = params.deduction || { kyat: 0, pe: 0, yway: 0 };
  
  const netWeight = subtractWeights(grossWeight, deduction);
  const netKyatDecimal = weightToKyatDecimal(netWeight);
  const buyPricePerKyat = Number(params.buyPricePerKyat) || 0;
  const totalAmount = Math.round(netKyatDecimal * buyPricePerKyat);

  return {
    netWeight,
    netKyatDecimal,
    totalAmount,
  };
}

/**
 * Extracts numeric purity value from purity string (e.g. '12_PE' -> 12, '၁၄ ပဲရည်' -> 14)
 * If none found, falls back to sellPrice.
 */
export function extractPurityValue(purity: string, purityLabel?: string, sellPrice?: number): number {
  const burmeseToWestern: Record<string, string> = {
    '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
    '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9'
  };
  
  const combined = `${purity || ''} ${purityLabel || ''}`;
  const converted = combined.replace(/[၀-၉]/g, (d) => burmeseToWestern[d] || d);
  const match = converted.match(/(\d+(\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return sellPrice || 0;
}

/**
 * Sorts gold prices in ascending order (ငယ်စဉ် ကြီးလိုက်)
 * e.g., 12 ပဲရည် -> 13 ပဲရည် -> 14 ပဲရည် -> 15 ပဲရည် -> 16 ပဲရည်
 */
export function sortGoldPricesAscending(prices: GoldPrice[]): GoldPrice[] {
  return [...prices].sort((a, b) => {
    const valA = extractPurityValue(a?.purity || '', a?.purityLabel, a?.sellPrice);
    const valB = extractPurityValue(b?.purity || '', b?.purityLabel, b?.sellPrice);
    if (valA !== valB) {
      return valA - valB; // Ascending: smallest first, largest last
    }
    return (a?.sellPrice || 0) - (b?.sellPrice || 0);
  });
}

/**
 * Sorts gold prices in descending order (ကြီးစဉ် ငယ်လိုက်)
 * e.g., 16 ပဲရည် -> 15 ပဲရည် -> 14 ပဲရည် -> 13 ပဲရည် -> 12 ပဲရည်
 */
export function sortGoldPricesDescending(prices: GoldPrice[]): GoldPrice[] {
  return [...prices].sort((a, b) => {
    const valA = extractPurityValue(a?.purity || '', a?.purityLabel, a?.sellPrice);
    const valB = extractPurityValue(b?.purity || '', b?.purityLabel, b?.sellPrice);
    if (valA !== valB) {
      return valB - valA; // Descending: largest first, smallest last
    }
    return (b?.sellPrice || 0) - (a?.sellPrice || 0);
  });
}

/**
 * Calculates workshop gold wastage, actual loss, and discrepancy against allowed tolerance.
 */
export function calculateWorkshopWastageDiscrepancy(
  givenWeight: GoldWeight,
  finishedWeight?: GoldWeight,
  scrapWeight?: GoldWeight,
  allowedWastage?: GoldWeight
): {
  actualLossWeight: GoldWeight;
  actualLossYway: number;
  allowedLossYway: number;
  varianceYway: number; // positive = shortage/ပေါက်ကြားမှု, negative = saving/သက်သာမှု
  isShortage: boolean;
  isPerfect: boolean;
  statusTextMm: string;
} {
  const givenYway = weightToTotalYway(givenWeight);
  const finishedYway = weightToTotalYway(finishedWeight);
  const scrapYway = weightToTotalYway(scrapWeight);
  const allowedLossYway = weightToTotalYway(allowedWastage);

  const returnedTotalYway = finishedYway + scrapYway;
  const actualLossYway = Math.max(0, Number((givenYway - returnedTotalYway).toFixed(3)));
  const actualLossWeight = totalYwayToWeight(actualLossYway);

  // Variance = Actual Loss - Allowed Loss
  // If actual loss is 3 yway and allowed is 2 yway -> variance is +1 yway (1 yway missing/shortage!)
  // If actual loss is 1 yway and allowed is 2 yway -> variance is -1 yway (1 yway saved!)
  const varianceYway = Number((actualLossYway - allowedLossYway).toFixed(3));
  const isShortage = varianceYway > 0.05;
  const isPerfect = Math.abs(varianceYway) <= 0.05;

  let statusTextMm = 'ပုံမှန် အလျော့တွက်အတွင်း ရှိသည်';
  if (isShortage) {
    statusTextMm = `ခွင့်ပြုချက်ထက် ${varianceYway.toFixed(1)} ရွေး ပိုမိုလျော့နည်းပေါက်ကြားနေသည် (အလျော့လွန်/ဒဏ်ကြေးစိစစ်ရန်)`;
  } else if (!isPerfect && varianceYway < -0.05) {
    statusTextMm = `ခွင့်ပြုချက်ထက် ${Math.abs(varianceYway).toFixed(1)} ရွေး အလျော့တွက် သက်သာသည်`;
  }

  return {
    actualLossWeight,
    actualLossYway,
    allowedLossYway,
    varianceYway,
    isShortage,
    isPerfect,
    statusTextMm,
  };
}

/**
 * Calculates workshop labor fee based on charge model.
 */
export function calculateWorkshopLaborFee(
  type: 'Fixed' | 'PerKyat' | 'PerPiece',
  rate: number,
  weight?: GoldWeight,
  qty: number = 1
): number {
  if (type === 'Fixed') {
    return Math.round(rate);
  }
  if (type === 'PerPiece') {
    return Math.round(rate * Math.max(1, qty));
  }
  if (type === 'PerKyat' && weight) {
    const kyatDec = weightToKyatDecimal(weight);
    return Math.round(rate * kyatDec);
  }
  return Math.round(rate);
}
