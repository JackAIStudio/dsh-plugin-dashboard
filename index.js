import { Buffer } from 'node:buffer'
import { collectDashboardState, togglePluginState } from './dashboard.js'

export const name = 'dsh-plugin-dashboard'
export const inject = ['webServer']

const STATUS_ROUTE = '/api/jack-plugins/status'
const TOGGLE_ROUTE = '/api/jack-plugins/toggle'
const BODY_LIMIT = 4096

function isLoopbackAddress(addr) {
  if (!addr) return false
  return (
    addr === '127.0.0.1' ||
    addr === '::1' ||
    addr === '::ffff:127.0.0.1' ||
    addr.startsWith('fe80:')
  )
}

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value)
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('content-length', String(Buffer.byteLength(body)))
  res.end(body)
}

function rejectUnlessLocal(req, res) {
  if (!isLoopbackAddress(req.socket?.remoteAddress)) {
    sendJson(res, 403, {
      ok: false,
      code: 'forbidden',
      error: '仅支持本机访问。',
    })
    return true
  }
  return false
}

async function readJsonBody(req, limit = BODY_LIMIT) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) {
      const error = new Error('payload too large')
      error.code = 'too-large'
      throw error
    }
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (raw === '') return {}
  return JSON.parse(raw)
}

export function apply(ctx) {
  ctx.inject(['webServer'], (web) => {
    const webServer = web.get('webServer')

    // 1. 获取系统底座与插件状态
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: STATUS_ROUTE,
      handler: (req, res) => {
        if (rejectUnlessLocal(req, res)) return
        if (req.method !== 'GET') {
          res.setHeader('allow', 'GET')
          sendJson(res, 405, { ok: false, error: 'Method not allowed' })
          return
        }
        try {
          const data = collectDashboardState()
          sendJson(res, 200, { ok: true, ...data })
        } catch (err) {
          sendJson(res, 500, { ok: false, error: err.message })
        }
      },
    }), 'dsh-plugin-dashboard: status route')

    // 2. 切换插件启用/禁用
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: TOGGLE_ROUTE,
      handler: async (req, res) => {
        if (rejectUnlessLocal(req, res)) return
        if (req.method !== 'POST') {
          res.setHeader('allow', 'POST')
          sendJson(res, 405, { ok: false, error: 'Method not allowed' })
          return
        }
        try {
          const body = await readJsonBody(req)
          const { pluginId, enabled } = body
          if (!pluginId || typeof pluginId !== 'string') {
            sendJson(res, 400, { ok: false, error: '缺少有效的 pluginId 参数' })
            return
          }
          if (typeof enabled !== 'boolean') {
            sendJson(res, 400, { ok: false, error: '缺少有效的 enabled 布尔值' })
            return
          }
          const result = togglePluginState(pluginId, enabled)
          sendJson(res, 200, result)
        } catch (err) {
          sendJson(res, 500, { ok: false, error: err.message })
        }
      },
    }), 'dsh-plugin-dashboard: toggle route')
  })
}
