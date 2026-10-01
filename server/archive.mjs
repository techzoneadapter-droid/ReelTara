// Metadata only. Never accepts arbitrary URLs or proxies movie bytes.
export async function archiveResponse(input) {
  const identifier = new URL(input, 'http://localhost').searchParams.get('identifier');
  if (identifier !== 'BigBuckBunny_328')
    return { status: 400, body: { error: 'unreviewed_source' } };
  try {
    const response = await fetch(`https://archive.org/metadata/${identifier}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return { status: 502, body: { error: 'source_unavailable' } };
    const data = await response.json();
    if (!data.metadata || !Array.isArray(data.files))
      return { status: 502, body: { error: 'invalid_response' } };
    return { status: 200, body: { metadata: data.metadata, files: data.files } };
  } catch {
    return { status: 502, body: { error: 'source_unavailable' } };
  }
}
