/**
 * ==========================================================
 * GOLD SHOP SYSTEM & AUDIT LOGGER SERVICE
 * ==========================================================
 * Silently records user actions, system operations, and errors
 * in a local circular buffer (max 200 entries) with one-click
 * export and download capabilities for admin troubleshooting.
 */

export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory =
  | 'AUTH'
  | 'SALE'
  | 'PURCHASE'
  | 'PRICE'
  | 'STORE_STATUS'
  | 'SYNC'
  | 'SYSTEM'
  | 'INVENTORY'
  | 'WORKSHOP'
  | 'SETTINGS';

export interface SystemLogEntry {
  id: string;
  timestamp: string; // ISO format
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  userId?: string;
  userName?: string;
  userRole?: string;
  counterId?: string;
}

const STORAGE_KEY = 'gold_shop_pos_audit_logs';
const MAX_LOGS = 200;

// Safe localStorage access
function getStoredLogs(): SystemLogEntry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read stored logs:', err);
  }
  return [];
}

function saveLogs(logs: SystemLogEntry[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Keep only the most recent MAX_LOGS
      const trimmed = logs.slice(0, MAX_LOGS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch (err) {
    console.warn('Could not save logs:', err);
  }
}

/**
 * Record a new system log entry
 */
export function recordLog(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: any,
  meta?: {
    userId?: string;
    userName?: string;
    userRole?: string;
    counterId?: string;
  }
): SystemLogEntry {
  const entry: SystemLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : details) : undefined,
    userId: meta?.userId,
    userName: meta?.userName,
    userRole: meta?.userRole,
    counterId: meta?.counterId,
  };

  const existing = getStoredLogs();
  const updated = [entry, ...existing];
  saveLogs(updated);

  // Also log to console in development
  if (level === 'error') {
    console.error(`[AUDIT:${category}] ${message}`, details || '');
  } else if (level === 'warn') {
    console.warn(`[AUDIT:${category}] ${message}`, details || '');
  }

  return entry;
}

/**
 * Retrieve all recorded logs
 */
export function getSystemLogs(): SystemLogEntry[] {
  return getStoredLogs();
}

/**
 * Clear all stored logs
 */
export function clearSystemLogs(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Could not clear logs:', err);
  }
}

/**
 * Generate a formatted plain text diagnostic log report
 */
export function generateLogReportText(): string {
  const logs = getStoredLogs();
  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;
  const infoCount = logs.filter((l) => l.level === 'info').length;

  const header = [
    '====================================================================',
    '       ရွှေရတနာ ရွှေဆိုင် POS စနစ် - SYSTEM & AUDIT DIAGNOSTIC LOGS       ',
    '====================================================================',
    `Export Date & Time : ${new Date().toLocaleString()}`,
    `ISO Timestamp      : ${new Date().toISOString()}`,
    `Total Log Entries  : ${logs.length}`,
    `Errors             : ${errorCount}`,
    `Warnings           : ${warnCount}`,
    `Info Records       : ${infoCount}`,
    `Platform / Agent   : ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}`,
    `Screen Size        : ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown'}`,
    '====================================================================\n',
  ].join('\n');

  if (logs.length === 0) {
    return header + 'မှတ်တမ်းများ မရှိသေးပါ (No log entries recorded yet).\n';
  }

  const entriesText = logs
    .map((log, index) => {
      const time = new Date(log.timestamp).toLocaleString();
      const meta = [
        log.counterId ? `[Counter: ${log.counterId}]` : '',
        log.userName ? `[User: ${log.userName} (${log.userRole || 'Staff'})]` : '',
      ]
        .filter(Boolean)
        .join(' ');

      let text = `[#${logs.length - index}] [${log.level.toUpperCase()}] [${log.category}] ${time} ${meta}\n  Message: ${log.message}`;
      if (log.details) {
        try {
          const detailStr =
            typeof log.details === 'string'
              ? log.details
              : JSON.stringify(log.details, null, 2);
          text += `\n  Details: ${detailStr}`;
        } catch {
          text += `\n  Details: ${String(log.details)}`;
        }
      }
      return text;
    })
    .join('\n--------------------------------------------------------------------\n');

  return header + entriesText + '\n\n==================== END OF LOG REPORT ====================\n';
}

/**
 * Trigger file download of diagnostic logs
 */
export function downloadSystemLogs(format: 'txt' | 'json' = 'txt'): void {
  if (typeof window === 'undefined') return;

  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `gold_pos_logs_${dateStr}_${timeStr}.${format}`;

  let content = '';
  let mimeType = '';

  if (format === 'json') {
    content = JSON.stringify(getStoredLogs(), null, 2);
    mimeType = 'application/json';
  } else {
    content = generateLogReportText();
    mimeType = 'text/plain;charset=utf-8';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy log report text directly to clipboard
 */
export async function copySystemLogsToClipboard(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    const text = generateLogReportText();
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('Failed to copy logs to clipboard:', err);
    return false;
  }
}

/**
 * Global unhandled error listener setup
 */
let isListenerAttached = false;
export function initGlobalErrorLogging(): void {
  if (isListenerAttached || typeof window === 'undefined') return;
  isListenerAttached = true;

  window.addEventListener('error', (event) => {
    // Ignore harmless cross-origin script errors or browser extension scripts
    if (!event.message || event.message === 'Script error.') return;

    recordLog('error', 'SYSTEM', `Uncaught Error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason) || 'Unhandled Promise Rejection';

    // Ignore pending Supabase table setup / schema-cache notices while user is setting up SQL schema
    if (
      msg.includes('schema cache') ||
      msg.includes('PGRST205') ||
      msg.includes('does not exist') ||
      reason?.code === 'PGRST205'
    ) {
      console.warn('Supabase schema cache pending notice:', msg);
      return;
    }

    // Catch network / fetch drops
    recordLog('error', 'SYNC', `Network / Promise Error: ${msg}`, {
      stack: reason?.stack,
      name: reason?.name,
    });
  });
}
