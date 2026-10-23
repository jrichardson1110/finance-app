import { describe, expect, it } from 'vitest';
import { axisScale } from './ChangeBarChart';

describe('axisScale', () => {
  it('adds headroom on both sides and always includes a zero tick when values have mixed signs', () => {
    const { domain, ticks } = axisScale([1.5, -2.04]);
    expect(domain[0]).toBeLessThan(-2.04);
    expect(domain[1]).toBeGreaterThan(1.5);
    expect(domain[0]).toBe(-domain[1]);
    expect(ticks).toContain(0);
  });

  it('starts at zero when every value is a gain', () => {
    const { domain, ticks } = axisScale([7.86, 52.61]);
    expect(domain[0]).toBe(0);
    expect(domain[1]).toBeGreaterThan(52.61);
    expect(ticks[0]).toBe(0);
  });

  it('ends at zero when every value is a loss', () => {
    const { domain } = axisScale([-3, -1]);
    expect(domain[1]).toBe(0);
    expect(domain[0]).toBeLessThan(-3);
  });

  it('keeps a usable range when there is no movement', () => {
    const { domain, ticks } = axisScale([0, 0]);
    expect(domain).toEqual([0, 0]);
    expect(ticks).toEqual([0]);
  });
});
