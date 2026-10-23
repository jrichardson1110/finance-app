import { describe, expect, it, vi } from 'vitest';
import { createTtlCache } from './cache.ts';

describe('createTtlCache', () => {
  it('serves a fresh value without reloading', async () => {
    const cache = createTtlCache(() => 1000);
    const load = vi.fn().mockResolvedValue('v');
    await cache.getOrLoad('k', 500, load);
    await cache.getOrLoad('k', 500, load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads after the ttl expires', async () => {
    let now = 0;
    const cache = createTtlCache(() => now);
    const load = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b');
    expect(await cache.getOrLoad('k', 100, load)).toBe('a');
    now = 101;
    expect(await cache.getOrLoad('k', 100, load)).toBe('b');
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const cache = createTtlCache();
    const load = vi.fn().mockResolvedValue('v');
    await Promise.all([cache.getOrLoad('k', 100, load), cache.getOrLoad('k', 100, load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const cache = createTtlCache();
    const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    await expect(cache.getOrLoad('k', 100, load)).rejects.toThrow('boom');
    expect(await cache.getOrLoad('k', 100, load)).toBe('ok');
  });

  it('evicts the oldest entry beyond the size cap', async () => {
    const cache = createTtlCache(() => 0, 2);
    const loadA = vi.fn().mockResolvedValue('a');
    await cache.getOrLoad('a', 100, loadA);
    await cache.getOrLoad('b', 100, async () => 'b');
    await cache.getOrLoad('c', 100, async () => 'c');
    await cache.getOrLoad('a', 100, loadA);
    expect(loadA).toHaveBeenCalledTimes(2);
  });
});
