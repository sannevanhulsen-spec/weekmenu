import { afterEach, describe, expect, it, vi } from 'vitest';
import { politeGet } from '../../fetcher/http';

afterEach(() => vi.unstubAllGlobals());

describe('politeGet', () => {
  it('returns null instead of throwing on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    await expect(politeGet('https://example.test/x')).resolves.toBeNull();
  });
  it('passes a timeout signal', async () => {
    const f = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', f);
    await politeGet('https://example.test/x');
    expect(f.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
