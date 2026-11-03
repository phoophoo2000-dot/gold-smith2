/**
 * ==========================================================
 * BARCODE & QR CODE GENERATION & SCANNER SOUND SERVICE
 * ==========================================================
 * Generates crisp 1D Code128 barcodes and 2D QR codes for
 * gold jewelry tags and sticker printing, and provides
 * Web Audio scanner beeps for POS barcode scanner feedback.
 */

import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Product, ShopSettings } from '../types/gold';
import { formatWeightMm, getPurityLabel, formatMMK } from './calculationEngine';

export interface JewelryLabelData {
  product: Product;
  shopName: string;
  phone?: string;
  barcodeDataUrl: string;
  qrCodeDataUrl: string;
}

/**
 * Generate high-resolution Barcode DataURL (Code 128)
 */
export function generateBarcodeDataUrl(text: string): string {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      displayValue: false, // We render custom Burmese / English typography below the code
      height: 38,
      margin: 2,
      width: 1.8,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Failed to generate barcode for:', text, err);
    return '';
  }
}

/**
 * Generate high-resolution QR Code DataURL
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 160,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.warn('Failed to generate QR code for:', text, err);
    return '';
  }
}

/**
 * Build label information bundle for a product
 */
export async function buildJewelryLabelData(
  product: Product,
  settings: ShopSettings
): Promise<JewelryLabelData> {
  const code = product.sku || product.id;
  const barcodeDataUrl = generateBarcodeDataUrl(code);
  const qrCodeDataUrl = await generateQrCodeDataUrl(code);

  return {
    product,
    shopName: settings.shopNameMm || settings.shopName || 'ရွှေဆိုင် POS',
    phone: settings.phone,
    barcodeDataUrl,
    qrCodeDataUrl,
  };
}

/**
 * Web Audio API synthesizer for Barcode Scanner audio feedback.
 * Zero external files needed, works offline in any modern browser.
 */
class ScannerSoundEffects {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Classic POS Barcode Scanner success beep (cheerful high double chime: 1200Hz -> 1800Hz)
   */
  public playSuccessBeep() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(1850, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  /**
   * Scanner error beep (low tone buzz: 320Hz)
   */
  public playErrorBeep() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }
}

export const scannerSounds = new ScannerSoundEffects();

/**
 * Normalize Myanmar numerals to Arabic numerals (၀-၉ -> 0-9)
 */
export function normalizeMyanmarDigits(input: string): string {
  if (!input) return '';
  const mmNumerals = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  let res = input;
  mmNumerals.forEach((mmChar, idx) => {
    res = res.split(mmChar).join(String(idx));
  });
  return res;
}

/**
 * Transliterate common Myanmar keyboard characters back to English QWERTY
 * (In case computer keyboard layout was active in Myanmar mode when scanner typed)
 */
export function unmapMyanmarKeyboard(input: string): string {
  if (!input) return '';
  const mmToEn: Record<string, string> = {
    'မ': 'r', 'ည': 'n', 'ွ': 'g', 'တ': 'w', 'န': 'e', 'အ': 't', 'ပ': 'y',
    'က': 'u', 'င': 'i', 'သ': 'o', 'စ': 'p', 'ေ': 'a', 'ှ': 's', 'ိ': 'd',
    '်': 'f', 'ံ': 'h', '့': 'j', 'ဒ': 'k', 'း': 'l', 'ဇ': 'z', 'ဌ': 'x',
    'ဃ': 'c', 'ဠ': 'v', 'ဘ': 'b', 'ာ': 'm', 'ဝ': 'w',
    '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
    '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9',
  };
  let result = '';
  for (const ch of input) {
    result += mmToEn[ch] || ch;
  }
  return result;
}

/**
 * Universal Intelligent Barcode & SKU Matcher
 * Supports:
 * - Exact SKU match (e.g. RNG-15-01)
 * - Exact Product ID match (e.g. prd_001)
 * - Alphanumeric match (e.g. rng1501, rng 15 01)
 * - Myanmar digits normalization (e.g. RNG-၁၅-၀၁)
 * - Myanmar keyboard layout typing (e.g. မညွ-၁၅-၀၁)
 * - URL & QR Code query parameters (e.g. ?sku=RNG-15-01)
 * - Substring containment in tags
 */
export function matchProductByBarcode(rawCode: string, products: Product[]): Product | null {
  if (!rawCode || !Array.isArray(products) || products.length === 0) return null;
  const trimmed = rawCode.trim();
  if (!trimmed) return null;

  // 1. Direct case-insensitive match
  const directMatch = products.find(
    (p) =>
      p.sku.toLowerCase() === trimmed.toLowerCase() ||
      p.id.toLowerCase() === trimmed.toLowerCase()
  );
  if (directMatch) return directMatch;

  // 2. Alphanumeric match (ignores hyphens, spaces, underscores, brackets)
  const cleanAlpha = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const trimmedAlpha = cleanAlpha(trimmed);
  if (trimmedAlpha.length >= 2) {
    const alphaMatch = products.find(
      (p) => cleanAlpha(p.sku) === trimmedAlpha || cleanAlpha(p.id) === trimmedAlpha
    );
    if (alphaMatch) return alphaMatch;
  }

  // 3. Myanmar numerals normalized (e.g. RNG-၁၅-၀၁ -> RNG-15-01)
  const withArabicDigits = normalizeMyanmarDigits(trimmed);
  if (withArabicDigits !== trimmed) {
    const digitMatch = products.find(
      (p) =>
        p.sku.toLowerCase() === withArabicDigits.toLowerCase() ||
        p.id.toLowerCase() === withArabicDigits.toLowerCase() ||
        cleanAlpha(p.sku) === cleanAlpha(withArabicDigits)
    );
    if (digitMatch) return digitMatch;
  }

  // 4. Myanmar keyboard layout reverse mapping
  const unmapped = unmapMyanmarKeyboard(trimmed);
  if (unmapped !== trimmed) {
    const unmappedMatch = products.find(
      (p) =>
        p.sku.toLowerCase() === unmapped.toLowerCase() ||
        cleanAlpha(p.sku) === cleanAlpha(unmapped)
    );
    if (unmappedMatch) return unmappedMatch;
  }

  // 5. URL or Key-Value extraction (e.g. "?sku=RNG-15-01" or "id=prd_001")
  try {
    const urlMatch = trimmed.match(/(?:sku|id|code|product)=([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      const extracted = urlMatch[1];
      const match = products.find(
        (p) =>
          p.sku.toLowerCase() === extracted.toLowerCase() ||
          cleanAlpha(p.sku) === cleanAlpha(extracted) ||
          p.id.toLowerCase() === extracted.toLowerCase()
      );
      if (match) return match;
    }
  } catch {}

  // 6. Workshop Job & SKU variant matching (e.g. "JOB-2604", "WSP-2604", "2604")
  const jobDigitsMatch = trimmed.match(/(?:JOB|WSP)?[^\d]*(\d{4,})/i);
  if (jobDigitsMatch && jobDigitsMatch[1]) {
    const jobNum = jobDigitsMatch[1];
    const wspMatch = products.find(
      (p) =>
        (p.sku && p.sku.toLowerCase().includes(jobNum.toLowerCase())) ||
        (p.id && p.id.toLowerCase().includes(jobNum.toLowerCase())) ||
        (p.notes && p.notes.toLowerCase().includes(`job-${jobNum.toLowerCase()}`))
    );
    if (wspMatch) return wspMatch;
  }

  // Strict exact matching only: No partial substring matching
  // This guarantees codes like RIN-15-34 never get truncated or hijacked midway
  return null;
}


