import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFetch } from '../useFetch';
import { usePagination } from '../usePagination';
import { useModal, useModals } from '../useModal';
import { useDebounce, useDebouncedCallback } from '../useDebounce';

describe('useFetch', () => {
  it('should fetch data and update state', async () => {
    const mockData = { id: 1, name: 'Test' };
    const fetchFn = vi.fn().mockResolvedValue({ data: { data: mockData } });

    const { result } = renderHook(() => useFetch(fetchFn));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFetch(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should use default data', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: null });

    const { result } = renderHook(() =>
      useFetch(fetchFn, { defaultData: [] })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should refetch on manual call', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: { data: { count: 1 } } });

    const { result } = renderHook(() => useFetch(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  it('should not fetch when immediate is false', () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: {} });

    renderHook(() => useFetch(fetchFn, { immediate: false }));

    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('usePagination', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(20);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPages).toBe(1);
  });

  it('should initialize with custom values', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 2, limit: 10, total: 50 })
    );

    expect(result.current.page).toBe(2);
    expect(result.current.limit).toBe(10);
    expect(result.current.total).toBe(50);
    expect(result.current.totalPages).toBe(5);
  });

  it('should navigate pages correctly', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 100, limit: 10 })
    );

    expect(result.current.page).toBe(1);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.hasPrevPage).toBe(true);

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.page).toBe(1);
  });

  it('should calculate offset correctly', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 100, limit: 10 })
    );

    expect(result.current.offset).toBe(0);

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.offset).toBe(20);
  });

  it('should not go beyond bounds', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 30, limit: 10 })
    );

    act(() => {
      result.current.setPage(10);
    });

    expect(result.current.page).toBe(3); // Max page

    act(() => {
      result.current.setPage(-1);
    });

    expect(result.current.page).toBe(1); // Min page
  });

  it('should calculate range correctly', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 55, limit: 20 })
    );

    expect(result.current.range).toEqual({ start: 1, end: 20 });

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.range).toEqual({ start: 41, end: 55 });
  });
});

describe('useModal', () => {
  it('should initialize as closed', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should open and close modal', () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should open with data', () => {
    const { result } = renderHook(() => useModal());
    const testData = { patientId: 123 };

    act(() => {
      result.current.open(testData);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual(testData);
  });

  it('should toggle modal', () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
  });
});

describe('useModals', () => {
  it('should manage multiple modals', () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.open('edit', { id: 1 });
    });

    expect(result.current.isOpen('edit')).toBe(true);
    expect(result.current.isOpen('delete')).toBe(false);
    expect(result.current.getData('edit')).toEqual({ id: 1 });

    act(() => {
      result.current.open('delete', { id: 2 });
    });

    expect(result.current.isOpen('edit')).toBe(true);
    expect(result.current.isOpen('delete')).toBe(true);
  });

  it('should close specific modal', () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.open('edit');
      result.current.open('delete');
    });

    act(() => {
      result.current.close('edit');
    });

    expect(result.current.isOpen('edit')).toBe(false);
    expect(result.current.isOpen('delete')).toBe(true);
  });

  it('should close all modals', () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.open('edit');
      result.current.open('delete');
      result.current.open('confirm');
    });

    act(() => {
      result.current.closeAll();
    });

    expect(result.current.isOpen('edit')).toBe(false);
    expect(result.current.isOpen('delete')).toBe(false);
    expect(result.current.isOpen('confirm')).toBe(false);
  });
});

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timer on new value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'c' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('a'); // Still waiting

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('c');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();

    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });

  it('should allow cancellation', () => {
    const callback = vi.fn();

    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('test');
    });

    act(() => {
      result.current.cancel();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
