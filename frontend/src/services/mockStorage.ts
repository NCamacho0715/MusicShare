import type { AlertNotification } from '../types/models';
import { getDueDateStatus } from '../utils/formatters';
import {
  createSeedState,
  DEMO_USER_PASSWORD,
  type MockDatabaseState,
} from './mockSeed';

const STORAGE_KEY = 'musicshare_v1_db';

let memoryDb: MockDatabaseState | null = null;

function cloneState(state: MockDatabaseState): MockDatabaseState {
  return JSON.parse(JSON.stringify(state)) as MockDatabaseState;
}

export function loadMockDatabase(): MockDatabaseState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDatabaseState;
        if (
          parsed &&
          Array.isArray(parsed.users) &&
          Array.isArray(parsed.instruments) &&
          Array.isArray(parsed.loans) &&
          Array.isArray(parsed.alerts)
        ) {
          if (!parsed.credentials || typeof parsed.credentials !== 'object') {
            parsed.credentials = {};
            for (const user of parsed.users) {
              parsed.credentials[user.email.toLowerCase()] = DEMO_USER_PASSWORD;
            }
          }
          memoryDb = parsed;
          return cloneState(parsed);
        }
      }
    }
  } catch {
    // Fallback to seed state if storage is unreadable
  }

  const seeded = memoryDb ?? createSeedState();
  saveMockDatabase(seeded);
  return cloneState(seeded);
}

export function saveMockDatabase(state: MockDatabaseState): void {
  const snapshot = cloneState(state);
  memoryDb = snapshot;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }
  } catch {
    // Ignore localStorage quota errors (in-memory DB remains active)
  }
}

export function resetMockDatabase(): MockDatabaseState {
  const fresh = createSeedState();
  saveMockDatabase(fresh);
  return cloneState(fresh);
}

export function evaluateDueLoans(
  state: MockDatabaseState,
  now: Date = new Date(),
): { state: MockDatabaseState; createdAlerts: AlertNotification[] } {
  const next = cloneState(state);
  const createdAlerts: AlertNotification[] = [];

  for (const loan of next.loans) {
    if (loan.status !== 'activo') continue;

    const dueStatus = getDueDateStatus(loan.dueDate, now);
    if (!dueStatus.isOverdue && !dueStatus.isDueSoon) continue;

    const targetType = dueStatus.isOverdue ? 'overdue' : 'due_soon';
    const alreadyExists = next.alerts.some(
      (alert) => alert.loanId === loan.id && alert.type === targetType,
    );
    if (alreadyExists) continue;

    const instrumentName = loan.instrumentName ?? 'Instrumento';
    const newAlert: AlertNotification = {
      id: `alert-${targetType}-${loan.id}-${Date.now()}`,
      type: targetType,
      severity: dueStatus.isOverdue ? 'critical' : 'warning',
      source: 'eventbridge',
      channel: 'sns_email',
      loanId: loan.id,
      instrumentId: loan.instrumentId,
      recipientUserId: loan.borrowerId,
      title: dueStatus.isOverdue
        ? `Préstamo vencido: ${instrumentName}`
        : `Devolución próxima: ${instrumentName}`,
      message: dueStatus.isOverdue
        ? `${dueStatus.label}. Coordina la devolución con ${loan.ownerName ?? 'el propietario'}.`
        : `${dueStatus.label}. Recuerda devolver el instrumento en buen estado.`,
      read: false,
      createdAt: now.toISOString(),
    };

    next.alerts.unshift(newAlert);
    createdAlerts.push(newAlert);
  }

  return { state: next, createdAlerts };
}

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.82,
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return rawDataUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.startsWith('data:image/') ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
