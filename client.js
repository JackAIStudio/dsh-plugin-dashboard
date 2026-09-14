window.__ModuleLoader__.load({
  id: 'dsh-plugin-dashboard',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const { useState, useEffect, useMemo, useRef, createElement: h } = React

    const inject = ['slots']

    // 动态覆写并注入样式
    const STYLE_ID = 'dsh-plugin-dashboard-styles'
    function ensureStyles() {
      let style = document.getElementById(STYLE_ID)
      if (!style) {
        style = document.createElement('style')
        style.id = STYLE_ID
        document.head.appendChild(style)
      }
      style.textContent = `
        .jpd-card-hover:hover {
          border-color: #cbd5e1 !important;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05) !important;
        }
        .jpd-switch-input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .jpd-switch-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1;
          border-radius: 22px;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .jpd-switch-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 2px;
          bottom: 2px;
          background-color: #ffffff;
          border-radius: 50%;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }
        .jpd-switch-input:checked + .jpd-switch-slider {
          background-color: #10b981;
        }
        .jpd-switch-input:checked + .jpd-switch-slider:before {
          transform: translateX(16px);
        }

        /* 搜索框聚焦 */
        .jpd-search-input:focus {
          border-color: #3b82f6 !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12) !important;
          outline: none !important;
        }

        /* 确认对话框微动画 */
        @keyframes jpdModalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .jpd-modal-content {
          animation: jpdModalIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* 左下角设置按钮内的版本号微胶囊 */
        .jpd-version-badge {
          display: inline-flex;
          align-items: center;
          margin-left: 6px;
          padding: 1px 6px;
          font-size: 11px;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          line-height: 16px;
          color: #1d4ed8;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          letter-spacing: -0.2px;
          flex: none;
          transition: all 0.15s ease;
          user-select: none;
          pointer-events: none;
        }
        button:hover .jpd-version-badge {
          background: #dbeafe;
          border-color: #93c5fd;
          color: #1e40af;
        }
        [class*="_rail"] .jpd-version-badge {
          display: none !important;
        }

        /* 设置左侧导航的【配置迁移】专属货箱图标 */
        [data-jackdsh-migration-settings-nav] > svg:first-child {
          display: none !important;
        }
        [data-jackdsh-migration-settings-nav]::before {
          content: "" !important;
          flex: none !important;
          width: 16px !important;
          height: 16px !important;
          background: currentColor !important;
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7.5 4.27 9 5.15'/%3E%3Cpath d='M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'/%3E%3Cpath d='m3.3 7 8.7 5 8.7-5'/%3E%3Cpath d='M12 22V12'/%3E%3C/svg%3E") center / contain no-repeat !important;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7.5 4.27 9 5.15'/%3E%3Cpath d='M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'/%3E%3Cpath d='m3.3 7 8.7 5 8.7-5'/%3E%3Cpath d='M12 22V12'/%3E%3C/svg%3E") center / contain no-repeat !important;
        }
      `
    }

    function DashboardTab() {
      ensureStyles()

      const [loading, setLoading] = useState(true)
      const [system, setSystem] = useState(null)
      const [plugins, setPlugins] = useState([])
      const [filter, setFilter] = useState('all') // 'all' | 'own' | 'community'
      const [searchKeyword, setSearchKeyword] = useState('')
      const [needReload, setNeedReload] = useState(false)
      const [copied, setCopied] = useState(false)
      const [togglingId, setTogglingId] = useState(null)
      // 新手向导状态
      const [onboardingOpen, setOnboardingOpen] = useState(false)
      const [onboardingStep, setOnboardingStep] = useState(1)
      // 确认重载弹窗状态
      const [reloadModal, setReloadModal] = useState({
        open: false,
        pluginName: '',
        actionText: '',
      })

      useEffect(() => {
        try {
          if (!localStorage.getItem('jackdsh_onboarding_v1')) {
            setOnboardingOpen(true)
          }
        } catch {}
      }, [])

      const closeOnboarding = () => {
        try {
          localStorage.setItem('jackdsh_onboarding_v1', 'true')
        } catch {}
        setOnboardingOpen(false)
        setOnboardingStep(1)
      }

      const [gitStatus, setGitStatus] = useState(null)
      const [gitLoading, setGitLoading] = useState(false)

      const loadGitStatus = (doFetch = false) => {
        setGitLoading(true)
        fetch(`/api/jack-plugins/git-status${doFetch ? '?fetch=1' : ''}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.ok) {
              setGitStatus(data)
            }
          })
          .catch((err) => console.warn('[dsh-plugin-dashboard] fetch git-status failed:', err))
          .finally(() => setGitLoading(false))
      }

      const loadState = () => {
        fetch('/api/jack-plugins/status')
          .then((res) => res.json())
          .then((data) => {
            if (data && data.ok) {
              setSystem(data.system)
              setPlugins(data.plugins || [])
            }
          })
          .catch((err) => console.warn('[dsh-plugin-dashboard] fetch status failed:', err))
          .finally(() => setLoading(false))
      }

      useEffect(() => {
        loadState()
        loadGitStatus()
      }, [])

      const handleToggle = (plugin) => {
        if (togglingId) return
        const nextEnabled = !plugin.enabled
        setTogglingId(plugin.id)

        // 乐观更新界面开关状态
        setPlugins((prev) =>
          prev.map((p) => (p.id === plugin.id ? { ...p, enabled: nextEnabled } : p))
        )

        fetch('/api/jack-plugins/toggle', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pluginId: plugin.id, enabled: nextEnabled }),
        })
          .then((res) => res.json())
          .then((res) => {
            if (res && res.ok) {
              setNeedReload(true)
              // 触发确认并提示刷新的专属 Modal 对话框
              setReloadModal({
                open: true,
                pluginName: plugin.displayName,
                actionText: nextEnabled ? '开启' : '关闭',
              })
            } else {
              setPlugins((prev) =>
                prev.map((p) => (p.id === plugin.id ? { ...p, enabled: !nextEnabled } : p))
              )
            }
          })
          .catch((err) => {
            console.error('[dsh-plugin-dashboard] toggle error:', err)
            setPlugins((prev) =>
              prev.map((p) => (p.id === plugin.id ? { ...p, enabled: !nextEnabled } : p))
            )
          })
          .finally(() => setTogglingId(null))
      }

      const handleCopyReport = () => {
        if (!system) return
        const lines = [
          '### 🛠️ JackDSH 系统与插件诊断报告',
          `- **DSH 底座内核**: v${system.dshCoreVersion || 'unknown'}`,
          system.jackdshVersion ? `- **JackDSH 客户端**: v${system.jackdshVersion}` : null,
          `- **Node 运行时**: ${system.nodeVersion} (${system.platform}-${system.arch})`,
          `- **数据目录**: ${system.dshHome}`,
          ...(gitStatus?.summary ? [
            '',
            `#### 📊 GitHub 同步概况:`,
            `- 已同步: ${gitStatus.summary.syncedCount} ｜ 未提交: ${gitStatus.summary.dirtyCount} ｜ 待推送: ${gitStatus.summary.aheadCount} ｜ 待拉取: ${gitStatus.summary.behindCount}`,
          ] : []),
          '',
          `#### 🧩 插件状态矩阵 (${plugins.length} 个):`,
          ...plugins.map((p) => {
            const gs = gitStatus?.plugins?.[p.id]
            const gitTag = gs && gs.isGit ? ` [Git: ${gs.branch}${gs.isDirty ? `, 🟡${gs.dirtyCount}修改` : ''}${gs.ahead > 0 ? `, 🔵${gs.ahead}待推` : ''}${gs.synced ? ', 🟢已同步' : ''}]` : ''
            return `- [${p.enabled ? 'x' : ' '}] **${p.displayName}** (\`${p.id}\` v${p.version})${p.isOwn ? ' [由 Jack 维护]' : ' [由社区维护]'}${gitTag}`
          }),
          '',
          `*生成时间: ${new Date().toLocaleString()}*`,
        ].filter(Boolean)

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }

      // 计算分类计数
      const ownCount = useMemo(() => plugins.filter((p) => p.isOwn).length, [plugins])
      const communityCount = useMemo(() => plugins.filter((p) => !p.isOwn).length, [plugins])
      const allCount = plugins.length

      // 双重过滤：分类 + 实时搜索
      const filteredPlugins = useMemo(() => {
        let list = plugins

        // 1. 分类筛选
        if (filter === 'own') {
          list = list.filter((p) => p.isOwn)
        } else if (filter === 'community') {
          list = list.filter((p) => !p.isOwn)
        }

        // 2. 关键词即时搜索（匹配中文名、英文 ID、描述）
        const q = searchKeyword.trim().toLowerCase()
        if (q) {
          list = list.filter((p) => {
            const name = (p.displayName || '').toLowerCase()
            const id = (p.id || '').toLowerCase()
            const desc = (p.description || '').toLowerCase()
            return name.includes(q) || id.includes(q) || desc.includes(q)
          })
        }

        return list
      }, [plugins, filter, searchKeyword])

      if (loading) {
        return h(
          'div',
          {
            style: {
              padding: '32px 0',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '13px',
            },
          },
          '正在读取系统与插件大盘状态...'
        )
      }

      return h(
        'div',
        {
          style: {
            padding: '4px 0 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            color: '#0f172a',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
            position: 'relative',
          },
        },

        // 1. 无感软重载 Banner
        needReload &&
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: '#ecfdf5',
                border: '1px solid #86efac',
                borderRadius: '8px',
                color: '#065f46',
                fontSize: '13px',
                fontWeight: '500',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.12)',
              },
            },
            h('span', null, '✓ 插件配置已保存生效。无需重启后台进程，点击即可完成无感极速刷新：'),
            h(
              'button',
              {
                style: {
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(16, 185, 129, 0.25)',
                },
                onClick: () => window.location.reload(),
              },
              '立即刷新界面 (0.3s)'
            )
          ),

        // 2. 顶层 Hero 状态看板（清晰深色字 + 双版本微光胶囊）
        h(
          'div',
          {
            style: {
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
            },
          },
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                },
              },
              h(
                'span',
                {
                  style: {
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#0f172a',
                    letterSpacing: '-0.2px',
                  },
                },
                'DeepSeek Harness 运行环境'
              ),
              // DSH 底座内核版本徽章
              h(
                'span',
                {
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #86efac',
                  },
                },
                `DSH 底座 v${system?.dshCoreVersion || '0.1.2-rc.1'}`
              ),
              // JackDSH 客户端发行版版本徽章
              system?.jackdshVersion &&
                h(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                    },
                  },
                  `JackDSH v${system.jackdshVersion}`
                )
            ),
            h(
              'div',
              {
                style: {
                  fontSize: '12px',
                  color: '#64748b',
                  lineHeight: '1.4',
                },
              },
              `Node ${system?.nodeVersion} · ${system?.platform}-${system?.arch} · 数据目录: ${system?.dshHome}`
            )
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h(
              'button',
              {
                style: {
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s',
                },
                onClick: () => {
                  setOnboardingStep(1)
                  setOnboardingOpen(true)
                },
              },
              '💡 新手向导'
            ),
            h(
              'button',
              {
                style: {
                  background: copied ? '#ecfdf5' : '#ffffff',
                  color: copied ? '#15803d' : '#334155',
                  border: `1px solid ${copied ? '#86efac' : '#cbd5e1'}`,
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s',
                },
                onClick: handleCopyReport,
              },
              copied ? '✓ 已复制诊断信息' : '复制系统与插件信息'
            )
          )
        ),

        // 2.5 自研插件 GitHub 同步监控横幅
        h(
          'div',
          {
            style: {
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '9px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            },
          },
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                fontSize: '12.5px',
              },
            },
            h('span', { style: { fontWeight: '600', color: '#1e293b' } }, '🐙 GitHub 同步:'),
            gitLoading
              ? h('span', { style: { color: '#64748b', fontSize: '12px' } }, '正在探测插件仓库状态...')
              : gitStatus?.summary
              ? h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
                  h(
                    'span',
                    {
                      style: {
                        background: '#ecfdf5',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontSize: '11px',
                        fontWeight: '600',
                      },
                    },
                    `🟢 已同步 ${gitStatus.summary.syncedCount}`
                  ),
                  gitStatus.summary.dirtyCount > 0 &&
                    h(
                      'span',
                      {
                        style: {
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: '600',
                        },
                      },
                      `🟡 未提交 ${gitStatus.summary.dirtyCount}`
                    ),
                  gitStatus.summary.aheadCount > 0 &&
                    h(
                      'span',
                      {
                        style: {
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: '600',
                        },
                      },
                      `🔵 待推送 ${gitStatus.summary.aheadCount}`
                    ),
                  gitStatus.summary.behindCount > 0 &&
                    h(
                      'span',
                      {
                        style: {
                          background: '#faf5ff',
                          color: '#7e22ce',
                          border: '1px solid #e9d5ff',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: '600',
                        },
                      },
                      `🟣 待拉取 ${gitStatus.summary.behindCount}`
                    )
                )
              : h('span', { style: { color: '#94a3b8', fontSize: '12px' } }, '点击右侧按钮探测')
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h(
              'button',
              {
                style: {
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '3px 9px',
                  fontSize: '11.5px',
                  color: '#334155',
                  cursor: gitLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                },
                disabled: gitLoading,
                onClick: () => loadGitStatus(true),
              },
              gitLoading ? '⏳ 探测中...' : '🔄 检查 GitHub 同步'
            )
          )
        ),

        // 3. 分类切换与搜索工具栏（Toolbar）
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '4px',
            },
          },
          // 左侧：三段式科学分类
          h(
            'div',
            {
              style: {
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                gap: '2px',
                border: '1px solid #e2e8f0',
              },
            },
            h(
              'button',
              {
                style: {
                  background: filter === 'all' ? '#ffffff' : 'transparent',
                  color: filter === 'all' ? '#0f172a' : '#64748b',
                  fontWeight: filter === 'all' ? '600' : '500',
                  boxShadow: filter === 'all' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  border: 'none',
                  padding: '5px 14px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                },
                onClick: () => setFilter('all'),
              },
              `全部插件 (${allCount})`
            ),
            h(
              'button',
              {
                style: {
                  background: filter === 'own' ? '#ffffff' : 'transparent',
                  color: filter === 'own' ? '#0f172a' : '#64748b',
                  fontWeight: filter === 'own' ? '600' : '500',
                  boxShadow: filter === 'own' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  border: 'none',
                  padding: '5px 14px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                },
                onClick: () => setFilter('own'),
              },
              `由 Jack 维护 (${ownCount})`
            ),
            h(
              'button',
              {
                style: {
                  background: filter === 'community' ? '#ffffff' : 'transparent',
                  color: filter === 'community' ? '#0f172a' : '#64748b',
                  fontWeight: filter === 'community' ? '600' : '500',
                  boxShadow: filter === 'community' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  border: 'none',
                  padding: '5px 14px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                },
                onClick: () => setFilter('community'),
              },
              `由社区维护 (${communityCount})`
            )
          ),

          // 右侧：实时搜索输入框
          h(
            'div',
            {
              style: {
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              },
            },
            // 搜索图标
            h(
              'span',
              {
                style: {
                  position: 'absolute',
                  left: '10px',
                  fontSize: '13px',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                },
              },
              '🔍'
            ),
            // 输入控件
            h('input', {
              className: 'jpd-search-input',
              type: 'text',
              value: searchKeyword,
              placeholder: '搜索插件名称、描述或包名...',
              style: {
                padding: '5px 28px 5px 30px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                width: '230px',
                transition: 'all 0.15s',
              },
              onChange: (e) => setSearchKeyword(e.target.value),
            }),
            // 清空按钮
            searchKeyword &&
              h(
                'button',
                {
                  style: {
                    position: 'absolute',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 4px',
                  },
                  onClick: () => setSearchKeyword(''),
                },
                '✕'
              )
          )
        ),

        // 4. 插件列表卡片（全内联样式保底）
        filteredPlugins.length === 0
          ? h(
              'div',
              {
                style: {
                  padding: '36px 0',
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  color: '#64748b',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                },
              },
              h('span', null, `未找到与「${searchKeyword}」匹配的插件`),
              h(
                'button',
                {
                  style: {
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#334155',
                    cursor: 'pointer',
                  },
                  onClick: () => {
                    setSearchKeyword('')
                    setFilter('all')
                  },
                },
                '查看全部插件'
              )
            )
          : h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              filteredPlugins.map((plugin) =>
                h(
                  'div',
                  {
                    key: plugin.id,
                    className: 'jpd-card-hover',
                    style: {
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '13px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    },
                  },
                  h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: 0,
                        flex: 1,
                      },
                    },
                    h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        },
                      },
                      h(
                        'span',
                        {
                          style: {
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#0f172a',
                          },
                        },
                        plugin.displayName
                      ),
                      // 关键区别：由 Jack 维护 vs 由社区维护
                      plugin.isOwn
                        ? h(
                            'span',
                            {
                              style: {
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '1px 6px',
                              },
                            },
                            'Jack 维护'
                          )
                        : h(
                            'span',
                            {
                              style: {
                                background: '#f3e8ff',
                                color: '#6b21a8',
                                border: '1px solid #d8b4fe',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '1px 6px',
                              },
                            },
                            '社区维护'
                          ),
                      h(
                        'span',
                        {
                          style: {
                            fontSize: '12px',
                            color: '#64748b',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          },
                        },
                        plugin.id
                      ),
                      h(
                        'span',
                        {
                          style: {
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            padding: '1px 6px',
                          },
                        },
                        `v${plugin.version}`
                      ),
                      // Git 状态微胶囊 (仅对本地自研插件显示)
                      (() => {
                        const gs = gitStatus?.plugins?.[plugin.id]
                        if (!gs || !gs.isGit) return null
                        if (gs.isDirty) {
                          return h(
                            'span',
                            {
                              style: {
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '1px 6px',
                              },
                              title: gs.dirtyFiles?.join('\n'),
                            },
                            `🟡 ${gs.dirtyCount} modified`
                          )
                        }
                        if (gs.ahead > 0) {
                          return h(
                            'span',
                            {
                              style: {
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '1px 6px',
                              },
                            },
                            `🔵 ${gs.ahead} ahead`
                          )
                        }
                        if (gs.behind > 0) {
                          return h(
                            'span',
                            {
                              style: {
                                background: '#faf5ff',
                                color: '#7e22ce',
                                border: '1px solid #e9d5ff',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '1px 6px',
                              },
                            },
                            `🟣 ${gs.behind} behind`
                          )
                        }
                        if (gs.synced) {
                          return h(
                            'span',
                            {
                              style: {
                                background: '#ecfdf5',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '1px 6px',
                              },
                            },
                            '🟢 Synced'
                          )
                        }
                        return null
                      })()
                    ),
                    h(
                      'div',
                      {
                        style: {
                          fontSize: '12.5px',
                          color: '#475569',
                          lineHeight: '1.45',
                        },
                      },
                      plugin.description || '暂无描述'
                    )
                  ),
                  h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexShrink: 0,
                      },
                    },
                    h(
                      'span',
                      {
                        style: {
                          fontSize: '12.5px',
                          fontWeight: '500',
                          color: plugin.enabled ? '#10b981' : '#94a3b8',
                        },
                      },
                      plugin.enabled ? '已开启' : '已关闭'
                    ),
                    h(
                      'label',
                      {
                        style: {
                          position: 'relative',
                          display: 'inline-block',
                          width: '38px',
                          height: '22px',
                          cursor: 'pointer',
                        },
                      },
                      h('input', {
                        className: 'jpd-switch-input',
                        type: 'checkbox',
                        checked: plugin.enabled,
                        disabled: togglingId === plugin.id,
                        onChange: () => handleToggle(plugin),
                      }),
                      h('span', { className: 'jpd-switch-slider' })
                    )
                  )
                )
              )
            ),

        // 5. 专属确认刷新对话框（Modal Dialog）
        reloadModal.open &&
          h(
            'div',
            {
              style: {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.42)',
                backdropFilter: 'blur(4px)',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
              onClick: () => setReloadModal({ open: false, pluginName: '', actionText: '' }),
            },
            h(
              'div',
              {
                className: 'jpd-modal-content',
                style: {
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px 26px 20px',
                  width: '420px',
                  maxWidth: '90vw',
                  boxShadow:
                    '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                },
                onClick: (e) => e.stopPropagation(),
              },
              h(
                'div',
                { style: { display: 'flex', alignItems: 'flex-start', gap: '14px' } },
                h(
                  'div',
                  {
                    style: {
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                      color: '#10b981',
                    },
                  },
                  '⚡'
                ),
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                  h(
                    'div',
                    {
                      style: {
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#0f172a',
                        letterSpacing: '-0.2px',
                      },
                    },
                    '重新加载窗口以生效'
                  ),
                  h(
                    'div',
                    {
                      style: {
                        fontSize: '13px',
                        color: '#475569',
                        lineHeight: '1.5',
                      },
                    },
                    `插件「${reloadModal.pluginName}」已成功变更为【${reloadModal.actionText}】状态。配置已安全保存，点击确定将立即进行 0.3 秒无感页面重载。`
                  )
                )
              ),
              // 按钮操作区
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '6px',
                  },
                },
                h(
                  'button',
                  {
                    style: {
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '7px 16px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    },
                    onClick: () =>
                      setReloadModal({ open: false, pluginName: '', actionText: '' }),
                  },
                  '稍后手动刷新'
                ),
                h(
                  'button',
                  {
                    style: {
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 18px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                      transition: 'background 0.15s',
                    },
                    onClick: () => window.location.reload(),
                  },
                  '确定并立即刷新 (0.3s)'
                )
              )
            )
          ),

        // 6. 新手引导向导 (Onboarding Wizard)
        onboardingOpen &&
          h(
            'div',
            {
              style: {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(6px)',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            h(
              'div',
              {
                className: 'jpd-modal-content',
                style: {
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '28px 32px 24px',
                  width: '480px',
                  maxWidth: '92vw',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                },
              },
              // 步骤指示器
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                },
                h(
                  'span',
                  {
                    style: {
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: '#3b82f6',
                      letterSpacing: '0.05em',
                    },
                  },
                  `新手向导 · 第 ${onboardingStep} 步 / 共 3 步`
                ),
                h(
                  'div',
                  { style: { display: 'flex', gap: '6px' } },
                  [1, 2, 3].map((step) =>
                    h('div', {
                      key: step,
                      style: {
                        width: step === onboardingStep ? '20px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        background: step === onboardingStep ? '#3b82f6' : '#e2e8f0',
                        transition: 'all 0.2s',
                      },
                    })
                  )
                )
              ),

              // Step 1: 欢迎与底座内核
              onboardingStep === 1 &&
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                    h('span', { style: { fontSize: '28px' } }, '🚀'),
                    h(
                      'div',
                      null,
                      h(
                        'div',
                        {
                          style: {
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#0f172a',
                          },
                        },
                        '欢迎使用 JackDSH'
                      ),
                      h(
                        'div',
                        { style: { fontSize: '13px', color: '#64748b' } },
                        '开箱即用的 DeepSeek Harness 桌面工作台'
                      )
                    )
                  ),
                  h(
                    'div',
                    {
                      style: {
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: '#334155',
                        lineHeight: '1.6',
                      },
                    },
                    h('div', null, '• 底座内核：官方 DeepSeek Harness (0.1.2-rc.1)'),
                    h('div', null, '• 客户端版本：JackDSH 发行版 (内置开箱即用插件)'),
                    h('div', null, '• 数据存储：100% 本地专有存储，绝不上云，不占 iCloud 同步空间。')
                  )
                ),

              // Step 2: 浏览器自动化 (腾讯 BrowserSkill)
              onboardingStep === 2 &&
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                    h('span', { style: { fontSize: '28px' } }, '🌐'),
                    h(
                      'div',
                      null,
                      h(
                        'div',
                        {
                          style: {
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#0f172a',
                          },
                        },
                        '智能浏览器自动化 (BrowserSkill)'
                      ),
                      h(
                        'div',
                        { style: { fontSize: '13px', color: '#64748b' } },
                        '让 AI Agent 帮你自动打开网页、查询资料与抓取内容'
                      )
                    )
                  ),
                  h(
                    'div',
                    {
                      style: {
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        fontSize: '13px',
                        color: '#334155',
                      },
                    },
                    h(
                      'div',
                      null,
                      '配合 Chrome 或 Edge 浏览器的官方扩展使用（两步即可连接）：'
                    ),
                    h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          padding: '8px 12px',
                          borderRadius: '8px',
                        },
                      },
                      h(
                        'span',
                        { style: { fontSize: '12.5px', fontWeight: '500' } },
                        '1. 安装腾讯官方 BrowserSkill 扩展'
                      ),
                      h(
                        'button',
                        {
                          style: {
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          },
                          onClick: () =>
                            window.open(
                              'https://chromewebstore.google.com/detail/browserskill/ehajafkocogpnknpfgfkdmffhmpkhlca',
                              '_blank'
                            ),
                        },
                        '前往商店 ↗'
                      )
                    ),
                    h(
                      'div',
                      { style: { fontSize: '12px', color: '#64748b' } },
                      '2. 在浏览器扩展图标中点击「开启连接」，即可与本地 Agent 完成配对。'
                    )
                  )
                ),

              // Step 3: 手机遥控与插件矩阵
              onboardingStep === 3 &&
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                    h('span', { style: { fontSize: '28px' } }, '📱'),
                    h(
                      'div',
                      null,
                      h(
                        'div',
                        {
                          style: {
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#0f172a',
                          },
                        },
                        '局域网手机遥控与插件大盘'
                      ),
                      h(
                        'div',
                        { style: { fontSize: '13px', color: '#64748b' } },
                        '多端协同，全矩阵能力开箱即用'
                      )
                    )
                  ),
                  h(
                    'div',
                    {
                      style: {
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: '#334155',
                        lineHeight: '1.6',
                      },
                    },
                    h('div', null, '• 手机遥控：同一 Wi-Fi 下扫码，随时在移动设备查看进度与发消息。'),
                    h('div', null, '• 插件大盘：已预装 17 款核心插件，可在设置中随时按需开启或关闭。'),
                    h('div', null, '• 随时重温：任何时候可在「插件大盘」点击右上角重新查看新手向导。')
                  )
                ),

              // 底部导航按钮
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                  },
                },
                // 左侧跳过按钮
                h(
                  'button',
                  {
                    style: {
                      background: 'transparent',
                      color: '#64748b',
                      border: 'none',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: '6px 8px',
                    },
                    onClick: closeOnboarding,
                  },
                  onboardingStep === 2 ? '跳过，稍后配置' : '跳过向导'
                ),
                // 右侧下一步 / 完成按钮
                h(
                  'button',
                  {
                    style: {
                      background: onboardingStep === 3 ? '#10b981' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
                    },
                    onClick: () => {
                      if (onboardingStep < 3) {
                        setOnboardingStep(onboardingStep + 1)
                      } else {
                        closeOnboarding()
                      }
                    },
                  },
                  onboardingStep === 3 ? '开启 JackDSH 之旅 🚀' : '下一步 ➔'
                )
              )
            )
          )
      )
    }

    // --------------------------------------------------------------------------
    // 独立设置分类：配置迁移（MigrationSection）
    // --------------------------------------------------------------------------
    function MigrationSection() {
      ensureStyles()

      const fileInputRef = useRef(null)
      const [isImporting, setIsImporting] = useState(false)
      const [importNotice, setImportNotice] = useState(null)
      const [system, setSystem] = useState(null)

      useEffect(() => {
        fetch('/api/jack-plugins/status')
          .then((res) => res.json())
          .then((data) => {
            if (data && data.ok) {
              setSystem(data.system)
            }
          })
          .catch(() => {})
      }, [])

      const handleExportProfile = () => {
        const a = document.createElement('a')
        a.href = '/api/jack-plugins/export-profile'
        a.download = ''
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      const handleTriggerImport = () => {
        if (fileInputRef.current) {
          fileInputRef.current.click()
        }
      }

      const handleFileSelected = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsImporting(true)
        setImportNotice(null)
        try {
          const text = await file.text()
          const payload = JSON.parse(text)
          const res = await fetch('/api/jack-plugins/import-profile', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const result = await res.json()
          if (result && result.ok) {
            setImportNotice({ error: false, text: `✅ ${result.message || '导入成功'}！页面将在 2 秒后自动刷新...` })
            setTimeout(() => window.location.reload(), 2000)
          } else {
            setImportNotice({ error: true, text: `❌ 导入失败: ${result.error || '未知错误'}` })
          }
        } catch (err) {
          setImportNotice({ error: true, text: `❌ 解析或导入异常: ${err.message}` })
        } finally {
          setIsImporting(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }

      return h(
        'div',
        {
          style: {
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '760px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            paddingBottom: '32px',
          },
        },
        // 头部标题与描述
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            h('h2', { style: { margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' } }, '配置迁移'),
            h(
              'span',
              {
                style: {
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  borderRadius: '999px',
                  border: '1px solid #bfdbfe',
                },
              },
              '随身漫游'
            )
          ),
          h(
            'p',
            { style: { margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' } },
            '全量模型 API Key 与 OAuth 登录凭据（DeepSeek / Grok / Gemini）随身携带。换新电脑或在空白客户端一键导入，瞬间满血复活。'
          )
        ),

        // 导入反馈状态通知
        importNotice &&
          h(
            'div',
            {
              style: {
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '500',
                background: importNotice.error ? '#fef2f2' : '#f0fdf4',
                color: importNotice.error ? '#991b1b' : '#166534',
                border: `1px solid ${importNotice.error ? '#fecaca' : '#bbf7d0'}`,
              },
            },
            importNotice.text
          ),

        // 1. 导出配置卡片
        h(
          'div',
          {
            className: 'jpd-card-hover',
            style: {
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              flexWrap: 'wrap',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'flex-start', gap: '16px', flex: '1 1 360px' } },
            h('span', { style: { fontSize: '32px', lineHeight: 1 } }, '📦'),
            h(
              'div',
              null,
              h('div', { style: { fontSize: '15px', fontWeight: '600', color: '#0f172a' } }, '导出当前配置包'),
              h(
                'div',
                { style: { fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' } },
                '将已保存的所有模型 Key、OAuth 登录授权及自研插件全局偏好打包为一个私密文件（数十 KB）。'
              ),
              h(
                'div',
                {
                  style: {
                    marginTop: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    color: '#b45309',
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    padding: '3px 10px',
                    borderRadius: '6px',
                  },
                },
                '⚠️ 包含私密授权凭证，仅供个人在受信任设备间流转，切勿提交至公开代码仓库。'
              )
            )
          ),
          h(
            'button',
            {
              style: {
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(13, 148, 136, 0.3)',
                transition: 'background-color 0.15s',
                flexShrink: 0,
              },
              onClick: handleExportProfile,
            },
            '⬇️ 导出配置包'
          )
        ),

        // 2. 导入配置卡片
        h(
          'div',
          {
            className: 'jpd-card-hover',
            style: {
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              flexWrap: 'wrap',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'flex-start', gap: '16px', flex: '1 1 360px' } },
            h('span', { style: { fontSize: '32px', lineHeight: 1 } }, '📥'),
            h(
              'div',
              null,
              h('div', { style: { fontSize: '15px', fontWeight: '600', color: '#0f172a' } }, '导入配置包并恢复'),
              h(
                'div',
                { style: { fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' } },
                '从导出的私密配置包直接恢复所有模型授权与系统配置，导入后自动热重载生效。'
              )
            )
          ),
          h(
            'button',
            {
              style: {
                background: '#ffffff',
                color: '#0f766e',
                border: '1px solid #0d9488',
                padding: '10px 22px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isImporting ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s',
                flexShrink: 0,
              },
              disabled: isImporting,
              onClick: handleTriggerImport,
            },
            isImporting ? '正在恢复...' : '⬆️ 选择配置包导入'
          ),
          h('input', {
            type: 'file',
            accept: '.json',
            ref: fileInputRef,
            style: { display: 'none' },
            onChange: handleFileSelected,
          })
        ),

        // 3. 当前系统底座快照与状态说明
        h(
          'div',
          {
            style: {
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            },
          },
          h('div', { style: { fontSize: '13px', fontWeight: '600', color: '#334155' } }, '当前客户端运行环境'),
          h(
            'div',
            { style: { fontSize: '12px', color: '#64748b', lineHeight: '1.7' } },
            `• JackDSH 客户端发行版: v${system?.jackdshVersion || '9.14.8'}`,
            h('br'),
            `• DSH 底座内核: v${system?.dshCoreVersion || '0.1.2-rc.1'}`,
            h('br'),
            `• 运行时数据目录: ${system?.dshHome || '~/.dsh'}`
          )
        )
      )
    }

    // --------------------------------------------------------------------------
    // UI 增强：左下角设置按钮版本号徽章 + 设置左侧导航图标替换
    // --------------------------------------------------------------------------
    let cachedJackDshVersion = '9.14.8'

    function setupUiEnhancements() {
      if (typeof document === 'undefined') return () => {}

      fetch('/api/jack-plugins/status')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.ok && data.system && data.system.jackdshVersion) {
            cachedJackDshVersion = data.system.jackdshVersion
            sync()
          }
        })
        .catch(() => {})

      let disposed = false

      const sync = () => {
        if (disposed) return

        // 1. 同步左下角设置按钮的版本号徽章
        const trigger =
          document.querySelector('[class*="_settingsArea"] button[class*="_trigger"]') ||
          document.querySelector('button[aria-haspopup="dialog"][class*="_trigger"]') ||
          document.querySelector('[class*="_settingsArea"] button')
        if (trigger) {
          const fullTitle = `设置 · JackDSH v${cachedJackDshVersion}`
          if (trigger.getAttribute('title') !== fullTitle) {
            trigger.setAttribute('title', fullTitle)
          }

          const label = trigger.querySelector('[class*="_triggerLabel"]')
          if (label) {
            let badge = trigger.querySelector('.jpd-version-badge')
            if (!badge) {
              badge = document.createElement('span')
              badge.className = 'jpd-version-badge'
              badge.textContent = `v${cachedJackDshVersion}`
              label.after(badge)
            } else if (badge.textContent !== `v${cachedJackDshVersion}`) {
              badge.textContent = `v${cachedJackDshVersion}`
            }
          }
        }

        // 2. 同步设置弹窗左侧导航的【配置迁移】图标
        const navButtons = document.querySelectorAll('[role="dialog"] nav button')
        for (const b of navButtons) {
          const text = b.textContent ? b.textContent.trim() : ''
          if (text === '配置迁移') {
            if (!b.hasAttribute('data-jackdsh-migration-settings-nav')) {
              b.setAttribute('data-jackdsh-migration-settings-nav', '')
            }
          }
        }
      }

      sync()
      const observer = new MutationObserver(sync)
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })

      return () => {
        disposed = true
        observer.disconnect()
        document.querySelectorAll('.jpd-version-badge').forEach((el) => el.remove())
        document.querySelectorAll('[data-jackdsh-migration-settings-nav]').forEach((el) => {
          el.removeAttribute('data-jackdsh-migration-settings-nav')
        })
      }
    }

    function apply(ctx) {
      ensureStyles()
      const cleanupUi = setupUiEnhancements()

      const tabMeta = {
        name: 'settings.plugins.tab',
        id: 'jack-plugin-dashboard',
        order: 15,
        label: () => '插件大盘',
      }

      const migrationSectionMeta = {
        name: 'settings.section',
        id: 'jackdsh-migration',
        order: 14,
        label: () => '配置迁移',
      }

      const registerAll = (slots) => {
        if (!slots) return

        if (typeof slots.inject === 'function') {
          slots.inject('settings.plugins.tab', () => {
            try {
              return slots.register(tabMeta, DashboardTab)
            } catch {
              return () => {}
            }
          })
          slots.inject('settings.section', () => {
            try {
              return slots.register(migrationSectionMeta, MigrationSection)
            } catch {
              return () => {}
            }
          })
        } else if (typeof slots.register === 'function') {
          try {
            slots.register(tabMeta, DashboardTab)
            slots.register(migrationSectionMeta, MigrationSection)
          } catch {}
        }
      }

      if (ctx.slots) {
        registerAll(ctx.slots)
      } else if (typeof ctx.inject === 'function') {
        ctx.inject(['slots'], (sub) => {
          registerAll(sub.slots)
        })
      }

      if (ctx.effect && typeof ctx.effect === 'function') {
        ctx.effect(() => () => {
          if (cleanupUi) cleanupUi()
        })
      }
    }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})
