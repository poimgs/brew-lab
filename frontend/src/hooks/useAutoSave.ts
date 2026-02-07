import { useState, useRef, useEffect, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  intervalMs: number;
  onSave: (data: Record<string, unknown>) => Promise<string>;
  enabled: boolean;
  getFormData: () => Record<string, unknown>;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  draftId: string | null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

export function useAutoSave({
  intervalMs,
  onSave,
  enabled,
  getFormData,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const lastSavedDataRef = useRef<Record<string, unknown> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = useCallback(async () => {
    if (!enabled) return;

    const currentData = getFormData();

    // Skip if data hasn't changed since last save
    if (lastSavedDataRef.current && deepEqual(currentData, lastSavedDataRef.current)) {
      return;
    }

    setStatus('saving');
    try {
      const id = await onSave(currentData);
      setDraftId(id);
      lastSavedDataRef.current = structuredClone(currentData);
      setLastSavedAt(new Date());
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [enabled, getFormData, onSave]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(save, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, save]);

  return { status, lastSavedAt, draftId };
}
