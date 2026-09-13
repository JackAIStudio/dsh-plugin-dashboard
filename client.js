window.__ModuleLoader__.load({
  id: 'dsh-plugin-dashboard',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const { useState, useEffect, useMemo, createElement: h } = React

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
          '',
          `#### 🧩 插件状态矩阵 (${plugins.length} 个):`,
          ...plugins.map(
            (p) => `- [${p.enabled ? 'x' : ' '}] **${p.displayName}** (\`${p.id}\` v${p.version})${p.isOwn ? ' [由 Jack 维护]' : ' [由社区维护]'}`
          ),
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
                      )
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

    function apply(ctx) {
      const meta = {
        name: 'settings.plugins.tab',
        id: 'jack-plugin-dashboard',
        order: 15,
        label: () => '插件大盘',
      }

      if (ctx.slots && typeof ctx.slots.inject === 'function') {
        ctx.slots.inject('settings.plugins.tab', () => {
          try {
            return ctx.slots.register(meta, DashboardTab)
          } catch {
            return () => {}
          }
        })
      } else if (ctx.slots && typeof ctx.slots.register === 'function') {
        try {
          ctx.slots.register(meta, DashboardTab)
        } catch {}
      } else if (typeof ctx.inject === 'function') {
        ctx.inject(['slots'], (sub) => {
          if (sub.slots) {
            try {
              sub.slots.register(meta, DashboardTab)
            } catch {}
          }
        })
      }
    }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})
