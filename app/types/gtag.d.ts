declare global {
  type GtagCommand = 'config' | 'event' | 'js'
  type GtagParams = Record<string, string | number | boolean | Date | undefined>
  type Gtag = (
    command: GtagCommand,
    targetIdOrEventName: string | Date,
    params?: GtagParams,
  ) => void

  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

export {}
