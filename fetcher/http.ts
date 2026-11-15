/** Polite GET: one request at a time with a pause, so a store sees at most 2 requests per second.
 *  Network errors and timeouts give null, so one bad request never fails a whole store. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PAUSE_MS = 500;
const TIMEOUT_MS = 15_000;

export async function politeGet(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'nl-NL' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  } finally {
    await new Promise((res) => setTimeout(res, PAUSE_MS));
  }
}
