import { existsSync, readFileSync, writeFileSync, copyFileSync, renameSync, readdirSync, chmodSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 自研插件官方元数据定义（用于提供规范的中文名、友好描述与 Cordis 内部真实 entryId）
export const OWN_PLUGIN_META = {
  'dsh-plugin-dashboard': {
    name: '自研插件大盘',
    description: '展示 DSH 官方底座与插件版本矩阵，支持一键无感热开关与诊断导出。',
    isOwn: true,
    entryId: 'dsh-plugin-dashboard',
  },
  'dsh-better-sidebar': {
    name: '增强侧边栏',
    description: '集成多终端、浏览器预览、会话分屏、文件树与全局运行配置。',
    isOwn: true,
    entryId: 'better-sidebar', // 关键：Cordis 实例真实 ID 为 better-sidebar
  },
  'dsh-session-navigator': {
    name: '会话深层导航',
    description: '侧栏菜单复制会话 ID、复制规范引用、会话置顶、输入框 Chip 渲染。',
    isOwn: true,
    entryId: 'dsh-session-navigator',
  },
  'dsh-mobile-plus': {
    name: '局域网手机控制',
    description: '电脑端展示配对二维码，手机在同一局域网下扫码实时遥控与输入。',
    isOwn: true,
    entryId: 'dsh-mobile-plus',
  },
  'dsh-deepseek-balance': {
    name: 'DeepSeek 余额监控',
    description: '在输入框下方实时监控官方 API 账户余额与免费额度。',
    isOwn: true,
    entryId: 'dsh-deepseek-balance',
  },
  'dsh-today': {
    name: '今日按天工作区',
    description: '自动定位并推荐今日按天工作目录，保持项目清晰有序。',
    isOwn: true,
    entryId: 'dsh-today',
  },
  'dsh-workspace-path': {
    name: '工作区路径中心',
    description: '顶栏显示当前绝对路径，支持快速切换、访达定位与终端直达。',
    isOwn: true,
    entryId: 'dsh-workspace-path',
  },
  'dsh-gemini-oauth': {
    name: 'Gemini OAuth 登录',
    description: '免 Key 一键 Google OAuth 授权绑定 Gemini 系列大模型。',
    isOwn: true,
    entryId: 'llm-gemini-oauth', // 关键：Cordis 实例真实 ID 为 llm-gemini-oauth
  },
  'dsh-grok-oauth': {
    name: 'Grok OAuth 登录',
    description: '一键授权绑定 xAI Grok 系列大模型，支持生图与高速推理。',
    isOwn: true,
    entryId: 'llm-grok', // 关键：Cordis 实例真实 ID 为 llm-grok
  },
  'dsh-app-badge': {
    name: '应用未读红点角标',
    description: '在浏览器标签页与 Dock/任务栏标注未读响应消息红点。',
    isOwn: true,
    entryId: 'dsh-app-badge',
  },
  'dsh-reminder': {
    name: '任务完成提示音',
    description: '后台长时间任务执行完毕时播放提示音（支持自定义音效）。',
    isOwn: true,
    entryId: 'peon-ping', // 关键：Cordis 实例真实 ID 为 peon-ping
  },
  'dsh-web-search-follow': {
    name: '联网搜索跟随',
    description: '随选定模型自适应调用最佳联网搜索能力。',
    isOwn: true,
    entryId: 'web-search-follow', // 关键：Cordis 实例真实 ID 为 web-search-follow
  },
  'dsh-workbuddy-dual': {
    name: 'WorkBuddy 双轨直连',
    description: '直连本地 WorkBuddy 实例，实现高效多端双向协同。',
    isOwn: true,
    entryId: 'llm-workbuddy-dual', // 关键：Cordis 实例真实 ID 为 llm-workbuddy-dual
  },
  'dsh-robust-search': {
    name: '增强检索扩展',
    description: '增强会话历史与工作区上下文的多维度检索算法。',
    isOwn: true,
    entryId: 'dsh-robust-search',
  },
  'dsh-web-restart': {
    name: '服务快速重启',
    description: '侧栏提供一键安全重启 DSH Web 宿主进程的入口。',
    isOwn: true,
    entryId: 'dsh-web-restart',
  },
  'dsh-browser-attach': {
    name: '浏览器调试附加',
    description: '支持附加外部 Chrome / Edge 浏览器并执行自动化交互。',
    isOwn: true,
    entryId: 'dsh-browser-attach',
  },
}

/**
 * 获取运行态 DSH_HOME 路径
 */
export function resolveDshHome(env = process.env) {
  if (env.DSH_HOME && env.DSH_HOME.trim()) {
    return resolve(env.DSH_HOME.trim())
  }
  return join(homedir(), '.dsh')
}

/**
 * 读取 DSH 官方底座版本号
 */
export function readDshCoreVersion() {
  const candidates = [
    // 1. 全局已安装位置
    '/usr/local/lib/node_modules/@deepseek-ai/dsh/package.json',
    // 2. 环境变量指定的安装位置
    process.env.DSH_DIR ? join(process.env.DSH_DIR, 'package.json') : null,
    // 3. 向上寻找 node_modules/@deepseek-ai/dsh
    resolve(__dirname, '../../../node_modules/@deepseek-ai/dsh/package.json'),
    resolve(__dirname, '../../node_modules/@deepseek-ai/dsh/package.json'),
    resolve(__dirname, '../node_modules/@deepseek-ai/dsh/package.json'),
  ].filter(Boolean)

  for (const c of candidates) {
    try {
      if (existsSync(c)) {
        const parsed = JSON.parse(readFileSync(c, 'utf8'))
        if (parsed.version) return parsed.version
      }
    } catch {}
  }

  return '0.1.2-rc.1' // 官方安全回退默认值
}

/**
 * 读取 JackDSH 客户端发行版版本号（若存在）
 */
export function readJackDshVersion() {
  if (process.env.JACKDSH_VERSION) return process.env.JACKDSH_VERSION

  const candidates = [
    resolve(__dirname, '../../JackDSH/package.json'),
    resolve(__dirname, '../../../JackDSH/package.json'),
  ]
  for (const c of candidates) {
    try {
      if (existsSync(c)) {
        const parsed = JSON.parse(readFileSync(c, 'utf8'))
        if (parsed.name === 'jackdsh' && parsed.version) return parsed.version
      }
    } catch {}
  }
  return null
}

/**
 * 解析插件在 Cordis 微内核中注册的真实 entryId（优先查表，再查自身 patch 文件，默认包名）
 */
export function resolvePluginEntryId(pluginId, pluginDir = '') {
  if (OWN_PLUGIN_META[pluginId]?.entryId) {
    return OWN_PLUGIN_META[pluginId].entryId
  }
  if (pluginDir) {
    const patchFile = join(pluginDir, 'cordis.patch.yml')
    if (existsSync(patchFile)) {
      try {
        const text = readFileSync(patchFile, 'utf8')
        const match = text.match(/^\s*-\s+id:\s*['"]?([^'"\s]+)['"]?/m)
        if (match && match[1]) return match[1]
      } catch {}
    }
  }
  return pluginId
}

function isIdDisabledInPatch(patchText, targetId) {
  if (!patchText || !targetId) return false
  const lines = patchText.split('\n')
  let currentId = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/#.*$/, '').trimEnd()
    const idMatch = line.match(/^\s*-\s+id:\s*['"]?([^'"\s]+)['"]?/)
    if (idMatch) {
      currentId = idMatch[1]
      continue
    }
    const disabledMatch = line.match(/^\s*disabled:\s*(true|false)\b/)
    if (disabledMatch && currentId === targetId) {
      return disabledMatch[1] === 'true'
    }
  }
  return false
}

/**
 * 解析 patch 文本中指定插件的启用状态（自动结合 entryId 检测）
 */
export function parsePluginEnablementFromPatch(patchText, pluginId, entryId) {
  const actualEntryId = entryId || resolvePluginEntryId(pluginId)
  if (isIdDisabledInPatch(patchText, actualEntryId)) return false
  if (pluginId !== actualEntryId && isIdDisabledInPatch(patchText, pluginId)) return false
  return true
}

function removePluginIdFromPatch(text, targetId) {
  const lines = text.split('\n')
  let startIdx = -1
  let endIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/#.*$/, '').trimEnd()
    const idMatch = line.match(/^\s*-\s+id:\s*['"]?([^'"\s]+)['"]?/)
    if (idMatch && idMatch[1] === targetId) {
      startIdx = i
      endIdx = i + 1
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].replace(/#.*$/, '').trimEnd()
        if (/^\s*-\s+id:/.test(next)) break
        endIdx = j + 1
      }
      break
    }
  }

  if (startIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx)
    return lines.join('\n')
  }
  return text
}

function applyOneIdToPatch(text, targetId, enabled) {
  const lines = text.split('\n')
  let foundIdIndex = -1
  let disabledLineIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/#.*$/, '').trimEnd()
    const idMatch = raw.match(/^\s*-\s+id:\s*['"]?([^'"\s]+)['"]?/)
    if (idMatch && idMatch[1] === targetId) {
      foundIdIndex = i
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const nextRaw = lines[j].replace(/#.*$/, '').trimEnd()
        if (/^\s*-\s+id:/.test(nextRaw)) break
        if (/^\s*disabled:\s*(true|false)/.test(nextRaw)) {
          disabledLineIndex = j
          break
        }
      }
      break
    }
  }

  if (enabled) {
    if (disabledLineIndex !== -1) {
      lines.splice(disabledLineIndex, 1)
      return lines.join('\n')
    }
    return text
  } else {
    if (disabledLineIndex !== -1) {
      lines[disabledLineIndex] = lines[disabledLineIndex].replace(/disabled:\s*(false|true)/, 'disabled: true')
      return lines.join('\n')
    } else if (foundIdIndex !== -1) {
      lines.splice(foundIdIndex + 1, 0, '  disabled: true')
      return lines.join('\n')
    } else {
      const block = `\n- id: ${targetId}\n  disabled: true\n`
      if (text.trim() === '[]') {
        return `- id: ${targetId}\n  disabled: true\n`
      }
      return text.endsWith('\n') ? text + block : text + '\n' + block
    }
  }
}

/**
 * 修改 patch 文件中指定插件的启用状态（自动写入真实 entryId 并清洗旧包名脏行）
 */
export function applyPluginEnablementToPatch(currentPatchText, pluginId, enabled, entryId) {
  const actualEntryId = entryId || resolvePluginEntryId(pluginId)
  let text = currentPatchText || ''
  const trimmed = text.trim()
  if (!trimmed || trimmed === '[]') {
    text = '[]\n'
  }

  // 1. 若存在包名与 entryId 不一致的脏行，自动移除
  if (pluginId !== actualEntryId) {
    text = removePluginIdFromPatch(text, pluginId)
  }

  // 2. 针对真实 entryId 写入或移除 disabled
  return applyOneIdToPatch(text, actualEntryId, enabled)
}

/**
 * 汇总当前系统的全部状态（包含内核版本、JackDSH 版本与所有插件状态列表）
 */
export function collectDashboardState(env = process.env) {
  const dshHome = resolveDshHome(env)
  const profileName = env.DSH_PROFILE || 'web'
  const profileDir = join(dshHome, 'profiles', profileName)
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const manifestPath = join(profileDir, 'package.json')

  let patchText = ''
  try {
    if (existsSync(patchPath)) patchText = readFileSync(patchPath, 'utf8')
  } catch {}

  let manifest = { dependencies: {}, dsh: { profile: { bundles: [] } } }
  try {
    if (existsSync(manifestPath)) {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    }
  } catch {}

  const dshCoreVersion = readDshCoreVersion()
  const jackdshVersion = readJackDshVersion()

  const nodeModulesDir = join(profileDir, 'node_modules')
  const localPluginsDir = resolve(__dirname, '../')

  // 汇集要扫描的插件 ID 集合（优先包含已知自研插件，再包含 profile 里声明的插件）
  const pluginIds = new Set(Object.keys(OWN_PLUGIN_META))

  if (manifest.dependencies) {
    for (const k of Object.keys(manifest.dependencies)) {
      if (!k.startsWith('@deepseek-ai/')) pluginIds.add(k)
    }
  }
  if (manifest.dsh?.profile?.bundles) {
    for (const b of manifest.dsh.profile.bundles) {
      if (!b.startsWith('@deepseek-ai/')) pluginIds.add(b)
    }
  }

  const plugins = []

  for (const id of pluginIds) {
    const meta = OWN_PLUGIN_META[id] || {}
    const isOwn = Boolean(meta.isOwn)
    const displayName = meta.name || id
    let description = meta.description || ''

    // 寻找真实 package.json 以读取精准版本号
    let version = '0.1.0'
    let resolvedPath = ''

    const candidates = [
      join(nodeModulesDir, id, 'package.json'),
      join(localPluginsDir, id, 'package.json'),
      resolve(__dirname, '..', id, 'package.json'),
    ]

    for (const c of candidates) {
      try {
        if (existsSync(c)) {
          const pkg = JSON.parse(readFileSync(c, 'utf8'))
          if (pkg.version) version = pkg.version
          if (!description && pkg.description) description = pkg.description
          resolvedPath = dirname(c)
          break
        }
      } catch {}
    }

    const entryId = resolvePluginEntryId(id, resolvedPath)
    const enabled = parsePluginEnablementFromPatch(patchText, id, entryId)

    plugins.push({
      id,
      name: id,
      entryId,
      displayName,
      version,
      isOwn,
      enabled,
      description,
      path: resolvedPath,
    })
  }

  // 自研插件排在前面，自研插件内按特定顺序排列
  const ownOrder = Object.keys(OWN_PLUGIN_META)
  plugins.sort((a, b) => {
    if (a.isOwn && !b.isOwn) return -1
    if (!a.isOwn && b.isOwn) return 1
    if (a.isOwn && b.isOwn) {
      const ia = ownOrder.indexOf(a.id)
      const ib = ownOrder.indexOf(b.id)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    }
    return a.id.localeCompare(b.id)
  })

  return {
    system: {
      dshCoreVersion,
      jackdshVersion,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      profile: profileName,
      dshHome,
    },
    plugins,
  }
}

/**
 * 执行插件启用/禁用切换并持久化
 */
export function togglePluginState(pluginId, targetEnabled, env = process.env) {
  const dshHome = resolveDshHome(env)
  const profileName = env.DSH_PROFILE || 'web'
  const profileDir = join(dshHome, 'profiles', profileName)
  const patchPath = join(profileDir, 'cordis.patch.yml')

  let currentText = ''
  try {
    if (existsSync(patchPath)) currentText = readFileSync(patchPath, 'utf8')
  } catch {}

  const entryId = resolvePluginEntryId(pluginId)
  const newText = applyPluginEnablementToPatch(currentText, pluginId, targetEnabled, entryId)

  // 备份旧文件
  try {
    if (existsSync(patchPath)) {
      copyFileSync(patchPath, `${patchPath}.bak-dashboard`)
    }
  } catch {}

  // 原子写入
  const tmpPath = `${patchPath}.tmp-${Date.now()}`
  writeFileSync(tmpPath, newText, 'utf8')
  renameSync(tmpPath, patchPath)

  return {
    ok: true,
    pluginId,
    entryId,
    enabled: targetEnabled,
    needReload: true,
  }
}

export const MODEL_CONFIG_FILES = [
  '.credentials.yaml',
  'grok-oauth.json',
  'gemini-oauth.json',
  'gemini-oauth-models.json',
  'settings.yaml',
]

/**
 * 导出当前环境的全量模型与授权配置包
 */
export function exportModelProfile(env = process.env) {
  const dshHome = resolveDshHome(env)
  const files = {}
  let fileCount = 0

  for (const filename of MODEL_CONFIG_FILES) {
    const fullPath = join(dshHome, filename)
    if (existsSync(fullPath)) {
      try {
        files[filename] = readFileSync(fullPath, 'utf8')
        fileCount++
      } catch (err) {
        console.warn(`[dsh-plugin-dashboard] 导出文件失败: ${filename}`, err.message)
      }
    }
  }

  return {
    schema: 'jackdsh-model-profile/v1',
    exportedAt: new Date().toISOString(),
    sourcePlatform: process.platform,
    dshHomeBasename: dshHome.split(/[/\\]/).pop() || 'dsh-home',
    fileCount,
    files,
  }
}

/**
 * 导入全量模型与授权配置包并安全写盘
 */
export function importModelProfile(payload, env = process.env) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('导入数据格式无效，必须是 JSON 对象')
  }

  if (payload.schema !== 'jackdsh-model-profile/v1') {
    throw new Error('不支持的配置包版本格式，要求 jackdsh-model-profile/v1')
  }

  if (!payload.files || typeof payload.files !== 'object') {
    throw new Error('配置包中缺少有效的 files 文件字典')
  }

  const dshHome = resolveDshHome(env)
  const allowedFiles = new Set(MODEL_CONFIG_FILES)
  const restored = []

  for (const [filename, content] of Object.entries(payload.files)) {
    // 严格安全白名单过滤，杜绝路径穿越与恶意覆盖
    if (!allowedFiles.has(filename)) {
      continue
    }

    if (typeof content !== 'string') {
      continue
    }

    const targetPath = join(dshHome, filename)

    // 如果原文件存在，先做 .bak-pre-import 备份
    try {
      if (existsSync(targetPath)) {
        copyFileSync(targetPath, `${targetPath}.bak-pre-import`)
      }
    } catch {}

    // 原子写入（模式 0o600 严格私有权限）
    const tmpPath = `${targetPath}.tmp-import-${Date.now()}`
    writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 })
    renameSync(tmpPath, targetPath)
    try {
      chmodSync(targetPath, 0o600)
    } catch {}
    restored.push(filename)
  }

  if (restored.length === 0) {
    throw new Error('配置包中未包含任何有效的模型配置文件（如 .credentials.yaml、grok-oauth.json 等）')
  }

  return {
    ok: true,
    restored,
    count: restored.length,
    message: `成功恢复 ${restored.length} 个模型与授权配置文件`,
  }
}
