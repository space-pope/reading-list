import Fastify, { type FastifyInstance } from 'fastify'
import view from '@fastify/view'
import formbody from '@fastify/formbody'
import nunjucks from 'nunjucks'
import staticPlugin from '@fastify/static'
import { join } from 'node:path'
import { registerRoutes } from './routes.js'

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  // Static files (CSS, compiled JS)
  app.register(staticPlugin, {
    root: join(__dirname, '..', '..', 'static'),
    prefix: '/static/',
  })

  // Form body parser (for application/x-www-form-urlencoded)
  app.register(formbody)

  // Template engine
  app.register(view, {
    engine: {
      nunjucks: nunjucks,
    },
        root: join(__dirname, '..', '..', 'templates'),
        viewExt: 'njk',
  })

  // Template filters
  app.decorate('truncateHeadline', function (value: string, length: number = 80): string {
    const l = Math.max(3, Math.min(500, Number(length)))
    if (value.length <= l) return value
    return value.slice(0, l - 3) + '...'
  })

  app.decorate('truncateExcerpt', function (value: string, length: number = 200): string {
    if (value.length <= length) return value
    return value.slice(0, length - 3) + '...'
  })

  app.decorate('truncateUrl', function (value: string, length: number = 60): string {
    if (value.length <= length) return value
    const sepIdx = value.indexOf('://')
    if (sepIdx !== -1) {
      const scheme = value.slice(0, sepIdx + 3)
      const rest = value.slice(sepIdx + 3)
      const domainEnd = rest.indexOf('/')
      const domain = domainEnd === -1 ? rest : rest.slice(0, domainEnd)
      if ((scheme + domain).length + 3 <= length) {
        return scheme + domain + '...'
      }
    }
    return value.slice(0, length - 3) + '...'
  })

  registerRoutes(app)

  return app
}
