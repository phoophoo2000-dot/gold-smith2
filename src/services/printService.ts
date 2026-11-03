import { Sale, PurchaseItem, ShopSettings, DebtSettlement, WorkshopJobOrder } from '../types/gold';
import {
  formatMMK,
  formatWeightMm,
  formatWeightEn,
  getPurityLabel,
  weightToGrams,
} from './calculationEngine';

/**
 * Check if the application is currently running inside an iframe
 */
export function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

interface PrintWindowOptions {
  title: string;
  bodyHtml: string;
  format?: 'thermal' | 'a5' | 'a4';
  autoPrint?: boolean;
}

/**
 * Print HTML content silently via hidden iframe within the current page.
 * Completely avoids popup blockers and stays seamless inside PWAs.
 */
export function printViaHiddenIframe(htmlContent: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    let iframe = document.getElementById('app-print-service-iframe') as HTMLIFrameElement | null;
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = 'app-print-service-iframe';
    // Off-screen with adequate dimensions for CSS media print and fonts to calculate properly
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = '1100px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      return false;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const cw = iframe.contentWindow;
    setTimeout(() => {
      try {
        cw.focus();
        cw.print();
      } catch (err) {
        console.warn('Hidden iframe print failed, attempting parent window.print():', err);
        try {
          window.focus();
          window.print();
        } catch (parentErr) {
          console.error('Direct window.print fallback failed:', parentErr);
        }
      }
    }, 300);

    return true;
  } catch (err) {
    console.warn('printViaHiddenIframe failed, attempting direct window.print():', err);
    try {
      window.focus();
      window.print();
    } catch (parentErr) {
      console.error('Direct window.print fallback failed:', parentErr);
    }
    return false;
  }
}

/**
 * Open a top-level window or trigger print with clean, styled printable document.
 * Includes multiple fallback tiers for PWA, sandboxed iframes, and popup blockers.
 */
export function openPrintWindow({
  title,
  bodyHtml,
  format = 'thermal',
  autoPrint = true,
}: PrintWindowOptions): Window | null {
  const isThermal = format === 'thermal';
  const width = isThermal ? 440 : 700;
  const height = 750;
  const left = window.screen.width ? Math.max(0, (window.screen.width - width) / 2) : 100;
  const top = window.screen.height ? Math.max(0, (window.screen.height - height) / 2) : 50;

  const html = `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${isThermal ? '80mm auto' : 'A5 portrait'};
      margin: ${isThermal ? '2mm' : '8mm'};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', 'Padauk', 'Pyidaungsu', 'Myanmar3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f5f5f4;
      color: #000000;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Top action bar (hidden during print) */
    .action-bar {
      width: 100%;
      max-width: ${isThermal ? '400px' : '620px'};
      background: #000000;
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .action-bar .info {
      font-size: 13px;
      font-weight: 700;
    }
    .action-bar .buttons {
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-print {
      background: #f59e0b;
      color: #000000;
    }
    .btn-print:hover {
      background: #fbbf24;
    }
    .btn-close {
      background: #333333;
      color: #ffffff;
    }
    .btn-close:hover {
      background: #444444;
    }

    /* Voucher container */
    .voucher-sheet {
      background: #ffffff;
      width: 100%;
      max-width: ${isThermal ? '380px' : '590px'};
      padding: ${isThermal ? '24px 20px' : '22px 18px'};
      border-radius: ${isThermal ? '8px' : '10px'};
      border: 1px solid #78716c;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      font-size: ${isThermal ? '12px' : '11.5px'};
      line-height: 1.45;
      color: #000000;
    }

    /* Print media styling - Force deep crisp black text and sharp borders for printers */
    @media print {
      @page {
        size: ${isThermal ? '80mm auto' : 'A5 portrait'};
        margin: ${isThermal ? '2mm' : '6mm'};
      }
      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
        margin: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .action-bar {
        display: none !important;
      }
      .voucher-sheet {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        padding: ${isThermal ? '6px 2px' : '2mm 1mm'} !important;
        color: #000000 !important;
      }
      /* Ensure text is completely solid, dark black without fade */
      *, *:before, *:after {
        color: #000000 !important;
        text-shadow: none !important;
        -webkit-font-smoothing: subpixel-antialiased !important;
      }
      h1, h2, h3, h4, h5, h6, strong, b, th {
        font-weight: 800 !important;
        color: #000000 !important;
      }
      p, span, td, div {
        color: #000000 !important;
      }
      table, th, td {
        border-color: #000000 !important;
      }
      .badge-tag {
        border: 1.5px solid #000000 !important;
        color: #000000 !important;
        background: #f5f5f4 !important;
      }
      .paid-stamp {
        border-color: #059669 !important;
        background: #ecfdf5 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .paid-stamp, .paid-stamp * {
        color: #047857 !important;
      }
      .paid-stamp svg {
        stroke: #059669 !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div class="info">🖨️ ${title}</div>
    <div class="buttons">
      <button class="btn btn-print" onclick="window.print()">
        <span>Print (ပရင့်ထုတ်မည်)</span>
      </button>
      <button class="btn btn-close" onclick="window.close()">
        <span>ပိတ်မည် (Close)</span>
      </button>
    </div>
  </div>

  <div class="voucher-sheet">
    ${bodyHtml}
  </div>

  ${
    autoPrint
      ? `<script>
    (function() {
      function triggerAutoPrint() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn('Auto print error:', e);
        }
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(triggerAutoPrint, 250);
      } else {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(triggerAutoPrint, 250); });
        window.addEventListener('load', function() { setTimeout(triggerAutoPrint, 250); });
        setTimeout(triggerAutoPrint, 600);
      }
    })();
  </script>`
      : ''
  }
</body>
</html>`;

  // Attempt to open dedicated popup window
  let printWindow: Window | null = null;
  try {
    printWindow = window.open(
      '',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
  } catch (err) {
    console.warn('window.open was blocked or threw:', err);
    printWindow = null;
  }

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      if (autoPrint) {
        setTimeout(() => {
          try {
            printWindow?.focus();
            printWindow?.print();
          } catch (e) {
            console.warn('Direct parent trigger print failed:', e);
          }
        }, 350);
      }
      return printWindow;
    } catch (writeErr) {
      console.warn('Failed to write to print window:', writeErr);
    }
  }

  // Fallback 1: Silent hidden iframe print within active document
  const iframeSuccess = printViaHiddenIframe(html);
  if (iframeSuccess) {
    return null;
  }

  // Fallback 2: Direct window.print() in parent window
  try {
    window.print();
  } catch (e) {
    console.error('window.print fallback failed:', e);
  }
  return null;
}

/**
 * Print a POS Sale Invoice using either the clean new-tab window or DOM element
 */
export function printSaleInvoice(
  sale: Sale,
  settings: ShopSettings,
  language: 'my' | 'en' = 'my',
  format: 'thermal' | 'a5' | 'a4' = 'thermal'
) {
  const isThermal = format === 'thermal';
  const isPaid = sale.status === 'Completed' || (sale.balanceRemaining ?? 0) <= 0;

  const paidStampHtml = isPaid
    ? `<div class="paid-stamp" style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 12px; border: 2.5px solid #059669; border-radius: 12px; background-color: #ecfdf5; transform: rotate(-9deg); box-shadow: 0 2px 8px rgba(5,150,105,0.18); margin: 4px 0;">
        <div style="display: flex; align-items: center; gap: 5px; color: #047857; font-weight: 900; font-size: 13px; line-height: 1.2;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
          </svg>
          <span style="font-weight: 900;">ငွေရှင်းပြီး (PAID)</span>
        </div>
        <div style="font-size: 8.5px; font-family: monospace; font-weight: 800; color: #059669; letter-spacing: 0.8px; margin-top: 1px;">
          VERIFIED: ${sale.date}
        </div>
      </div>`
    : '';

  const bodyHtml = isThermal
    ? `
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 12px; color: #000000;">
      <h1 style="font-size: 18px; font-weight: 900; color: #000000; margin-bottom: 4px; letter-spacing: -0.3px;">
        ${settings.shopNameMm || settings.shopName}
      </h1>
      <p style="font-size: 11px; color: #000000; font-weight: 700; margin-bottom: 3px;">
        ${settings.tagline}
      </p>
      <p style="font-size: 11px; color: #000000; font-weight: 600; margin-bottom: 2px;">
        ${settings.address}
      </p>
      <p style="font-size: 11px; color: #000000; font-weight: 700;">
        ဖုန်း - ${settings.phone}
      </p>
      ${isPaid ? `<div style="text-align: center; margin-top: 8px;">${paidStampHtml}</div>` : ''}
    </div>

    <!-- Voucher Details -->
    <div style="border-bottom: 1.5px solid #000000; padding-bottom: 8px; margin-bottom: 10px; font-size: 11.5px; color: #000000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 700;">ဘောက်ချာအမှတ် (Invoice):</span>
        <span style="font-weight: 900; font-family: monospace; font-size: 12px;">${sale.invoiceNo}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">ရက်စွဲ (Date):</span>
        <span style="font-weight: 700;">${sale.date}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">ဖောက်သည် (Customer):</span>
        <span style="font-weight: 800; font-size: 12px;">${sale.customerName || 'အထွေထွေ ဝယ်ယူသူ'}</span>
      </div>
      ${
        sale.customerPhone
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">ဖုန်း (Phone):</span>
        <span style="font-weight: 700;">${sale.customerPhone}</span>
      </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #000000; font-weight: 600;">ငွေကိုင် (Cashier):</span>
        <span style="font-weight: 700;">${sale.cashierName}</span>
      </div>
      ${
        sale.counterName
          ? `<div style="display: flex; justify-content: space-between; margin-top: 3px;">
        <span style="color: #000000; font-weight: 600;">ကောင်တာ (Counter):</span>
        <span style="font-weight: 700;">${sale.counterName} (${sale.counterId || 'C1'})</span>
      </div>`
          : ''
      }
    </div>

    <!-- Items -->
    <div style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 800; color: #000000; border-bottom: 1.5px solid #000000; padding-bottom: 4px;">
        <span>ပစ္စည်းအမည် (Item Description)</span>
        <span>သင့်ငွေ (Amount)</span>
      </div>
      ${sale.items
        .map(
          (item, idx) => `
        <div style="border-bottom: 1px dashed #444444; padding: 8px 0; font-size: 12px; color: #000000;">
          <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 3px;">
            <span>${idx + 1}. ${item.name}</span>
            <span style="font-weight: 900; font-size: 12.5px;">${formatMMK(item.total)}</span>
          </div>
          <div style="color: #000000; font-weight: 700; font-size: 11px; margin-bottom: 3px;">
            ပဲရည်: ${getPurityLabel(item.purity, language)}
          </div>
          <div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 600;">
            <span>အလေးချိန်:</span>
            <span style="font-weight: 700;">${formatWeightMm(item.actualWeight)} (${formatWeightEn(item.actualWeight)})</span>
          </div>
          ${
            item.wastage && (item.wastage.kyat > 0 || item.wastage.pe > 0 || item.wastage.yway > 0)
              ? `<div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 600;">
            <span>အလျော့တွက်:</span>
            <span style="font-weight: 700;">${formatWeightMm(item.wastage)}</span>
          </div>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 700;">
            <span>တွက်ချက်အလေးချိန်:</span>
            <span>${formatWeightMm(item.billableWeight)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 600;">
            <span>ရွှေဈေး (နှုန်း):</span>
            <span style="font-weight: 700;">${formatMMK(item.goldPricePerKyat)} / ကျပ်သား</span>
          </div>
          ${
            item.makingCharge > 0
              ? `<div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 600;">
            <span>လက်ခ:</span>
            <span style="font-weight: 700;">${formatMMK(item.makingCharge)}</span>
          </div>`
              : ''
          }
          ${
            item.stoneCharge > 0
              ? `<div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 600;">
            <span>ကျောက်ဖိုး:</span>
            <span style="font-weight: 700;">${formatMMK(item.stoneCharge)}</span>
          </div>`
              : ''
          }
          ${
            item.discount > 0
              ? `<div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 700;">
            <span>လျှော့ဈေး:</span>
            <span>-${formatMMK(item.discount)}</span>
          </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>

    <!-- Total Calculations -->
    <div style="border-top: 1.5px solid #000000; padding-top: 8px; margin-bottom: 12px; font-size: 12px; color: #000000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #000000; font-weight: 600;">
        <span>ရွှေဖိုး စုစုပေါင်း:</span>
        <span style="font-weight: 700;">${formatMMK(sale.subtotalGold)}</span>
      </div>
      ${
        sale.totalMakingCharge > 0
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #000000; font-weight: 600;">
        <span>လက်ခ စုစုပေါင်း:</span>
        <span style="font-weight: 700;">${formatMMK(sale.totalMakingCharge)}</span>
      </div>`
          : ''
      }
      ${
        sale.totalStoneCharge > 0
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #000000; font-weight: 600;">
        <span>ကျောက်ဖိုး စုစုပေါင်း:</span>
        <span style="font-weight: 700;">${formatMMK(sale.totalStoneCharge)}</span>
      </div>`
          : ''
      }
      ${
        sale.totalDiscount > 0
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #000000; font-weight: 700;">
        <span>လျှော့ဈေး:</span>
        <span>-${formatMMK(sale.totalDiscount)}</span>
      </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; padding: 7px 0; margin: 6px 0;">
        <span>ကျသင့်ငွေ စုစုပေါင်း:</span>
        <span style="font-size: 15px;">${formatMMK(sale.grandTotal)}</span>
      </div>
    </div>

    <!-- Payments Card with Clean Full-Width Container -->
    <div style="border: 1.5px solid #000000; border-radius: 6px; overflow: hidden; margin-bottom: 14px; color: #000000;">
      <div style="background-color: #f3f4f6; border-bottom: 1.5px solid #000000; padding: 6px 10px; font-weight: 800; font-size: 11px; color: #000000; display: flex; justify-content: space-between;">
        <span>ပေးချေမှုမှတ်တမ်း (Payment)</span>
        <span style="font-weight: 800;">${sale.status === 'Completed' ? '✓ ငွေရှင်းပြီး' : 'ကျန်ငွေရှိ'}</span>
      </div>
      <div style="padding: 8px 10px; background-color: #ffffff;">
        ${sale.payments
          .map(
            (p) => `
          <div style="display: flex; justify-content: space-between; color: #000000; font-size: 11px; font-weight: 600; margin-bottom: 3px;">
            <span>• ${p.method} ${p.reference ? `(${p.reference})` : ''}:</span>
            <span style="font-weight: 700; color: #000000;">${formatMMK(p.amount)}</span>
          </div>
        `
          )
          .join('')}
        <div style="display: flex; justify-content: space-between; font-weight: 800; color: #000000; border-top: 1px solid #000000; padding-top: 6px; margin-top: 4px; font-size: 11.5px;">
          <span>ရှင်းပြီးငွေ (Paid Amount):</span>
          <span>${formatMMK(sale.paidAmount)}</span>
        </div>
        ${
          sale.balanceRemaining > 0
            ? `<div style="display: flex; justify-content: space-between; font-weight: 900; color: #000000; font-size: 11.5px; margin-top: 3px;">
          <span>ကျန်ငွေ (Credit Balance):</span>
          <span>${formatMMK(sale.balanceRemaining)}</span>
        </div>`
            : ''
        }
      </div>
    </div>

    <!-- Notes if any -->
    ${
      sale.notes
        ? `<div style="font-size: 10.5px; color: #000000; font-weight: 600; margin-bottom: 10px; border-left: 2px solid #000000; padding-left: 6px;">
      မှတ်ချက်: ${sale.notes}
    </div>`
        : ''
    }

    <!-- Footer Policy -->
    <div style="text-align: center; font-size: 10.5px; color: #000000; font-weight: 600; border-top: 1.5px solid #000000; padding-top: 10px;">
      <p style="font-weight: 800; margin-bottom: 2px;">ဝယ်ယူအားပေးမှုကို အထူးပင်ကျေးဇူးတင်ရှိပါသည်။</p>
      <p style="font-size: 9.5px; margin-bottom: 4px; font-weight: 600;">* ဤပြေစာပါရှိမှသာ ရွှေထည် ပြန်လည်ရောင်းချခြင်း၊ လဲလှယ်ခြင်း ဆောင်ရွက်ပေးပါမည်။</p>
      <p style="font-family: monospace; font-size: 9.5px; color: #000000; font-weight: 700;">
        ${sale.invoiceNo} • ${sale.createdAt}
      </p>
      <div style="color: #000000; font-weight: 800; font-size: 10px; margin-top: 6px;">
        ✓ ရွှေရတနာ စံချိန်စံညွှန်း အာမခံသည်
      </div>
    </div>
  `
    : `
    <!-- A5 FORMAL INVOICE LAYOUT - HIGH CONTRAST SOLID BLACK PRINT -->
    <div style="border-bottom: 2.5px solid #000000; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; color: #000000; position: relative;">
      <div>
        <h1 style="font-size: 22px; font-weight: 900; color: #000000; margin-bottom: 2px; letter-spacing: -0.5px;">
          ${settings.shopNameMm || settings.shopName}
        </h1>
        <div style="font-size: 12.5px; color: #000000; font-weight: 700; margin-bottom: 3px;">${settings.tagline}</div>
        <div style="font-size: 11.5px; color: #000000; font-weight: 600; margin-bottom: 2px;">${settings.address}</div>
        <div style="font-size: 11.5px; color: #000000; font-weight: 700;">ဖုန်း - ${settings.phone}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 14px;">
        ${isPaid ? paidStampHtml : ''}
        <div style="text-align: right;">
          <div class="badge-tag" style="display: inline-block; background-color: #f3f4f6; color: #000000; border: 1.5px solid #000000; font-weight: 900; font-size: 12px; padding: 4px 10px; border-radius: 6px; margin-bottom: 6px;">
            ရွှေအရောင်းပြေစာ (A5)
          </div>
          <div style="font-size: 12.5px; font-weight: 900; font-family: monospace; color: #000000;">
            No: ${sale.invoiceNo}
          </div>
          <div style="font-size: 11.5px; font-weight: 700; color: #000000;">ရက်စွဲ: ${sale.date}</div>
        </div>
      </div>
    </div>

    <!-- Customer & Cashier Info -->
    <div style="display: flex; justify-content: space-between; background-color: #fcfcfc; border: 1.5px solid #000000; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #000000;">
      <div>
        <span style="color: #000000; font-weight: 700;">ဝယ်ယူသူအမည် (Customer): </span>
        <strong style="color: #000000; font-size: 13px; font-weight: 900;">${sale.customerName || 'အထွေထွေ ဝယ်ယူသူ'}</strong>
        ${sale.customerPhone ? `<span style="color: #000000; font-weight: 700; margin-left: 12px;">(ဖုန်း: ${sale.customerPhone})</span>` : ''}
      </div>
      <div>
        <span style="color: #000000; font-weight: 700;">အရောင်းဝန်ထမ်း / ငွေကိုင်: </span>
        <strong style="color: #000000; font-weight: 900;">${sale.cashierName}</strong>
        ${sale.counterName ? `<span style="color: #000000; font-weight: 700; margin-left: 8px;">• ${sale.counterName} (${sale.counterId || 'C1'})</span>` : ''}
      </div>
    </div>

    <!-- Formal A4/A5 Table with Crisp Solid Borders and Deep Black Text -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; color: #000000;">
      <thead>
        <tr style="background-color: #f3f4f6; border-top: 1.5px solid #000000; border-bottom: 2px solid #000000; font-weight: 800; color: #000000;">
          <th style="padding: 7px 5px; text-align: center; border: 1px solid #000000; width: 32px; font-weight: 800;">စဉ်</th>
          <th style="padding: 7px 6px; text-align: left; border: 1px solid #000000; font-weight: 800;">ပစ္စည်းအမည်</th>
          <th style="padding: 7px 5px; text-align: center; border: 1px solid #000000; font-weight: 800;">ပဲရည်</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">အလေးချိန်</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">အလျော့တွက်</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">တွက်ချက်ချိန်</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">ရွှေဈေး</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">လက်ခ</th>
          <th style="padding: 7px 6px; text-align: right; border: 1px solid #000000; font-weight: 900;">သင့်ငွေ</th>
        </tr>
      </thead>
      <tbody>
        ${sale.items
          .map(
            (item, idx) => `
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 7px 5px; text-align: center; border: 1px solid #000000; font-weight: 700;">${idx + 1}</td>
            <td style="padding: 7px 6px; font-weight: 800; color: #000000; border: 1px solid #000000;">${item.name}</td>
            <td style="padding: 7px 5px; text-align: center; color: #000000; font-weight: 800; border: 1px solid #000000;">${getPurityLabel(item.purity, language)}</td>
            <td style="padding: 7px 5px; text-align: right; font-weight: 700; border: 1px solid #000000;">${formatWeightMm(item.actualWeight)}</td>
            <td style="padding: 7px 5px; text-align: right; color: #000000; font-weight: 700; border: 1px solid #000000;">${formatWeightMm(item.wastage)}</td>
            <td style="padding: 7px 5px; text-align: right; font-weight: 800; border: 1px solid #000000;">${formatWeightMm(item.billableWeight)}</td>
            <td style="padding: 7px 5px; text-align: right; font-weight: 700; border: 1px solid #000000;">${formatMMK(item.goldPricePerKyat)}</td>
            <td style="padding: 7px 5px; text-align: right; font-weight: 700; border: 1px solid #000000;">${item.makingCharge > 0 ? formatMMK(item.makingCharge) : '-'}</td>
            <td style="padding: 7px 6px; text-align: right; font-weight: 900; color: #000000; border: 1px solid #000000;">${formatMMK(item.total)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="border-top: 1.5px solid #000000; background-color: #fafaf9;">
          <td colspan="7" style="padding: 6px 8px; text-align: right; font-weight: 700; border: 1px solid #000000; color: #000000;">ရွှေတန်ဖိုး စုစုပေါင်း:</td>
          <td colspan="2" style="padding: 6px 8px; text-align: right; font-weight: 800; border: 1px solid #000000; color: #000000;">${formatMMK(sale.subtotalGold)}</td>
        </tr>
        ${
          sale.totalMakingCharge > 0
            ? `<tr style="background-color: #fafaf9;">
          <td colspan="7" style="padding: 6px 8px; text-align: right; font-weight: 700; border: 1px solid #000000; color: #000000;">လက်ခ စုစုပေါင်း:</td>
          <td colspan="2" style="padding: 6px 8px; text-align: right; font-weight: 800; border: 1px solid #000000; color: #000000;">${formatMMK(sale.totalMakingCharge)}</td>
        </tr>`
            : ''
        }
        ${
          sale.totalStoneCharge > 0
            ? `<tr style="background-color: #fafaf9;">
          <td colspan="7" style="padding: 6px 8px; text-align: right; font-weight: 700; border: 1px solid #000000; color: #000000;">ကျောက်ဖိုး စုစုပေါင်း:</td>
          <td colspan="2" style="padding: 6px 8px; text-align: right; font-weight: 800; border: 1px solid #000000; color: #000000;">${formatMMK(sale.totalStoneCharge)}</td>
        </tr>`
            : ''
        }
        ${
          sale.totalDiscount > 0
            ? `<tr style="background-color: #fafaf9; color: #000000;">
          <td colspan="7" style="padding: 6px 8px; text-align: right; font-weight: 700; border: 1px solid #000000; color: #000000;">လျှော့ဈေး (Discount):</td>
          <td colspan="2" style="padding: 6px 8px; text-align: right; font-weight: 800; border: 1px solid #000000; color: #000000;">-${formatMMK(sale.totalDiscount)}</td>
        </tr>`
            : ''
        }
        <tr style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; background-color: #f3f4f6;">
          <td colspan="7" style="padding: 8px 8px; text-align: right; font-weight: 900; font-size: 12.5px; color: #000000; border: 1px solid #000000;">ကျသင့်ငွေ စုစုပေါင်း (Grand Total):</td>
          <td colspan="2" style="padding: 8px 8px; text-align: right; font-weight: 900; font-size: 14.5px; color: #000000; border: 1px solid #000000;">${formatMMK(sale.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Payment Breakdown & Signatures -->
    <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; color: #000000;">
      <!-- Payment Box -->
      <div style="flex: 1; border: 1.5px solid #000000; border-radius: 6px; padding: 10px 12px; background-color: #ffffff; font-size: 11.5px;">
        <div style="font-weight: 800; color: #000000; border-bottom: 1px solid #000000; padding-bottom: 5px; margin-bottom: 6px;">
          ငွေပေးချေမှု အခြေအနေ (Payment)
        </div>
        ${sale.payments
          .map(
            (p) => `
          <div style="display: flex; justify-content: space-between; color: #000000; margin-bottom: 3px; font-weight: 600;">
            <span>• ${p.method} ${p.reference ? `(${p.reference})` : ''}:</span>
            <span style="font-weight: 800; color: #000000;">${formatMMK(p.amount)}</span>
          </div>
        `
          )
          .join('')}
        <div style="display: flex; justify-content: space-between; font-weight: 900; color: #000000; border-top: 1px solid #000000; padding-top: 6px; margin-top: 6px;">
          <span>ရှင်းပြီးငွေ (Paid Amount):</span>
          <span>${formatMMK(sale.paidAmount)}</span>
        </div>
        ${
          sale.balanceRemaining > 0
            ? `<div style="display: flex; justify-content: space-between; font-weight: 900; color: #000000; margin-top: 3px;">
          <span>ကျန်ငွေ (Credit Balance):</span>
          <span>${formatMMK(sale.balanceRemaining)}</span>
        </div>`
            : ''
        }
      </div>

      <!-- Signatures Box -->
      <div style="flex: 1; border: 1.5px solid #000000; border-radius: 6px; padding: 10px 12px; background-color: #ffffff; display: flex; flex-direction: column; justify-content: space-between; font-size: 11px; color: #000000;">
        <div style="display: flex; justify-content: space-around; text-align: center; width: 100%; margin-top: 26px;">
          <div style="width: 44%;">
            <div style="border-bottom: 1.5px solid #000000; margin-bottom: 5px;"></div>
            <div style="font-weight: 800; color: #000000;">ဝယ်ယူသူ လက်မှတ်</div>
          </div>
          <div style="width: 44%;">
            <div style="border-bottom: 1.5px solid #000000; margin-bottom: 5px;"></div>
            <div style="font-weight: 800; color: #000000;">အရောင်းတာဝန်ခံ / ငွေကိုင်</div>
          </div>
        </div>
        <div style="text-align: center; color: #000000; font-weight: 800; margin-top: 10px; font-size: 10.5px;">
          ✓ ရွှေရတနာ စံချိန်စံညွှန်း အာမခံပါသည်
        </div>
      </div>
    </div>

    <!-- Notes if any -->
    ${
      sale.notes
        ? `<div style="font-size: 11px; color: #000000; font-weight: 600; margin-bottom: 12px; border-left: 2px solid #000000; padding-left: 8px;">
      မှတ်ချက်: ${sale.notes}
    </div>`
        : ''
    }

    <!-- A4/A5 Footer Policy -->
    <div style="text-align: center; font-size: 11px; color: #000000; font-weight: 600; border-top: 1.5px solid #000000; padding-top: 10px;">
      <p style="font-weight: 800; margin-bottom: 3px; color: #000000;">ဝယ်ယူအားပေးမှုကို အထူးပင်ကျေးဇူးတင်ရှိပါသည်။</p>
      <p style="font-size: 10px; margin-bottom: 4px; color: #000000; font-weight: 600;">* ဤပြေစာပါရှိမှသာ ရွှေထည် ပြန်လည်ရောင်းချခြင်း၊ လဲလှယ်ခြင်း ဆောင်ရွက်ပေးပါမည်။</p>
      <p style="font-family: monospace; font-size: 10px; color: #000000; font-weight: 700;">
        ${sale.invoiceNo} • ${sale.createdAt}
      </p>
    </div>
  `;

  return openPrintWindow({
    title: `ပြေစာ ${sale.invoiceNo} - ${settings.shopName}`,
    bodyHtml,
    format,
    autoPrint: true,
  });
}

/**
 * Print a Buy Gold (Purchase) Voucher
 */
export function printPurchaseVoucher(
  purchase: PurchaseItem,
  settings: ShopSettings,
  language: 'my' | 'en' | 'mm' = 'my',
  format: 'thermal' | 'a5' | 'a4' = 'thermal'
) {
  const isThermal = format === 'thermal';
  const lang: 'my' | 'en' = language === 'en' ? 'en' : 'my';

  const bodyHtml = isThermal
    ? `
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 12px; color: #000000;">
      <h1 style="font-size: 17px; font-weight: 900; color: #000000; margin-bottom: 3px;">
        ${settings.shopNameMm || settings.shopName}
      </h1>
      <h2 style="font-size: 13px; font-weight: 800; color: #000000; margin-bottom: 2px;">
        ရွှေဝယ်ယူမှု ပြေစာ (Buy Voucher)
      </h2>
      <p style="font-size: 10.5px; color: #000000; font-weight: 600;">
        ${settings.address} • ဖုန်း - ${settings.phone}
      </p>
    </div>

    <!-- Voucher Details -->
    <div style="border-bottom: 1.5px solid #000000; padding-bottom: 8px; margin-bottom: 10px; font-size: 11.5px; color: #000000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 700;">ဘောက်ချာအမှတ်:</span>
        <span style="font-weight: 900; font-family: monospace;">${purchase.voucherNo}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">ရက်စွဲ (Date):</span>
        <span style="font-weight: 700;">${purchase.date}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">ရောင်းချသူ (Seller):</span>
        <span style="font-weight: 800;">${purchase.partyName} (${purchase.partyType === 'Customer' ? 'ဖောက်သည်' : 'ကုန်သည်/ပန်းထိမ်'})</span>
      </div>
      ${
        purchase.partyPhone
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">ဖုန်း (Phone):</span>
        <span style="font-weight: 700;">${purchase.partyPhone}</span>
      </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">ပစ္စည်းဖော်ပြချက်:</span>
        <span style="font-weight: 800;">${purchase.itemDescription}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #000000; font-weight: 600;">ပဲရည် (Purity):</span>
        <span style="font-weight: 800; color: #000000;">${getPurityLabel(purchase.purity, lang)}</span>
      </div>
    </div>

    <!-- Weight & Calculation Details -->
    <div style="border-bottom: 1.5px solid #000000; padding-bottom: 10px; margin-bottom: 12px; font-size: 11.5px; color: #000000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #000000; font-weight: 600;">မူလအလေးချိန် (Gross Weight):</span>
        <span style="font-weight: 700;">${formatWeightMm(purchase.grossWeight)} (${formatWeightEn(purchase.grossWeight)})</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #000000; font-weight: 600;">
        <span>နုတ်ငွေ / အညစ်အကြေး (Deduction):</span>
        <span style="font-weight: 700;">-${formatWeightMm(purchase.deduction)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: 800; color: #000000; border-top: 1px solid #000000; padding-top: 4px;">
        <span>အသားတင်အလေးချိန် (Net Weight):</span>
        <span>${formatWeightMm(purchase.netWeight)} (${formatWeightEn(purchase.netWeight)})</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #000000; font-weight: 600;">
        <span>ပေါက်ဈေးနှုန်း (Buy Rate):</span>
        <span style="font-weight: 700;">${formatMMK(purchase.buyPricePerKyat)} / ကျပ်သား</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; padding: 7px 0; margin: 6px 0;">
        <span>ပေးချေငွေ စုစုပေါင်း (Total Payout):</span>
        <span style="font-size: 15px;">${formatMMK(purchase.totalAmount)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #000000; font-size: 10.5px; font-weight: 600; margin-top: 4px;">
        <span>ငွေပေးနည်းလမ်း:</span>
        <span style="font-weight: 800; color: #000000;">${purchase.paymentMethod}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #000000; font-size: 10.5px; font-weight: 600; margin-top: 2px;">
        <span>တာဝန်ခံ ငွေကိုင်:</span>
        <span style="font-weight: 700;">${purchase.cashierName}</span>
      </div>
    </div>

    ${
      purchase.notes
        ? `<div style="font-size: 10.5px; color: #000000; font-weight: 600; margin-bottom: 12px; border-left: 2px solid #000000; padding-left: 6px;">
      မှတ်ချက်: ${purchase.notes}
    </div>`
        : ''
    }

    <!-- Signatures -->
    <div style="display: flex; justify-content: space-between; margin-top: 20px; padding-top: 10px; font-size: 10.5px; color: #000000; font-weight: 700; text-align: center;">
      <div style="width: 45%;">
        <div style="border-bottom: 1.5px solid #000000; height: 35px; margin-bottom: 4px;"></div>
        <span>ရောင်းချသူ လက်မှတ်</span>
      </div>
      <div style="width: 45%;">
        <div style="border-bottom: 1.5px solid #000000; height: 35px; margin-bottom: 4px;"></div>
        <span>လက်ခံစစ်ဆေးသူ လက်မှတ်</span>
      </div>
    </div>

    <div style="text-align: center; font-size: 9.5px; color: #000000; font-weight: 700; font-family: monospace; margin-top: 14px;">
      ${purchase.voucherNo} • ${purchase.createdAt}
    </div>
  `
    : `
    <!-- A5 FORMAL GOLD PURCHASE VOUCHER LAYOUT -->
    <div style="border-bottom: 2.5px solid #000000; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; color: #000000;">
      <div>
        <h1 style="font-size: 22px; font-weight: 900; color: #000000; margin-bottom: 2px; letter-spacing: -0.5px;">
          ${settings.shopNameMm || settings.shopName}
        </h1>
        <div style="font-size: 12.5px; color: #000000; font-weight: 700; margin-bottom: 3px;">${settings.tagline}</div>
        <div style="font-size: 11.5px; color: #000000; font-weight: 600; margin-bottom: 2px;">${settings.address}</div>
        <div style="font-size: 11.5px; color: #000000; font-weight: 700;">ဖုန်း - ${settings.phone}</div>
      </div>
      <div style="text-align: right;">
        <div class="badge-tag" style="display: inline-block; background-color: #f3f4f6; color: #000000; border: 1.5px solid #000000; font-weight: 900; font-size: 12px; padding: 4px 10px; border-radius: 6px; margin-bottom: 6px;">
          ရွှေဝယ်ယူမှု ပြေစာ (A5)
        </div>
        <div style="font-size: 12.5px; font-weight: 900; font-family: monospace; color: #000000;">
          Voucher No: ${purchase.voucherNo}
        </div>
        <div style="font-size: 11.5px; font-weight: 700; color: #000000;">ရက်စွဲ (Date): ${purchase.date}</div>
      </div>
    </div>

    <!-- Seller & Cashier Info -->
    <div style="display: flex; justify-content: space-between; background-color: #fcfcfc; border: 1.5px solid #000000; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #000000;">
      <div>
        <span style="color: #000000; font-weight: 700;">ရောင်းချသူ (Seller): </span>
        <strong style="color: #000000; font-size: 13px; font-weight: 900;">${purchase.partyName}</strong>
        <span style="color: #000000; font-weight: 600; margin-left: 6px;">(${purchase.partyType === 'Customer' ? 'ဖောက်သည်' : 'ကုန်သည်/ပန်းထိမ်'})</span>
        ${purchase.partyPhone ? `<span style="color: #000000; font-weight: 700; margin-left: 12px;">(ဖုန်း: ${purchase.partyPhone})</span>` : ''}
      </div>
      <div>
        <span style="color: #000000; font-weight: 700;">တာဝန်ခံ ငွေကိုင် / စစ်ဆေးသူ: </span>
        <strong style="color: #000000; font-weight: 900;">${purchase.cashierName}</strong>
      </div>
    </div>

    <!-- Formal A4/A5 Table for Purchase -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; color: #000000;">
      <thead>
        <tr style="background-color: #f3f4f6; border-top: 1.5px solid #000000; border-bottom: 2px solid #000000; font-weight: 800; color: #000000;">
          <th style="padding: 7px 5px; text-align: center; border: 1px solid #000000; width: 32px; font-weight: 800;">စဉ်</th>
          <th style="padding: 7px 6px; text-align: left; border: 1px solid #000000; font-weight: 800;">ပစ္စည်းအမည် / ဖော်ပြချက်</th>
          <th style="padding: 7px 5px; text-align: center; border: 1px solid #000000; font-weight: 800;">ပဲရည်</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">မူလအလေးချိန်</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">နုတ်ငွေ/အညစ်အကြေး</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">အသားတင်</th>
          <th style="padding: 7px 5px; text-align: right; border: 1px solid #000000; font-weight: 800;">၁ ကျပ်သား ဝယ်ဈေး</th>
          <th style="padding: 7px 6px; text-align: right; border: 1px solid #000000; font-weight: 900;">ပေးချေငွေ (Amount)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #000000;">
          <td style="padding: 8px 5px; text-align: center; border: 1px solid #000000; font-weight: 700;">1</td>
          <td style="padding: 8px 6px; font-weight: 800; color: #000000; border: 1px solid #000000;">${purchase.itemDescription}</td>
          <td style="padding: 8px 5px; text-align: center; color: #000000; font-weight: 800; border: 1px solid #000000;">${getPurityLabel(purchase.purity, lang)}</td>
          <td style="padding: 8px 5px; text-align: right; border: 1px solid #000000; font-weight: 700;">${formatWeightMm(purchase.grossWeight)}<br/><span style="font-size: 10px; color: #000000; font-weight: 600;">${formatWeightEn(purchase.grossWeight)}</span></td>
          <td style="padding: 8px 5px; text-align: right; color: #000000; border: 1px solid #000000; font-weight: 700;">-${formatWeightMm(purchase.deduction)}</td>
          <td style="padding: 8px 5px; text-align: right; font-weight: 800; border: 1px solid #000000;">${formatWeightMm(purchase.netWeight)}<br/><span style="font-size: 10px; color: #000000; font-weight: 600;">${formatWeightEn(purchase.netWeight)}</span></td>
          <td style="padding: 8px 5px; text-align: right; border: 1px solid #000000; font-weight: 700;">${formatMMK(purchase.buyPricePerKyat)}</td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 900; color: #000000; border: 1px solid #000000; font-size: 13px;">${formatMMK(purchase.totalAmount)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; background-color: #f3f4f6;">
          <td colspan="6" style="padding: 8px 10px; text-align: right; font-size: 12.5px; font-weight: 900; color: #000000; border: 1px solid #000000;">
            စုစုပေါင်း ပေးချေငွေ (Grand Total Payout):
          </td>
          <td colspan="2" style="padding: 8px 10px; text-align: right; font-size: 14.5px; font-weight: 900; color: #000000; border: 1px solid #000000;">
            ${formatMMK(purchase.totalAmount)}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Payment Method & Notes -->
    <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; color: #000000;">
      <div style="flex: 1; border: 1.5px solid #000000; border-radius: 6px; padding: 10px 12px; background-color: #ffffff; font-size: 11.5px;">
        <div style="font-weight: 800; color: #000000; margin-bottom: 6px; border-bottom: 1px solid #000000; padding-bottom: 4px;">ငွေပေးချေမှု အချက်အလက် (Payout Details)</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #000000; font-weight: 600;">ငွေပေးနည်းလမ်း:</span>
          <span style="font-weight: 800; color: #000000;">${purchase.paymentMethod}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #000000; font-weight: 600;">အခြေအနေ:</span>
          <span style="font-weight: 800; color: #000000;">✓ ပေးချေပြီး (Completed)</span>
        </div>
        ${purchase.notes ? `<div style="margin-top: 6px; border-top: 1px dashed #000000; padding-top: 6px; color: #000000; font-weight: 600;">မှတ်ချက်: ${purchase.notes}</div>` : ''}
      </div>
      
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 1.5px solid #000000; border-radius: 6px; padding: 10px 12px; background-color: #f9fafb; text-align: center;">
        <div style="font-size: 11.5px; font-weight: 800; color: #000000;">✓ ရွှေအရည်အသွေးနှင့် စံချိန်စံညွှန်း အာမခံသည်</div>
        <div style="font-size: 10.5px; color: #000000; font-weight: 600; margin-top: 2px;">စနစ်တကျ ချိန်တွယ်စစ်ဆေးပြီး အတည်ပြုချက်ရယူပြီးဖြစ်ပါသည်</div>
      </div>
    </div>

    <!-- Signatures -->
    <div style="display: flex; justify-content: space-between; margin-top: 26px; font-size: 11px; color: #000000; text-align: center;">
      <div style="width: 40%;">
        <div style="border-bottom: 1.5px solid #000000; height: 40px; margin-bottom: 5px;"></div>
        <div style="font-weight: 800;">ရောင်းချသူ လက်မှတ် (Seller)</div>
        <div style="font-size: 10px; font-weight: 700; color: #000000;">(${purchase.partyName})</div>
      </div>
      <div style="width: 40%;">
        <div style="border-bottom: 1.5px solid #000000; height: 40px; margin-bottom: 5px;"></div>
        <div style="font-weight: 800;">လက်ခံစစ်ဆေးသူ / ငွေကိုင် လက်မှတ်</div>
        <div style="font-size: 10px; font-weight: 700; color: #000000;">(${purchase.cashierName})</div>
      </div>
    </div>

    <div style="text-align: center; font-size: 10.5px; color: #000000; font-weight: 600; border-top: 1.5px solid #000000; padding-top: 10px; margin-top: 20px;">
      <p style="font-weight: 800; margin-bottom: 2px;">ရွှေထည်ပစ္စည်းများ ရောင်းချပေးမှုအတွက် ကျေးဇူးတင်ရှိပါသည်။</p>
      <p style="font-family: monospace; font-size: 9.5px; color: #000000; font-weight: 700;">${purchase.voucherNo} • ${purchase.createdAt}</p>
    </div>
  `;

  return openPrintWindow({
    title: `ဝယ်ယူမှုပြေစာ ${purchase.voucherNo} - ${settings.shopName}`,
    bodyHtml,
    format,
    autoPrint: true,
  });
}

/**
 * Format a Sale invoice into clear text suitable for Viber, Telegram, or SMS
 */
export function formatSaleToText(
  sale: Sale,
  settings: ShopSettings,
  language: 'my' | 'en' = 'my'
): string {
  const shopTitle = settings.shopNameMm || settings.shopName;
  let text = `✨ ${shopTitle} ✨\n`;
  if (settings.tagline) text += `${settings.tagline}\n`;
  if (settings.phone) text += `ဖုန်း: ${settings.phone}\n`;
  text += `--------------------------------\n`;
  text += `ပြေစာအမှတ်: ${sale.invoiceNo}\n`;
  text += `ရက်စွဲ: ${sale.date}\n`;
  text += `ဖောက်သည်: ${sale.customerName}${sale.customerPhone ? ` (${sale.customerPhone})` : ''}\n`;
  text += `ငွေကိုင်: ${sale.cashierName}\n`;
  text += `--------------------------------\n`;

  sale.items.forEach((item, idx) => {
    text += `${idx + 1}. ${item.name}\n`;
    text += `   • ပဲရည်: ${getPurityLabel(item.purity, language)}\n`;
    text += `   • အလေးချိန်: ${formatWeightMm(item.actualWeight)}\n`;
    if (item.wastage.kyat > 0 || item.wastage.pe > 0 || item.wastage.yway > 0) {
      text += `   • အလျော့တွက်: ${formatWeightMm(item.wastage)}\n`;
    }
    text += `   • ရွှေဈေး: ${formatMMK(item.goldPricePerKyat)}\n`;
    if (item.makingCharge > 0) {
      text += `   • လက်ခ: ${formatMMK(item.makingCharge)}\n`;
    }
    if (item.stoneCharge > 0) {
      text += `   • ကျောက်ဖိုး: ${formatMMK(item.stoneCharge)}\n`;
    }
    if (item.discount > 0) {
      text += `   • လျှော့ဈေး: -${formatMMK(item.discount)}\n`;
    }
    text += `   👉 သင့်ငွေ: ${formatMMK(item.total)}\n\n`;
  });

  text += `--------------------------------\n`;
  text += `ကျသင့်ငွေ စုစုပေါင်း: ${formatMMK(sale.grandTotal)}\n`;
  text += `ရှင်းပြီးငွေ: ${formatMMK(sale.paidAmount)}\n`;
  if (sale.balanceRemaining > 0) {
    text += `ကျန်ငွေ (Credit): ${formatMMK(sale.balanceRemaining)}\n`;
  }
  text += `--------------------------------\n`;
  text += `ဝယ်ယူအားပေးမှုကို အထူးကျေးဇူးတင်ရှိပါသည် 🙏`;

  return text;
}

/**
 * Format a Purchase voucher into text for Viber/Telegram
 */
export function formatPurchaseToText(
  purchase: PurchaseItem,
  settings: ShopSettings,
  language: 'my' | 'en' = 'my'
): string {
  const shopTitle = settings.shopNameMm || settings.shopName;
  let text = `✨ ${shopTitle} ✨\n`;
  text += `ရွှေဝယ်ယူမှု ပြေစာ (Buy Voucher)\n`;
  text += `--------------------------------\n`;
  text += `ဘောက်ချာအမှတ်: ${purchase.voucherNo}\n`;
  text += `ရက်စွဲ: ${purchase.date}\n`;
  text += `ရောင်းချသူ: ${purchase.partyName}${purchase.partyPhone ? ` (${purchase.partyPhone})` : ''}\n`;
  text += `ပစ္စည်း: ${purchase.itemDescription}\n`;
  text += `ပဲရည်: ${getPurityLabel(purchase.purity, language)}\n`;
  text += `မူလအလေးချိန်: ${formatWeightMm(purchase.grossWeight)}\n`;
  text += `နုတ်ငွေ/အညစ်အကြေး: ${formatWeightMm(purchase.deduction)}\n`;
  text += `အသားတင်အလေးချိန်: ${formatWeightMm(purchase.netWeight)}\n`;
  text += `ပေါက်ဈေး: ${formatMMK(purchase.buyPricePerKyat)}\n`;
  text += `--------------------------------\n`;
  text += `ပေးချေငွေ စုစုပေါင်း: ${formatMMK(purchase.totalAmount)}\n`;
  text += `ငွေပေးနည်းလမ်း: ${purchase.paymentMethod}\n`;
  text += `တာဝန်ခံ: ${purchase.cashierName}\n`;
  text += `--------------------------------\n`;
  text += `ကျေးဇူးတင်ပါသည် 🙏`;

  return text;
}

/**
 * Print Debt Settlement Receipt (ကျန်ငွေရှင်းလွှာ / ငွေရပြေစာ)
 */
export function printDebtSettlementReceipt(
  settlement: DebtSettlement,
  settings: ShopSettings,
  language: 'my' | 'en' = 'my',
  format: 'thermal' | 'a5' = 'thermal'
): Window | null {
  const isThermal = format === 'thermal';
  const shopTitle = settings.shopNameMm || settings.shopName;
  const isFullySettled = settlement.remainingBalance <= 0;

  let bodyHtml = '';

  if (isThermal) {
    bodyHtml = `
      <div class="thermal-container">
        <!-- Shop Header -->
        <div class="header" style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 8px; color: #000000;">
          <div class="shop-title" style="font-size: 16px; font-weight: 900; color: #000000;">${shopTitle}</div>
          ${settings.tagline ? `<div class="tagline" style="font-size: 11px; font-weight: 700; color: #000000;">${settings.tagline}</div>` : ''}
          ${settings.address ? `<div class="info-text" style="font-size: 10px; font-weight: 600; color: #000000;">${settings.address}</div>` : ''}
          ${settings.phone ? `<div class="info-text" style="font-size: 10.5px; font-weight: 700; color: #000000;">ဖုန်း: ${settings.phone}</div>` : ''}
          ${isFullySettled ? `
          <div style="margin-top: 8px;">
            <div class="paid-stamp" style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 12px; border: 2.5px solid #059669; border-radius: 12px; background-color: #ecfdf5; transform: rotate(-9deg); box-shadow: 0 2px 8px rgba(5,150,105,0.18);">
              <div style="display: flex; align-items: center; gap: 5px; color: #047857; font-weight: 900; font-size: 13px; line-height: 1.2;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
                </svg>
                <span>ငွေရှင်းပြီး (PAID)</span>
              </div>
              <div style="font-size: 8.5px; font-family: monospace; font-weight: 800; color: #059669; letter-spacing: 0.8px; margin-top: 1px;">
                VERIFIED: ${settlement.date}
              </div>
            </div>
          </div>` : ''}
        </div>

        <div style="text-align: center; margin: 8px 0; border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; padding: 6px 0; color: #000000;">
          <div style="font-weight: 900; font-size: 13px; color: #000000;">ကျန်ငွေရှင်းပြေစာ / ငွေရပြေစာ</div>
          <div style="font-size: 10px; font-weight: 700; color: #000000;">DEBT PAYMENT RECEIPT</div>
        </div>

        <!-- Meta info -->
        <div style="font-size: 11px; margin-bottom: 8px; line-height: 1.5; color: #000000;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000000; font-weight: 700;">ပြေစာအမှတ်:</span>
            <span style="font-weight: 900; font-family: monospace;">${settlement.receiptNo}</span>
          </div>
          ${settlement.invoiceNo ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000000; font-weight: 700;">မူလအရောင်းပြေစာ:</span>
            <span style="font-weight: 900; font-family: monospace; color: #000000;">${settlement.invoiceNo}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000000; font-weight: 600;">ရက်စွဲ/အချိန်:</span>
            <span style="font-weight: 700;">${settlement.createdAt || settlement.date}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000000; font-weight: 600;">ဖောက်သည်အမည်:</span>
            <span style="font-weight: 800;">${settlement.customerName}</span>
          </div>
          ${settlement.customerPhone ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000000; font-weight: 600;">ဖုန်းနံပါတ်:</span>
            <span style="font-weight: 700;">${settlement.customerPhone}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000000; font-weight: 600;">ငွေလက်ခံသူ:</span>
            <span style="font-weight: 700;">${settlement.cashierName}</span>
          </div>
        </div>

        <!-- Financial Breakdown -->
        <div style="border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; padding: 8px 0; margin: 8px 0; font-size: 11.5px; color: #000000;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #000000; font-weight: 600;">ယခင် ပေးရန်ကျန်ငွေ:</span>
            <span style="font-weight: 700;">${formatMMK(settlement.previousBalance)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13.5px; font-weight: 900; color: #000000; background: #f3f4f6; padding: 4px 6px; border: 1px solid #000000; border-radius: 4px;">
            <span>ယခု ပေးချေငွေ (Paid):</span>
            <span>${formatMMK(settlement.amountPaid)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 800; color: #000000; margin-top: 4px;">
            <span>လက်ကျန် ကျန်ငွေ (Remaining):</span>
            <span>${formatMMK(settlement.remainingBalance)}</span>
          </div>
        </div>

        <!-- Payment Method Details -->
        <div style="font-size: 10.5px; border: 1px solid #000000; border-radius: 4px; padding: 6px 8px; margin-bottom: 10px; color: #000000;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000000; font-weight: 600;">ပေးချေနည်းလမ်း:</span>
            <span style="font-weight: 800;">${settlement.paymentMethod}</span>
          </div>
          ${settlement.paymentReference ? `
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span style="color: #000000; font-weight: 600;">Transaction/Slip:</span>
            <span style="font-family: monospace; font-weight: 700;">${settlement.paymentReference}</span>
          </div>` : ''}
          ${settlement.notes ? `
          <div style="margin-top: 4px; border-top: 1px dashed #000000; padding-top: 2px; color: #000000; font-weight: 600;">
            မှတ်ချက်: ${settlement.notes}
          </div>` : ''}
          <div style="margin-top: 4px; text-align: center; font-weight: 800; color: #000000;">
            ${isFullySettled ? '✓ ကျန်ငွေ အပြီးအပြတ် ရှင်းလင်းပြီးပါပြီ' : '• ကျန်ငွေ တစ်စိတ်တစ်ပိုင်း ရှင်းလင်းပြီး'}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; font-size: 10px; color: #000000; font-weight: 600; margin-top: 12px; line-height: 1.4;">
          <div style="font-weight: 800;">ပေးချေမှုအတွက် ကျေးဇူးတင်ရှိပါသည်။</div>
          <div style="font-size: 9px; margin-top: 4px; font-weight: 700;">
            ${settlement.receiptNo} • ${settlement.createdAt}
          </div>
        </div>
      </div>
    `;
  } else {
    // A5 Format
    bodyHtml = `
      <div style="max-width: 650px; margin: 0 auto; padding: 20px 24px; font-family: 'Pyidaungsu', 'Myanmar3', sans-serif; color: #000000;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #000000; padding-bottom: 12px; margin-bottom: 16px; color: #000000;">
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #000000;">${shopTitle}</h1>
            ${settings.tagline ? `<p style="margin: 2px 0 0; font-size: 12.5px; font-weight: 700; color: #000000;">${settings.tagline}</p>` : ''}
            <p style="margin: 4px 0 0; font-size: 11.5px; font-weight: 600; color: #000000;">${settings.address || ''} ${settings.phone ? `• ဖုန်း: ${settings.phone}` : ''}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 14px;">
            ${isFullySettled ? `
            <div class="paid-stamp" style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 12px; border: 2.5px solid #059669; border-radius: 12px; background-color: #ecfdf5; transform: rotate(-9deg); box-shadow: 0 2px 8px rgba(5,150,105,0.18);">
              <div style="display: flex; align-items: center; gap: 5px; color: #047857; font-weight: 900; font-size: 13px; line-height: 1.2;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
                </svg>
                <span>ငွေရှင်းပြီး (PAID)</span>
              </div>
              <div style="font-size: 8.5px; font-family: monospace; font-weight: 800; color: #059669; letter-spacing: 0.8px; margin-top: 1px;">
                VERIFIED: ${settlement.date}
              </div>
            </div>` : ''}
            <div style="text-align: right;">
              <div class="badge-tag" style="display: inline-block; background: #f3f4f6; color: #000000; font-weight: 900; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1.5px solid #000000;">
                ကျန်ငွေရှင်းပြေစာ (DEBT PAYMENT RECEIPT)
              </div>
              <div style="margin-top: 6px; font-size: 12px; font-family: monospace; font-weight: 800;">No: ${settlement.receiptNo}</div>
              <div style="font-size: 10.5px; font-weight: 700; color: #000000;">${settlement.createdAt || settlement.date}</div>
            </div>
          </div>
        </div>

        <!-- Customer & Invoice Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; background: #ffffff; border: 1.5px solid #000000; border-radius: 6px; padding: 12px; font-size: 11.5px; color: #000000;">
          <div>
            <div style="font-weight: 800; color: #000000; text-transform: uppercase; font-size: 10.5px; margin-bottom: 4px; border-bottom: 1px solid #000000; padding-bottom: 2px;">ဖောက်သည် အချက်အလက်</div>
            <div style="font-size: 13.5px; font-weight: 900; color: #000000;">${settlement.customerName}</div>
            ${settlement.customerPhone ? `<div style="color: #000000; font-weight: 700; margin-top: 2px;">ဖုန်း: ${settlement.customerPhone}</div>` : ''}
          </div>
          <div>
            <div style="font-weight: 800; color: #000000; text-transform: uppercase; font-size: 10.5px; margin-bottom: 4px; border-bottom: 1px solid #000000; padding-bottom: 2px;">ပြေစာ အချက်အလက်</div>
            ${settlement.invoiceNo ? `<div>မူလအရောင်းပြေစာ: <strong style="color: #000000; font-family: monospace; font-weight: 900;">${settlement.invoiceNo}</strong></div>` : ''}
            <div>ငွေလက်ခံသူ: <strong style="font-weight: 800;">${settlement.cashierName}</strong></div>
            <div>ပေးချေနည်းလမ်း: <strong style="font-weight: 800;">${settlement.paymentMethod}</strong> ${settlement.paymentReference ? `(${settlement.paymentReference})` : ''}</div>
          </div>
        </div>

        <!-- Summary Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; color: #000000;">
          <thead>
            <tr style="background-color: #f3f4f6; border-top: 1.5px solid #000000; border-bottom: 2px solid #000000; font-weight: 900;">
              <th style="padding: 8px 10px; text-align: left; border: 1px solid #000000;">အကြောင်းအရာ (Description)</th>
              <th style="padding: 8px 10px; text-align: right; border: 1px solid #000000;">ပမာဏ (Amount)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #000000;">
              <td style="padding: 10px; border: 1px solid #000000; font-weight: 600;">ယခင် ပေးရန်ကျန်ငွေ စုစုပေါင်း (Previous Balance)</td>
              <td style="padding: 10px; text-align: right; font-weight: 700; border: 1px solid #000000;">${formatMMK(settlement.previousBalance)}</td>
            </tr>
            <tr style="border-bottom: 2px solid #000000; background-color: #f3f4f6;">
              <td style="padding: 12px 10px; font-weight: 900; font-size: 13.5px; color: #000000; border: 1px solid #000000;">
                ယခု ပေးချေလက်ခံရရှိငွေ (Amount Paid Now)
                ${settlement.paymentReference ? `<div style="font-size: 10.5px; font-weight: 700; color: #000000;">Ref: ${settlement.paymentReference}</div>` : ''}
              </td>
              <td style="padding: 12px 10px; text-align: right; font-weight: 900; font-size: 16px; color: #000000; border: 1px solid #000000;">
                ${formatMMK(settlement.amountPaid)}
              </td>
            </tr>
            <tr style="border-bottom: 1.5px solid #000000;">
              <td style="padding: 10px; font-weight: 800; color: #000000; border: 1px solid #000000;">
                လက်ကျန် ကျန်ငွေ (Remaining Balance)
              </td>
              <td style="padding: 10px; text-align: right; font-weight: 900; font-size: 13.5px; color: #000000; border: 1px solid #000000;">
                ${formatMMK(settlement.remainingBalance)}
              </td>
            </tr>
          </tbody>
        </table>

        ${settlement.notes ? `
        <div style="margin-bottom: 16px; padding: 8px 12px; background: #ffffff; border: 1px solid #000000; border-left: 4px solid #000000; font-size: 11.5px; color: #000000; font-weight: 600;">
          <strong>မှတ်ချက်:</strong> ${settlement.notes}
        </div>` : ''}

        <!-- Status Pill -->
        <div style="text-align: center; margin: 12px 0;">
          <span style="display: inline-block; padding: 5px 16px; border-radius: 9999px; font-size: 11.5px; font-weight: 800; background: #f3f4f6; color: #000000; border: 1.5px solid #000000;">
            ${isFullySettled ? '✓ ဤဘောက်ချာအတွက် ကျန်ငွေအားလုံး အပြီးအပြတ် ပေးချေပြီးပါပြီ' : '• ကျန်ငွေ တစ်စိတ်တစ်ပိုင်း ပေးချေပြီး (လက်ကျန် ရှိသေးပါသည်)'}
          </span>
        </div>

        <!-- Signatures -->
        <div style="display: flex; justify-content: space-between; margin-top: 36px; font-size: 11px; text-align: center; color: #000000;">
          <div style="width: 35%;">
            <div style="border-bottom: 1.5px solid #000000; height: 40px; margin-bottom: 6px;"></div>
            <div style="font-weight: 800;">ငွေပေးသွင်းသူ လက်မှတ် (Customer)</div>
            <div style="font-size: 10px; font-weight: 700; color: #000000;">(${settlement.customerName})</div>
          </div>
          <div style="width: 35%;">
            <div style="border-bottom: 1.5px solid #000000; height: 40px; margin-bottom: 6px;"></div>
            <div style="font-weight: 800;">ငွေလက်ခံသူ လက်မှတ် (Cashier)</div>
            <div style="font-size: 10px; font-weight: 700; color: #000000;">(${settlement.cashierName})</div>
          </div>
        </div>

        <div style="text-align: center; font-size: 10px; color: #000000; font-weight: 600; border-top: 1.5px solid #000000; padding-top: 12px; margin-top: 24px;">
          <div>ငွေပေးချေမှု အောင်မြင်စွာ လက်ခံရရှိပြီးဖြစ်ပါသည်။ အားပေးမှုကို ကျေးဇူးတင်ရှိပါသည်။</div>
          <div style="font-family: monospace; font-size: 9px; margin-top: 4px; font-weight: 700;">${settlement.receiptNo} • ${settlement.createdAt}</div>
        </div>
      </div>
    `;
  }

  return openPrintWindow({
    title: `ကျန်ငွေရှင်းပြေစာ ${settlement.receiptNo} - ${settings.shopName}`,
    bodyHtml,
    format,
    autoPrint: true,
  });
}

/**
 * Format a Debt Settlement receipt into text for Viber/Telegram/SMS
 */
export function formatDebtSettlementToText(
  settlement: DebtSettlement,
  settings: ShopSettings,
  _language: 'my' | 'en' = 'my'
): string {
  const shopTitle = settings.shopNameMm || settings.shopName;
  const isFullySettled = settlement.remainingBalance <= 0;

  let text = `✨ ${shopTitle} ✨\n`;
  text += `ကျန်ငွေရှင်းပြေစာ / ငွေရပြေစာ (Payment Receipt)\n`;
  text += `--------------------------------\n`;
  text += `ပြေစာအမှတ်: ${settlement.receiptNo}\n`;
  if (settlement.invoiceNo) {
    text += `မူလအရောင်းပြေစာ: ${settlement.invoiceNo}\n`;
  }
  text += `ရက်စွဲ: ${settlement.createdAt || settlement.date}\n`;
  text += `ဖောက်သည်: ${settlement.customerName}${settlement.customerPhone ? ` (${settlement.customerPhone})` : ''}\n`;
  text += `--------------------------------\n`;
  text += `ယခင် ကျန်ငွေ: ${formatMMK(settlement.previousBalance)}\n`;
  text += `👉 ယခု ပေးချေငွေ: ${formatMMK(settlement.amountPaid)}\n`;
  text += `ငွေပေးနည်းလမ်း: ${settlement.paymentMethod}${settlement.paymentReference ? ` (${settlement.paymentReference})` : ''}\n`;
  text += `လက်ကျန် ကျန်ငွေ: ${formatMMK(settlement.remainingBalance)}\n`;
  text += `--------------------------------\n`;
  text += `အခြေအနေ: ${isFullySettled ? '✓ ကျန်ငွေ အပြီးအပြတ် ရှင်းလင်းပြီး' : '• တစ်စိတ်တစ်ပိုင်း ရှင်းလင်းပြီး'}\n`;
  text += `ငွေလက်ခံသူ: ${settlement.cashierName}\n`;
  if (settlement.notes) {
    text += `မှတ်ချက်: ${settlement.notes}\n`;
  }
  text += `--------------------------------\n`;
  text += `ပေးချေမှုအတွက် ကျေးဇူးတင်ရှိပါသည် 🙏`;

  return text;
}

/**
 * Print a simple monospace thermal slip (used for shift handover, end-of-day summary, etc.)
 */
export function printThermalTextSlip(textContent: string, title = 'အဆိုင်းသိမ်း စာရင်းချုပ်'): void {
  const escapedText = textContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const bodyHtml = `
    <div style="font-family: 'Courier New', Courier, monospace; font-size: 11.5px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; color: #1c1917; padding: 4px;">
${escapedText}
    </div>
  `;

  openPrintWindow({
    title,
    bodyHtml,
    format: 'thermal',
    autoPrint: true,
  });
}

/**
 * Print Workshop Order Slip & Wastage Breakdown (ပန်းထိမ်အပ်နှံလွှာ နှင့် အလျော့တွက်ရှင်းတမ်း)
 */
export function printWorkshopOrderSlip(
  order: WorkshopJobOrder,
  settings: ShopSettings,
  _language: 'my' | 'en' = 'my',
  format: 'thermal' | 'a5' | 'a4' = 'thermal'
): Window | null {
  const isThermal = format === 'thermal';
  const shopTitle = settings.shopNameMm || settings.shopName;
  const isSettled = order.status === 'Received' || order.status === 'Stocked';

  const orderTypeLabel = (() => {
    switch (order.orderType) {
      case 'CustomerOrder':
        return 'ဖောက်သည် အပ်ထည် (Customer Order)';
      case 'StockProduction':
        return 'ဆိုင်တင် စတော့ထုတ်လုပ်ခြင်း (Stock)';
      case 'GoldMelting':
        return 'ရွှေကျို / ရွှေသွန်း (Gold Melting)';
      case 'RepairResize':
        return 'ပြုပြင် / ဆိုဒ်ချိန်ညှိခြင်း (Repair)';
      default:
        return order.orderType;
    }
  })();

  const settledBadgeHtml = isSettled
    ? `<div class="paid-stamp" style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 10px; border: 2.5px solid #059669; border-radius: 10px; background-color: #ecfdf5; transform: rotate(-7deg); margin: 4px 0;">
        <span style="font-weight: 900; color: #047857; font-size: 12px;">✓ စစ်ဆေးပြီးစီး (COMPLETED)</span>
        <span style="font-size: 8.5px; font-family: monospace; font-weight: 800; color: #059669;">DATE: ${order.receivedDate || order.orderDate}</span>
      </div>`
    : `<div style="display: inline-block; padding: 3px 8px; border: 1.5px solid #d97706; border-radius: 6px; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 800;">
        ⏳ အပ်နှံလုပ်ကိုင်ဆဲ (IN PROGRESS)
      </div>`;

  const varianceText = (() => {
    if (order.wastageVarianceYway === undefined || !order.finishedWeight) return 'စစ်ဆေးဆဲ';
    if (order.wastageVarianceYway > 0.05) {
      return `+ ${order.wastageVarianceYway.toFixed(1)} ရွေး (ပေါက်ကြားမှု/လျော့နည်း)`;
    }
    if (Math.abs(order.wastageVarianceYway) <= 0.05) {
      return '၀ ရွေး (အတိအကျ ကိုက်ညီ)';
    }
    return `- ${Math.abs(order.wastageVarianceYway).toFixed(1)} ရွေး (အလျော့သက်သာ)`;
  })();

  const bodyHtml = isThermal
    ? `
    <!-- THERMAL 80MM SLIP LAYOUT -->
    <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 10px; color: #000000;">
      <h1 style="font-size: 16px; font-weight: 900; color: #000000; margin-bottom: 2px;">
        ${shopTitle}
      </h1>
      ${settings.tagline ? `<div style="font-size: 10.5px; font-weight: 700; color: #000000;">${settings.tagline}</div>` : ''}
      ${settings.address ? `<div style="font-size: 9.5px; color: #000000; font-weight: 600;">${settings.address}</div>` : ''}
      <div style="font-size: 10px; font-weight: 700; color: #000000;">ဖုန်း: ${settings.phone}</div>
      <div style="font-size: 11.5px; font-weight: 900; color: #000000; border: 1.5px solid #000000; padding: 3px 6px; border-radius: 4px; margin-top: 6px; display: inline-block;">
        ${isSettled ? 'ပန်းထိမ်ပြီးစီးမှု & အလျော့တွက်ရှင်းတမ်း' : 'ပန်းထိမ်အပ်နှံလွှာ (Work Order Slip)'}
      </div>
      <div style="margin-top: 6px;">${settledBadgeHtml}</div>
    </div>

    <!-- Meta Info -->
    <div style="border-bottom: 1px dashed #000000; padding-bottom: 8px; margin-bottom: 8px; font-size: 11px; color: #000000; line-height: 1.5;">
      <div style="display: flex; justify-content: space-between;">
        <span>ဘောက်ချာအမှတ် / Job No:</span>
        <span style="font-weight: 900; font-family: monospace;">${order.jobNo}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>အပ်နှံရက်:</span>
        <span style="font-weight: 700;">${order.orderDate}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>ပန်းထိမ်ဆရာ:</span>
        <span style="font-weight: 800;">${order.goldsmithName}</span>
      </div>
      ${order.dueDate ? `
      <div style="display: flex; justify-content: space-between;">
        <span>ပြီးစီးရမည့်ရက်:</span>
        <span style="font-weight: 700;">${order.dueDate}</span>
      </div>` : ''}
      ${order.customerName ? `
      <div style="display: flex; justify-content: space-between; border-top: 1px dotted #000000; padding-top: 3px; margin-top: 3px;">
        <span>ဖောက်သည်:</span>
        <span style="font-weight: 800;">${order.customerName} ${order.customerPhone ? `(${order.customerPhone})` : ''}</span>
      </div>` : ''}
    </div>

    <!-- Item Specification -->
    <div style="border: 1.5px solid #000000; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; font-size: 11px; color: #000000;">
      <div style="font-weight: 900; font-size: 12px; margin-bottom: 2px;">${order.title}</div>
      <div style="display: flex; justify-content: space-between; color: #000000; font-weight: 600;">
        <span>အမျိုးအစား: <strong>${order.category}</strong></span>
        <span>ရွှေရည်: <strong>${getPurityLabel(order.purity)}</strong></span>
      </div>
      <div style="font-size: 10px; margin-top: 2px;">
        <span>လုပ်ငန်း: <strong>${orderTypeLabel}</strong></span>
        ${order.givenDescription ? ` • <span style="font-weight: 600;">အပ်ရွှေ: ${order.givenDescription}</span>` : ''}
      </div>
    </div>

    <!-- Weight & Wastage Matrix -->
    <div style="border: 1.5px solid #000000; border-radius: 4px; overflow: hidden; margin-bottom: 8px; font-size: 10.5px; color: #000000;">
      <div style="background-color: #f3f4f6; font-weight: 900; padding: 4px 6px; border-bottom: 1.5px solid #000000; display: flex; justify-content: space-between;">
        <span>ရွှေချိန် & အလျော့တွက် စစ်ဆေးမှု</span>
        <span>အလေးချိန်</span>
      </div>
      <div style="padding: 4px 6px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb;">
        <span>၁။ ထုတ်ပေးအပ်ရွှေချိန်:</span>
        <span style="font-weight: 900; font-family: monospace;">${formatWeightMm(order.givenWeight)} (~${weightToGrams(order.givenWeight)}g)</span>
      </div>
      <div style="padding: 4px 6px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb;">
        <span>၂။ သတ်မှတ်ခွင့်ပြု အလျော့တွက်:</span>
        <span style="font-weight: 800; font-family: monospace;">${formatWeightMm(order.allowedWastage)}</span>
      </div>
      ${order.finishedWeight ? `
      <div style="padding: 4px 6px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; background-color: #fafaf9;">
        <span>၃။ ပြီးစီးထည် ရွှေချိန်:</span>
        <span style="font-weight: 900; font-family: monospace;">${formatWeightMm(order.finishedWeight)}</span>
      </div>
      ${order.scrapWeight && (order.scrapWeight.kyat > 0 || order.scrapWeight.pe > 0 || order.scrapWeight.yway > 0) ? `
      <div style="padding: 4px 6px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb;">
        <span>၄။ ပြန်အပ် ရွှေစ/အပို:</span>
        <span style="font-weight: 800; font-family: monospace;">${formatWeightMm(order.scrapWeight)}</span>
      </div>` : ''}
      ${order.actualLossWeight ? `
      <div style="padding: 4px 6px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb;">
        <span>၅။ အမှန်တကယ် လျော့နည်းမှု:</span>
        <span style="font-weight: 800; font-family: monospace;">${formatWeightMm(order.actualLossWeight)}</span>
      </div>` : ''}
      <div style="padding: 4px 6px; display: flex; justify-content: space-between; font-weight: 900; background-color: #f5f5f4;">
        <span>၆။ အလျော့တွက် ကွာဟချက်:</span>
        <span>${varianceText}</span>
      </div>
      ` : `
      <div style="padding: 6px; text-align: center; font-style: italic; color: #44403c;">
        (လက်ရှိ ပြုလုပ်ဆဲဖြစ်ပြီး အထည်ပြန်အပ်ချိန်တွင် အပြီးသတ် စစ်ဆေးပါမည်)
      </div>
      `}
    </div>

    <!-- Labor Charges & Settlement -->
    <div style="border: 1.5px solid #000000; border-radius: 4px; padding: 6px 8px; margin-bottom: 10px; font-size: 11px; color: #000000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>ပန်းထိမ်လက်ခ စုစုပေါင်း:</span>
        <span style="font-weight: 900;">${formatMMK(order.totalLaborCharge)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>ပေးချေပြီး လက်ခ:</span>
        <span style="font-weight: 800;">${formatMMK(order.paidLaborCharge)}</span>
      </div>
      ${order.shortagePenalty ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>ရွှေပေါက်ကြားမှု နုတ်ယူငွေ:</span>
        <span style="font-weight: 800;">-${formatMMK(order.shortagePenalty)}</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000000; padding-top: 4px; margin-top: 3px; font-weight: 900; font-size: 12px;">
        <span>ရှင်းရန်ကျန် လက်ခ:</span>
        <span style="font-size: 13px;">${formatMMK(order.balanceLaborCharge)}</span>
      </div>
    </div>

    ${order.notes ? `
    <div style="font-size: 10px; color: #000000; font-weight: 600; margin-bottom: 8px; border-left: 2px solid #000000; padding-left: 6px;">
      မှတ်ချက်: ${order.notes}
    </div>` : ''}

    <!-- Signatures -->
    <div style="display: flex; justify-content: space-around; text-align: center; font-size: 10.5px; border-top: 1px dashed #000000; padding-top: 14px; margin-top: 10px;">
      <div style="width: 45%;">
        <div style="border-bottom: 1px solid #000000; margin-bottom: 4px;"></div>
        <div style="font-weight: 800;">ပန်းထိမ်ဆရာ လက်မှတ်</div>
      </div>
      <div style="width: 45%;">
        <div style="border-bottom: 1px solid #000000; margin-bottom: 4px;"></div>
        <div style="font-weight: 800;">ဆိုင်တာဝန်ခံ လက်မှတ်</div>
      </div>
    </div>
    <div style="text-align: center; font-size: 9px; color: #000000; margin-top: 8px; font-family: monospace;">
      ${order.jobNo} • ${order.createdAt}
    </div>
  `
    : `
    <!-- A5 FORMAL WORKSHOP ORDER SHEET -->
    <div style="border-bottom: 2.5px solid #000000; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; color: #000000;">
      <div>
        <h1 style="font-size: 20px; font-weight: 900; color: #000000; margin-bottom: 2px;">
          ${shopTitle}
        </h1>
        <div style="font-size: 12px; font-weight: 700; color: #000000;">${settings.tagline}</div>
        <div style="font-size: 11px; font-weight: 600; color: #000000;">${settings.address} • ဖုန်း: ${settings.phone}</div>
      </div>
      <div style="text-align: right;">
        <div class="badge-tag" style="display: inline-block; background-color: #f3f4f6; color: #000000; border: 1.5px solid #000000; font-weight: 900; font-size: 12px; padding: 4px 10px; border-radius: 6px; margin-bottom: 4px;">
          ${isSettled ? 'ပန်းထိမ်ပြီးစီးမှု & အလျော့တွက်ရှင်းတမ်း (A5)' : 'ပန်းထိမ်အပ်နှံလွှာ (A5)'}
        </div>
        <div style="font-size: 13px; font-weight: 900; font-family: monospace;">
          Job No: ${order.jobNo}
        </div>
        <div style="font-size: 11px; font-weight: 700;">ရက်စွဲ: ${order.orderDate}</div>
      </div>
    </div>

    <!-- Meta Details Box -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background-color: #fafaf9; border: 1.5px solid #000000; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 11.5px; color: #000000;">
      <div>
        <div>ပန်းထိမ်ဆရာ / အလုပ်ရုံ: <strong style="font-size: 12.5px;">${order.goldsmithName}</strong></div>
        <div>ပြီးစီးရမည့်ရက်: <strong>${order.dueDate || 'သတ်မှတ်မထားပါ'}</strong></div>
        <div>လုပ်ငန်းအမျိုးအစား: <strong>${orderTypeLabel}</strong></div>
      </div>
      <div>
        ${order.customerName ? `
        <div>အပ်နှံသူ ဖောက်သည်: <strong>${order.customerName}</strong> ${order.customerPhone ? `(${order.customerPhone})` : ''}</div>
        ${order.depositAmount ? `<div>ဖောက်သည် စရန်ငွေ: <strong style="color: #047857;">${formatMMK(order.depositAmount)}</strong></div>` : ''}
        ` : '<div>အပ်နှံမှုပုံစံ: <strong>ဆိုင်တင်ထုတ်လုပ်မှု</strong></div>'}
        <div>စာရင်းသွင်းသူ: <strong>${order.assignedBy}</strong></div>
      </div>
    </div>

    <!-- Item Specification Banner -->
    <div style="border: 1.5px solid #000000; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 12px; color: #000000; background-color: #ffffff;">
      <div style="font-size: 14px; font-weight: 900; margin-bottom: 3px;">
        အပ်ထည်: ${order.title}
      </div>
      <div style="display: flex; gap: 16px; font-size: 11.5px; font-weight: 700;">
        <span>အမျိုးအစား: ${order.category}</span>
        <span>ရွှေရည်: ${getPurityLabel(order.purity)}</span>
        ${order.givenDescription ? `<span>အပ်ရွှေအမျိုးအစား: ${order.givenDescription}</span>` : ''}
      </div>
    </div>

    <!-- Full Table Matrix -->
    <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; margin-bottom: 12px; font-size: 11.5px;">
      <thead>
        <tr style="background-color: #f3f4f6; border-bottom: 1.5px solid #000000; text-align: left;">
          <th style="padding: 6px 10px; border-right: 1px solid #000000; font-weight: 800;">အဆင့် / အချက်အလက်</th>
          <th style="padding: 6px 10px; text-align: right; font-weight: 800;">ရွှေချိန် / အလေးချိန်</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #000000;">
          <td style="padding: 6px 10px; border-right: 1px solid #000000; font-weight: 600;">၁။ ထုတ်ပေးလိုက်သော အပ်ရွှေချိန် (Given Raw Weight):</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 900; font-family: monospace;">${formatWeightMm(order.givenWeight)} (~${weightToGrams(order.givenWeight)}g)</td>
        </tr>
        <tr style="border-bottom: 1px solid #000000;">
          <td style="padding: 6px 10px; border-right: 1px solid #000000; font-weight: 600;">၂။ သတ်မှတ်ခွင့်ပြု အလျော့တွက် (Allowed Wastage Tolerance):</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; font-family: monospace;">${formatWeightMm(order.allowedWastage)}</td>
        </tr>
        ${order.finishedWeight ? `
        <tr style="border-bottom: 1px solid #000000; background-color: #f9fafb;">
          <td style="padding: 6px 10px; border-right: 1px solid #000000; font-weight: 700;">၃။ ပြီးစီး၍ ပြန်အပ်သော အထည်ရွှေချိန် (Finished Net Weight):</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 900; font-family: monospace;">${formatWeightMm(order.finishedWeight)} (~${weightToGrams(order.finishedWeight)}g)</td>
        </tr>
        ${order.scrapWeight && (order.scrapWeight.kyat > 0 || order.scrapWeight.pe > 0 || order.scrapWeight.yway > 0) ? `
        <tr style="border-bottom: 1px solid #000000;">
          <td style="padding: 6px 10px; border-right: 1px solid #000000; font-weight: 600;">၄။ ပြန်အပ်သော ရွှေစ / ရွှေအပို (Returned Scrap):</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; font-family: monospace;">${formatWeightMm(order.scrapWeight)}</td>
        </tr>` : ''}
        ${order.actualLossWeight ? `
        <tr style="border-bottom: 1px solid #000000;">
          <td style="padding: 6px 10px; border-right: 1px solid #000000; font-weight: 600;">၅။ အမှန်တကယ် လျော့နည်းသွားမှု (Actual Loss):</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; font-family: monospace;">${formatWeightMm(order.actualLossWeight)}</td>
        </tr>` : ''}
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 6px 10px; border-right: 1px solid #000000; font-weight: 900;">၆။ အလျော့တွက် ကွာဟချက် (Wastage Variance):</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 900;">${varianceText}</td>
        </tr>
        ` : `
        <tr>
          <td colspan="2" style="padding: 10px; text-align: center; font-style: italic; color: #57534e;">
            (ပန်းထိမ်လုပ်ငန်းခွင်၌ ပြုလုပ်ဆဲဖြစ်ပြီး အထည်လက်ခံချိန်တွင် အပြီးသတ် စစ်ဆေးရှင်းလင်းပါမည်)
          </td>
        </tr>
        `}
      </tbody>
    </table>

    <!-- Financials & Signatures Container -->
    <div style="display: flex; gap: 14px; margin-bottom: 12px;">
      <!-- Financial Breakdown -->
      <div style="flex: 1; border: 1.5px solid #000000; border-radius: 6px; padding: 8px 12px; font-size: 11.5px;">
        <div style="font-weight: 900; margin-bottom: 6px; border-bottom: 1px solid #000000; padding-bottom: 3px;">
          ပန်းထိမ်လက်ခ စာရင်း (Labor Charges)
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>စုစုပေါင်း လက်ခ:</span>
          <span style="font-weight: 800;">${formatMMK(order.totalLaborCharge)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>ရှင်းပြီး လက်ခ:</span>
          <span style="font-weight: 800;">${formatMMK(order.paidLaborCharge)}</span>
        </div>
        ${order.shortagePenalty ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>ရွှေပေါက်ကြားမှု နုတ်ငွေ:</span>
          <span style="font-weight: 800;">-${formatMMK(order.shortagePenalty)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000000; padding-top: 4px; margin-top: 4px; font-weight: 900; font-size: 13px;">
          <span>ရှင်းရန်ကျန်ငွေ:</span>
          <span style="font-size: 14px;">${formatMMK(order.balanceLaborCharge)}</span>
        </div>
      </div>

      <!-- Signatures Box -->
      <div style="flex: 1; border: 1.5px solid #000000; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; font-size: 11.5px;">
        <div style="display: flex; justify-content: space-around; text-align: center; margin-top: 24px;">
          <div style="width: 44%;">
            <div style="border-bottom: 1.5px solid #000000; margin-bottom: 4px;"></div>
            <div style="font-weight: 800;">ပန်းထိမ်ဆရာ လက်မှတ်</div>
          </div>
          <div style="width: 44%;">
            <div style="border-bottom: 1.5px solid #000000; margin-bottom: 4px;"></div>
            <div style="font-weight: 800;">ဆိုင်တာဝန်ခံ လက်မှတ်</div>
          </div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #44403c; margin-top: 8px;">
          ${order.jobNo} • ${order.createdAt}
        </div>
      </div>
    </div>
  `;

  return openPrintWindow({
    title: `ပန်းထိမ်အော်ဒါ ${order.jobNo} - ${settings.shopName}`,
    bodyHtml,
    format,
    autoPrint: true,
  });
}

/**
 * Format a Workshop Order into clean text for Viber / Telegram / SMS
 */
export function formatWorkshopOrderToText(
  order: WorkshopJobOrder,
  settings: ShopSettings,
  _language: 'my' | 'en' = 'my'
): string {
  const shopTitle = settings.shopNameMm || settings.shopName;
  const isSettled = order.status === 'Received' || order.status === 'Stocked';

  let text = `🔨 ${shopTitle} 🔨\n`;
  text += `${isSettled ? 'ပန်းထိမ်ပြီးစီးမှု & အလျော့တွက်ရှင်းတမ်း' : 'ပန်းထိမ်အပ်နှံလွှာ (Workshop Order)'}\n`;
  text += `--------------------------------\n`;
  text += `ဘောက်ချာ / Job No: ${order.jobNo}\n`;
  text += `အပ်နှံရက်: ${order.orderDate}\n`;
  text += `ပန်းထိမ်ဆရာ: ${order.goldsmithName}\n`;
  if (order.customerName) {
    text += `ဖောက်သည်: ${order.customerName}${order.customerPhone ? ` (${order.customerPhone})` : ''}\n`;
  }
  text += `--------------------------------\n`;
  text += `အထည်: ${order.title} (${order.category})\n`;
  text += `ရွှေရည်: ${getPurityLabel(order.purity)}\n`;
  text += `၁။ ထုတ်ပေးအပ်ရွှေချိန်: ${formatWeightMm(order.givenWeight)} (~${weightToGrams(order.givenWeight)}g)\n`;
  text += `၂။ သတ်မှတ်အလျော့တွက်: ${formatWeightMm(order.allowedWastage)}\n`;
  if (order.finishedWeight) {
    text += `၃။ ပြီးစီးထည်ရွှေချိန်: ${formatWeightMm(order.finishedWeight)}\n`;
    if (order.scrapWeight && (order.scrapWeight.kyat > 0 || order.scrapWeight.pe > 0 || order.scrapWeight.yway > 0)) {
      text += `၄။ ပြန်အပ်ရွှေစ: ${formatWeightMm(order.scrapWeight)}\n`;
    }
    if (order.actualLossWeight) {
      text += `၅။ အမှန်တကယ်လျော့နည်းမှု: ${formatWeightMm(order.actualLossWeight)}\n`;
    }
  }
  text += `--------------------------------\n`;
  text += `ပန်းထိမ်လက်ခ စုစုပေါင်း: ${formatMMK(order.totalLaborCharge)}\n`;
  text += `ရှင်းပြီးလက်ခ: ${formatMMK(order.paidLaborCharge)}\n`;
  if (order.shortagePenalty) {
    text += `ရွှေပေါက်ကြားမှုနုတ်ငွေ: -${formatMMK(order.shortagePenalty)}\n`;
  }
  text += `👉 လက်ကျန်ငွေ ရှင်းရန်: ${formatMMK(order.balanceLaborCharge)}\n`;
  text += `--------------------------------\n`;
  text += `အခြေအနေ: ${isSettled ? '✓ အပြီးသတ် စစ်ဆေးလက်ခံပြီး' : '⏳ ပြုလုပ်ဆဲ'}\n`;
  if (order.notes) {
    text += `မှတ်ချက်: ${order.notes}\n`;
  }
  return text;
}

