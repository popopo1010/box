"use client"

import { useState } from 'react'
import { store } from '@/lib/store'
import { Check, ChevronRight, Shield } from 'lucide-react'

const GOV_PHASES = ['提案', '明確化Q&A', '異議', '統合', '承認'] as const

export default function GovernanceMTGPage() {
  const [tensions, setTensions] = useState(() =>
    store.getTensionsByType('governance').filter(t => t.status !== 'resolved')
  )
  const [selectedTensionId, setSelectedTensionId] = useState<string | null>(null)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [clarificationNotes, setClarificationNotes] = useState('')
  const [objections, setObjections] = useState<Record<string, string>>({})
  const [integrationNotes, setIntegrationNotes] = useState('')
  const [roleEditData, setRoleEditData] = useState({
    name: '',
    purpose: '',
    domain: '',
    accountabilities: '',
  })
  const [logs, setLogs] = useState(() => store.getGovernanceLogs())

  const members = store.getMembers()
  const selectedTension = selectedTensionId ? tensions.find(t => t.id === selectedTensionId) : null

  const startProcessing = (tensionId: string) => {
    setSelectedTensionId(tensionId)
    setPhaseIndex(0)
    setClarificationNotes('')
    setObjections({})
    setIntegrationNotes('')
    setRoleEditData({ name: '', purpose: '', domain: '', accountabilities: '' })
  }

  const toggleObjection = (memberId: string, text: string) => {
    setObjections(prev => {
      const next = { ...prev }
      if (next[memberId]) delete next[memberId]
      else next[memberId] = text
      return next
    })
  }

  const approveAndApply = () => {
    if (!selectedTension) return

    // Apply role change if data was entered
    if (roleEditData.name) {
      // Find or create role based on tension
      const newRole = store.addRole({
        circle_id: store.getCircles()[0]?.id || '',
        name: roleEditData.name,
        purpose: roleEditData.purpose,
        domain: roleEditData.domain,
        accountabilities: roleEditData.accountabilities.split('\n').filter(Boolean),
      })

      store.addGovernanceLog({
        type: 'role_create_via_governance',
        before_snapshot: {},
        after_snapshot: newRole as unknown as Record<string, unknown>,
        changed_by: selectedTension.author_id,
        changed_at: new Date().toISOString(),
      })
    }

    // Mark tension as resolved
    store.updateTension(selectedTensionId!, { status: 'resolved' })
    setTensions(store.getTensionsByType('governance').filter(t => t.status !== 'resolved'))
    setLogs(store.getGovernanceLogs())
    setSelectedTensionId(null)
    setPhaseIndex(0)
  }

  const hasObjections = Object.keys(objections).length > 0

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield size={28} style={{ color: '#7b5ea7' }} />
        <h1 className="text-2xl font-bold" style={{ color: '#e8e6f0' }}>ガバナンスMTG</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Tension Queue */}
        <div className="col-span-4">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#8a8694' }}>テンションキュー</h2>
          <div className="space-y-2">
            {tensions.length === 0 ? (
              <p className="text-sm p-4 rounded-lg" style={{ background: '#1a1a1f', color: '#8a8694', border: '1px solid #2a2a32' }}>
                未処理のガバナンステンションはありません。
              </p>
            ) : (
              tensions.map(t => {
                const author = store.getMember(t.author_id)
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg cursor-pointer transition-colors"
                    style={{
                      background: selectedTensionId === t.id ? 'rgba(123,94,167,0.15)' : '#1a1a1f',
                      border: '1px solid ' + (selectedTensionId === t.id ? '#7b5ea7' : '#2a2a32'),
                    }}
                    onClick={() => startProcessing(t.id)}
                  >
                    <h3 className="text-sm font-bold" style={{ color: '#e8e6f0' }}>{t.title}</h3>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: '#8a8694' }}>{t.description}</p>
                    {author && <p className="text-xs mt-1" style={{ color: '#7b5ea7' }}>起票: {author.name}</p>}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Processing Area */}
        <div className="col-span-8">
          {!selectedTension ? (
            <div className="flex items-center justify-center h-64 rounded-xl" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
              <p className="text-sm" style={{ color: '#8a8694' }}>左のキューからテンションを選択してください</p>
            </div>
          ) : (
            <div>
              {/* Phase stepper */}
              <div className="flex items-center gap-1 mb-6">
                {GOV_PHASES.map((phase, i) => (
                  <div key={phase} className="flex items-center">
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: i === phaseIndex ? '#7b5ea7' : i < phaseIndex ? 'rgba(123,94,167,0.2)' : '#1a1a1f',
                        color: i === phaseIndex ? '#fff' : i < phaseIndex ? '#7b5ea7' : '#8a8694',
                        border: '1px solid ' + (i === phaseIndex ? '#7b5ea7' : '#2a2a32'),
                      }}
                    >
                      {i < phaseIndex ? <Check size={12} /> : null}
                      {phase}
                    </div>
                    {i < GOV_PHASES.length - 1 && <ChevronRight size={14} style={{ color: '#2a2a32' }} className="mx-0.5" />}
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2a2a32', minHeight: '350px' }}>
                {/* 提案 */}
                {phaseIndex === 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-3" style={{ color: '#e8e6f0' }}>{selectedTension.title}</h3>
                    <p className="text-sm mb-4" style={{ color: '#8a8694' }}>{selectedTension.description}</p>
                    <div className="p-3 rounded-lg" style={{ background: '#0f0f11', border: '1px solid #2a2a32' }}>
                      <p className="text-xs" style={{ color: '#8a8694' }}>
                        起票者: {store.getMember(selectedTension.author_id)?.name} / 分類: ガバナンス
                      </p>
                    </div>
                  </div>
                )}

                {/* 明確化Q&A */}
                {phaseIndex === 1 && (
                  <div>
                    <h3 className="text-sm font-bold mb-3" style={{ color: '#e8e6f0' }}>明確化Q&A</h3>
                    <p className="text-xs mb-3" style={{ color: '#8a8694' }}>提案内容について質問・回答を記録します。</p>
                    <textarea
                      value={clarificationNotes}
                      onChange={e => setClarificationNotes(e.target.value)}
                      placeholder="Q&Aノート..."
                      rows={6}
                      className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                      style={{ background: '#0f0f11', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                    />
                  </div>
                )}

                {/* 異議 */}
                {phaseIndex === 2 && (
                  <div>
                    <h3 className="text-sm font-bold mb-3" style={{ color: '#e8e6f0' }}>異議確認</h3>
                    <p className="text-xs mb-3" style={{ color: '#8a8694' }}>各メンバーが異議を表明できます。</p>
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.id} className="p-3 rounded-lg" style={{ background: '#0f0f11', border: '1px solid #2a2a32' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: m.color }}>
                              {m.abbr}
                            </div>
                            <span className="text-sm flex-1" style={{ color: '#e8e6f0' }}>{m.name}</span>
                            <button
                              onClick={() => toggleObjection(m.id, objections[m.id] || '異議あり')}
                              className="text-xs px-3 py-1 rounded-lg"
                              style={{
                                background: objections[m.id] ? '#d4644a' : '#2a2a32',
                                color: objections[m.id] ? '#fff' : '#8a8694',
                              }}
                            >
                              {objections[m.id] ? '異議あり' : '異議なし'}
                            </button>
                          </div>
                          {objections[m.id] && (
                            <input
                              type="text"
                              value={objections[m.id]}
                              onChange={e => setObjections(prev => ({ ...prev, [m.id]: e.target.value }))}
                              className="mt-2 w-full text-xs px-2 py-1 rounded outline-none"
                              style={{ background: '#1a1a1f', color: '#e8e6f0', border: '1px solid #d4644a' }}
                              placeholder="異議の内容..."
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 統合 */}
                {phaseIndex === 3 && (
                  <div>
                    <h3 className="text-sm font-bold mb-3" style={{ color: '#e8e6f0' }}>統合</h3>
                    {hasObjections ? (
                      <>
                        <div className="mb-4">
                          <p className="text-xs mb-2" style={{ color: '#d4644a' }}>以下の異議が提出されました：</p>
                          {Object.entries(objections).map(([memberId, text]) => {
                            const m = store.getMember(memberId)
                            return (
                              <div key={memberId} className="text-xs p-2 rounded mb-1" style={{ background: 'rgba(212,100,74,0.1)', color: '#d4644a' }}>
                                {m?.name}: {text}
                              </div>
                            )
                          })}
                        </div>
                        <textarea
                          value={integrationNotes}
                          onChange={e => setIntegrationNotes(e.target.value)}
                          placeholder="統合案を記述..."
                          rows={4}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                          style={{ background: '#0f0f11', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                        />
                      </>
                    ) : (
                      <p className="text-sm" style={{ color: '#4a9e6a' }}>異議なし。承認に進めます。</p>
                    )}
                  </div>
                )}

                {/* 承認 */}
                {phaseIndex === 4 && (
                  <div>
                    <h3 className="text-sm font-bold mb-3" style={{ color: '#e8e6f0' }}>承認・ロール変更</h3>
                    <p className="text-xs mb-4" style={{ color: '#8a8694' }}>
                      この提案に基づくロール変更を入力してください（任意）。
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs block mb-1" style={{ color: '#8a8694' }}>ロール名</label>
                        <input
                          type="text"
                          value={roleEditData.name}
                          onChange={e => setRoleEditData(d => ({ ...d, name: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ background: '#0f0f11', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={{ color: '#8a8694' }}>Purpose</label>
                        <input
                          type="text"
                          value={roleEditData.purpose}
                          onChange={e => setRoleEditData(d => ({ ...d, purpose: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ background: '#0f0f11', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={{ color: '#8a8694' }}>Domain</label>
                        <input
                          type="text"
                          value={roleEditData.domain}
                          onChange={e => setRoleEditData(d => ({ ...d, domain: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ background: '#0f0f11', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={{ color: '#8a8694' }}>Accountabilities（1行1項目）</label>
                        <textarea
                          value={roleEditData.accountabilities}
                          onChange={e => setRoleEditData(d => ({ ...d, accountabilities: e.target.value }))}
                          rows={3}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                          style={{ background: '#0f0f11', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={approveAndApply}
                      className="px-6 py-2 rounded-lg text-sm font-bold"
                      style={{ background: '#4a9e6a', color: '#fff' }}
                    >
                      承認して反映
                    </button>
                  </div>
                )}
              </div>

              {/* Phase navigation */}
              {phaseIndex < 4 && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setPhaseIndex(i => i + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: '#7b5ea7', color: '#fff' }}
                  >
                    次のフェーズ <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Governance Log */}
          {logs.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold mb-3" style={{ color: '#8a8694' }}>ガバナンス変更ログ</h2>
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="p-3 rounded-lg text-xs" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
                    <span style={{ color: '#7b5ea7' }}>{log.type}</span>
                    <span style={{ color: '#8a8694' }}> — {store.getMember(log.changed_by)?.name} — {new Date(log.changed_at).toLocaleString('ja-JP')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
