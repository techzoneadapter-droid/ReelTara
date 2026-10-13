import { createServer } from 'vite';

export const firstPreviewPort = 5188;
export const lastPreviewPort = 5199;
export function previewUrl(port) {
  if (!Number.isInteger(port) || port < firstPreviewPort || port > lastPreviewPort) throw new Error('USB preview port must be in 5188–5199.');
  return `http://localhost:${port}`;
}

// Bind the actual server, rather than probing then releasing a socket. A port
// taken by another process is skipped without touching that process.
export async function startPreviewServer({ first = firstPreviewPort, last = lastPreviewPort, excluded = new Set(), factory = createServer } = {}) {
  for (let port = first; port <= last; port++) {
    if (excluded.has(port)) continue;
    const server = await factory({
      server: { host: '127.0.0.1', port, strictPort: true, hmr: { host: 'localhost', clientPort: port } },
      define: { 'import.meta.env.VITE_PUBLIC_API_BASE_URL': JSON.stringify('') },
    });
    try {
      await server.listen();
      return { server, port };
    } catch (error) {
      await server.close(); // Only the candidate server created above.
      if (error.code !== 'EADDRINUSE' && !/Port \d+ is already in use/.test(error.message)) throw error;
      console.log(`[Port] ${port} đang bận; thử cổng tiếp theo.`);
    }
  }
  throw new Error(`Không có cổng USB preview trống trong ${first}–${last}. Các tiến trình hiện tại được giữ nguyên.`);
}

export function reverseMappings(output) {
  const mappings = new Map();
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    const remote = fields.at(-2);
    const local = fields.at(-1);
    if (/^tcp:\d+$/.test(remote || '')) mappings.set(Number(remote.slice(4)), local);
  }
  return mappings;
}
