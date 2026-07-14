import { extract } from 'trafilatura'

export interface FetchResult {
  url: string
  title: string
  description: string
  fetch_time_ms: number
}

function isValidUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

export async function fetchAndExtract(
  url: string,
  timeoutMs: number = 30000
): Promise<FetchResult> {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL: must start with http:// or https://')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: HTTP ${response.status}`)
    }

    const html = await response.text()
    clearTimeout(timeout)

    const elapsed = Date.now() - startTime

    try {
      const result = extract(html)

      const headline = result.metadata.title?.slice(0, 500) || ''
      const description = result.metadata.description?.slice(0, 2000) || ''

      return { url, title: headline, description, fetch_time_ms: elapsed }
    } catch {
      // trafilatura extraction failed — fallback to <title> tag
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      return {
        url,
        title: titleMatch?.[1]?.trim() || 'Untitled',
        description: '',
        fetch_time_ms: elapsed,
      }
    }
  } catch (err: unknown) {
    clearTimeout(timeout)
    const elapsed = Date.now() - startTime

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`)
    }

    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to fetch URL: ${msg}`)
  }
}
