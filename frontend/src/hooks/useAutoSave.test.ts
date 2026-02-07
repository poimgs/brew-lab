import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not save when not enabled', async () => {
    const onSave = vi.fn();
    const getFormData = vi.fn().mockReturnValue({ coffee_id: 'c1' });

    renderHook(() =>
      useAutoSave({
        intervalMs: 1000,
        onSave,
        enabled: false,
        getFormData,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save when form data has not changed', async () => {
    const onSave = vi.fn().mockResolvedValue('draft-1');
    const data = { coffee_id: 'c1', grind_size: 3.5 };
    const getFormData = vi.fn().mockReturnValue(data);

    renderHook(() =>
      useAutoSave({
        intervalMs: 1000,
        onSave,
        enabled: true,
        getFormData,
      })
    );

    // First save — data is new
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    // Second tick — data has not changed
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('creates draft on first save (returns ID)', async () => {
    const onSave = vi.fn().mockResolvedValue('draft-1');
    const getFormData = vi.fn().mockReturnValue({ coffee_id: 'c1' });

    const { result } = renderHook(() =>
      useAutoSave({
        intervalMs: 1000,
        onSave,
        enabled: true,
        getFormData,
      })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.draftId).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledWith({ coffee_id: 'c1' });
    expect(result.current.draftId).toBe('draft-1');
    expect(result.current.status).toBe('saved');
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('saves again when form data changes', async () => {
    const onSave = vi.fn().mockResolvedValue('draft-1');
    let data: Record<string, unknown> = { coffee_id: 'c1', grind_size: 3.5 };
    const getFormData = vi.fn().mockImplementation(() => data);

    renderHook(() =>
      useAutoSave({
        intervalMs: 1000,
        onSave,
        enabled: true,
        getFormData,
      })
    );

    // First save
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    // Change data
    data = { coffee_id: 'c1', grind_size: 4.0 };

    // Second tick — data changed, should save again
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('returns saved status with timestamp after save', async () => {
    const onSave = vi.fn().mockResolvedValue('draft-1');
    const getFormData = vi.fn().mockReturnValue({ coffee_id: 'c1' });

    const { result } = renderHook(() =>
      useAutoSave({
        intervalMs: 1000,
        onSave,
        enabled: true,
        getFormData,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe('saved');
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('handles save errors gracefully', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
    const getFormData = vi.fn().mockReturnValue({ coffee_id: 'c1' });

    const { result } = renderHook(() =>
      useAutoSave({
        intervalMs: 1000,
        onSave,
        enabled: true,
        getFormData,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.draftId).toBeNull();
  });

  it('stops interval when enabled becomes false', async () => {
    const onSave = vi.fn().mockResolvedValue('draft-1');
    const getFormData = vi.fn().mockReturnValue({ coffee_id: 'c1' });
    let enabled = true;

    const { rerender } = renderHook(() =>
      useAutoSave({
        intervalMs: 1000,
        onSave,
        enabled,
        getFormData,
      })
    );

    // First save
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    // Disable auto-save
    enabled = false;
    rerender();

    // Change data to ensure it would save if still active
    getFormData.mockReturnValue({ coffee_id: 'c1', grind_size: 5.0 });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Should not have saved again
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
