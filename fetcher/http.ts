/** Polite GET: one request at a time with a pause, so a store sees at most 2 requests per second. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PAUSE_MS = 500;

export async function politeGet(url: string): Promise<string | null> {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'nl-NL' } });
  await new Promise((res) => setTimeout(res, PAUSE_MS));
  return r.ok ? r.text() : null;
}
