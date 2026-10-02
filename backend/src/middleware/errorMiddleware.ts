import type { ErrorRequestHandler, RequestHandler } from 'express'

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: 'Not found' })
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = Number(error?.statusCode) || 500
  const message = status >= 500 ? 'An unexpected server error occurred.' : String(error?.message ?? 'Request failed.')
  if (status >= 500) console.error(error)
  response.status(status).json({ error: message })
}
