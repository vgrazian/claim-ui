import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeekNavigation } from '../hooks/useData';
import { getWeekStart, formatDate } from '../services/claims';

describe('useWeekNavigation', () => {
  it('should initialize with current week', () => {
    const { result } = renderHook(() => useWeekNavigation(new Date(2025, 6, 24, 12)));
    expect(formatDate(result.current.weekStart)).toBe('2025-07-21');
  });

  it('should navigate to previous week', () => {
    const { result } = renderHook(() => useWeekNavigation(new Date(2025, 6, 24, 12)));

    act(() => {
      result.current.goToPreviousWeek();
    });

    expect(formatDate(result.current.weekStart)).toBe('2025-07-14');
  });

  it('should navigate to next week', () => {
    const { result } = renderHook(() => useWeekNavigation(new Date(2025, 6, 24, 12)));

    act(() => {
      result.current.goToNextWeek();
    });

    expect(formatDate(result.current.weekStart)).toBe('2025-07-28');
  });

  it('should go to today', () => {
    const { result } = renderHook(() => useWeekNavigation(new Date(2025, 0, 1, 12)));

    act(() => {
      result.current.goToToday();
    });

    const today = new Date();
    const expectedStart = formatDate(getWeekStart(today));
    expect(formatDate(result.current.weekStart)).toBe(expectedStart);
  });
});
