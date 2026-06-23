import { getPreview } from '../../services/previewStore.service'

export default defineEventHandler((event) => {
  const previewId = getRouterParam(event, 'id') ?? ''
  const preview = getPreview(previewId)

  if (!preview) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PREVIEW_NOT_FOUND',
    })
  }

  return preview
})
