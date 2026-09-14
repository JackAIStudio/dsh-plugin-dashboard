import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyPluginEnablementToPatch,
  parsePluginEnablementFromPatch,
  collectDashboardState,
  collectGitStatus,
  readDshCoreVersion,
  resolvePluginEntryId,
} from '../dashboard.js'

test('readDshCoreVersion returns a valid semver string', () => {
  const ver = readDshCoreVersion()
  assert.ok(typeof ver === 'string' && ver.length > 0)
  assert.match(ver, /^\d+\.\d+\.\d+/)
})

test('resolvePluginEntryId maps internal cordis entryIds', () => {
  assert.equal(resolvePluginEntryId('dsh-better-sidebar'), 'better-sidebar')
  assert.equal(resolvePluginEntryId('dsh-reminder'), 'peon-ping')
  assert.equal(resolvePluginEntryId('dsh-gemini-oauth'), 'llm-gemini-oauth')
  assert.equal(resolvePluginEntryId('dsh-grok-oauth'), 'llm-grok')
  assert.equal(resolvePluginEntryId('dsh-app-badge'), 'dsh-app-badge')
})

test('parsePluginEnablementFromPatch detects enabled vs disabled with mapped entryId', () => {
  const patch1 = `
- id: better-sidebar
  disabled: true
- id: dsh-today
  disabled: false
`
  // 传入 dsh-better-sidebar，应该自动通过 entryId 查出已禁用
  assert.equal(parsePluginEnablementFromPatch(patch1, 'dsh-better-sidebar'), false)
  assert.equal(parsePluginEnablementFromPatch(patch1, 'dsh-today'), true)
  assert.equal(parsePluginEnablementFromPatch(patch1, 'dsh-app-badge'), true)
})

test('applyPluginEnablementToPatch writes correct entryId and cleans legacy dirty lines', () => {
  const dirtyInitial = `
- id: client-hmr
  disabled: true
- id: dsh-better-sidebar
  disabled: true
`
  // 禁用 dsh-better-sidebar：应当将 dsh-better-sidebar 脏行清理，并写入 better-sidebar
  const disabled = applyPluginEnablementToPatch(dirtyInitial, 'dsh-better-sidebar', false)
  assert.ok(disabled.includes('better-sidebar'))
  assert.ok(!disabled.includes('dsh-better-sidebar'))
  assert.equal(parsePluginEnablementFromPatch(disabled, 'dsh-better-sidebar'), false)

  // 重新启用：应当将 better-sidebar 的 disabled 移除
  const enabled = applyPluginEnablementToPatch(disabled, 'dsh-better-sidebar', true)
  assert.equal(parsePluginEnablementFromPatch(enabled, 'dsh-better-sidebar'), true)
})

test('collectDashboardState builds clean structure with entryId', () => {
  const state = collectDashboardState()
  assert.ok(state.system)
  assert.ok(state.system.dshCoreVersion)
  assert.ok(Array.isArray(state.plugins))
  assert.ok(state.plugins.length > 0)

  const sidebar = state.plugins.find(p => p.id === 'dsh-better-sidebar')
  assert.ok(sidebar)
  assert.equal(sidebar.isOwn, true)
  assert.equal(sidebar.displayName, '增强侧边栏')
  assert.equal(sidebar.entryId, 'better-sidebar')
  assert.match(sidebar.version, /^\d+\.\d+\.\d+/)
})

test('collectGitStatus returns structured git summary', async () => {
  const gitData = await collectGitStatus()
  assert.equal(gitData.ok, true)
  assert.ok(gitData.total > 0)
  assert.ok(typeof gitData.summary.syncedCount === 'number')
  assert.ok(gitData.plugins['dsh-plugin-dashboard'])
  assert.equal(gitData.plugins['dsh-plugin-dashboard'].isGit, true)
})
