import { getContainerScale } from '../src/utils/getContainerScale.js';

describe('getContainerScale', () => {
  test('returns 1 for null input', () => {
    expect(getContainerScale(null)).toBe(1);
  });

  test('returns 1 for undefined input', () => {
    expect(getContainerScale(undefined)).toBe(1);
  });

  test('returns 1 for element with zero offsetWidth', () => {
    const el = { offsetWidth: 0, getBoundingClientRect: () => ({ width: 0 }) };
    expect(getContainerScale(el)).toBe(1);
  });

  test('returns 1 when no scaling applied (rect width equals offsetWidth)', () => {
    const el = { offsetWidth: 816, getBoundingClientRect: () => ({ width: 816 }) };
    expect(getContainerScale(el)).toBe(1);
  });

  test('returns correct scale factor for scaled element', () => {
    const el = { offsetWidth: 816, getBoundingClientRect: () => ({ width: 1224 }) };
    expect(getContainerScale(el)).toBeCloseTo(1.5);
  });

  test('returns correct scale factor for scale < 1', () => {
    const el = { offsetWidth: 816, getBoundingClientRect: () => ({ width: 408 }) };
    expect(getContainerScale(el)).toBeCloseTo(0.5);
  });
});
