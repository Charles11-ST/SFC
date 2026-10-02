import type { RequestHandler } from 'express'
import { environment } from '../config/environment.js'

export const getHealth: RequestHandler = (_request, response) => {
  response.json({
    status: 'ok',
    service: 'smart-farmer-connect-api',
    environment: environment.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
}
