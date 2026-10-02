import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { environment } from './config/environment.js'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js'
import { healthRoutes } from './routes/healthRoutes.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: environment.FRONTEND_ORIGIN, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/health', healthRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') {
  app.listen(environment.PORT, () => {
    console.info(`Smart Farmer Connect API listening on port ${environment.PORT}`)
  })
}
