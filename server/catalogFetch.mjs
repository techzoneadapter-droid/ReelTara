const queues = new Map(), cooldowns = new Map();
export async function fetchJson(url, accept = 'application/json') {
  const host = new URL(url).hostname;
  const previous = queues.get(host) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    if ((cooldowns.get(host) || 0) > Date.now()) throw new Error('source_rate_limited');
    const response = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'ReelTara/0.1 (https://github.com/techzoneadapter-droid/ReelTara)' }, signal: AbortSignal.timeout(20000) });
    if (response.status === 429) {
      cooldowns.set(host, Date.now() + Math.max(60, Number(response.headers?.get('retry-after')) || 60) * 1000);
    }
    if (!response.ok) throw new Error('source_' + response.status);
    return response.json();
  });
  const tail = task.then(() => new Promise(resolve => setTimeout(resolve, host === 'query.wikidata.org' ? 1000 : 550)), () => {});
  queues.set(host, tail);
  return task;
}
