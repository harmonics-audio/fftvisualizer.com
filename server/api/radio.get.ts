/**
 * Same-origin proxy for the SomaFM "Groove Salad Classic" stream.
 *
 * SomaFM returns 403 to any request carrying a `Range` header, and browsers
 * always send `Range: bytes=0-` on the first media fetch — so pointing an
 * <audio> element straight at the SomaFM URL fails (silent, 403 in console).
 *
 * Fetching it server-side WITHOUT a Range header returns 200; we pipe that
 * straight back as a same-origin stream. The browser's own Range request to
 * this route is simply answered with a 200 stream, which plays fine. No CORS,
 * no Range upstream, clean console. The player points its <audio> at /api/radio.
 *
 * (Now-playing metadata is fetched client-side from SomaFM's CORS-enabled JSON.)
 */
const STREAM_URL = 'https://ice2.somafm.com/gsclassic-128-mp3'

export default defineEventHandler(async (event) => {
  // Abort the upstream connection when the browser stops listening.
  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())

  let upstream: Response
  try {
    upstream = await fetch(STREAM_URL, {
      signal: controller.signal,
      // A User-Agent is required (SomaFM drops UA-less requests); no `Icy-MetaData`
      // header means the server sends pure audio with no in-band metadata bytes.
      headers: { 'User-Agent': 'Mozilla/5.0 (fftvisualizer.com radio proxy)' }
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'SomaFM stream unavailable' })
  }

  if (!upstream.ok || !upstream.body) {
    throw createError({ statusCode: 502, statusMessage: `SomaFM responded ${upstream.status}` })
  }

  setHeader(event, 'Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg')
  setHeader(event, 'Cache-Control', 'no-store')
  return upstream.body
})
