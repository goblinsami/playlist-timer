type AnalyticsParamValue = string | number | boolean | null | undefined
type AnalyticsParams = Record<string, AnalyticsParamValue>

export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (import.meta.server || !window.gtag) {
    return
  }

  window.gtag('event', eventName, compactAnalyticsParams(params))
}

function compactAnalyticsParams(params: AnalyticsParams): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string | number | boolean] =>
      typeof entry[1] === 'string'
      || typeof entry[1] === 'number'
      || typeof entry[1] === 'boolean',
    ),
  )
}
