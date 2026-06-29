const DEFAULT_COOKIE_PATH = '/'

export default defineEventHandler((event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
    })
  }

  const cookieHeader = getRequestHeader(event, 'cookie') ?? ''
  const cookieNames = cookieHeader
    .split(';')
    .map(cookie => cookie.trim().split('=')[0])
    .filter(Boolean)

  for (const cookieName of new Set(cookieNames)) {
    deleteCookie(event, cookieName, {
      path: DEFAULT_COOKIE_PATH,
    })
  }

  return {
    ok: true,
    cleared: new Set(cookieNames).size,
  }
})
