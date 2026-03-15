"use client"

import { useState, useCallback } from "react"
import { store } from "@/lib/store"
import type { Tension, GovernanceLog } from "@/lib/database.types"

const PROCESS_PHASES = ['提案', '明確化Q&A', '異議', '統合', '承認'] as const

export default function GovernanceMeetingPage() {
  const members = store.getMembers()

  const [tensions, setTensions] = useState<Tension[]>(() =>
    store.getTensionsByType("governance").filter((t) => t.status !== "resolved")
  )
  const [selectedTension, setSelectedTension] = useState<Tension | null>(null)
  const [processPhase, setProcessPhase] = useState(0)

  // Phase 2: Clarification
  const [clarificationNotes, setClarificationNotes] = useState("")

  // Phase 3: Objections
  const [objections, setObjections] = useState<Record<string, { checked: boolean; text: string }>>({})

  // Phase 4: Integration
  const [integrationNotes, setIntegrationNotes] = useState("")

  // Phase 5: Role update form
  const [roleForm, setRoleForm] = useState({
    name: "",
    purpose: "",
    domain: "",
    accountabilities: "",
  })

  // Governance logs
  const [logs, setLogs] = useState<GovernanceLog[]>(() => store.getGovernanceLogs())

  const refreshTensions = useCallback(() => {
    setTensions(store.getTensionsByType("governance").filter((t) => t.status !== "resolved"))
  }, [])

  const refreshLogs = useCallback(() => {
    setLogs(store.getGovernanceLogs())
  }, [])

  const hasObjections = Object.values(objections).some((o) => o.checked && o.text.trim())

  const handleSelectTension = useCallback((tension: Tension) => {
    setSelectedTension(tension)
    setProcessPhase(0)
    setClarificationNotes("")
    setObjections({})
    setIntegrationNotes("")
    setRoleForm({ name: "", purpose: "", domain: "", accountabilities: "" })
  }, [])

  const handleApproveAndApply = useCallback(() => {
    if (!selectedTension) return

    // If role form is filled, find and update existing role or log the proposal
    if (roleForm.name.trim()) {
      const existingRole = store.getRoles().find((r) => r.name === roleForm.name.trim())
      if (existingRole) {
        store.updateRole(existingRole.id, {
          name: roleForm.name.trim(),
          purpose: roleForm.purpose.trim(),
          domain: roleForm.domain.trim(),
          accountabilities: roleForm.accountabilities
            .split("\n")
            .map((a) => a.trim())
            .filter(Boolean),
        })
      } else {
        store.addGovernanceLog({
          type: "role_proposal",
          before_snapshot: {},
          after_snapshot: {
            name: roleForm.name.trim(),
            purpose: roleForm.purpose.trim(),
            domain: roleForm.domain.trim(),
            accountabilities: roleForm.accountabilities
              .split("\n")
              .map((a) => a.trim())
              .filter(Boolean),
            tension_title: selectedTension.title,
          },
          changed_by: selectedTension.author_id,
          changed_at: new Date().toISOString(),
        })
      }
    }

    // Mark tension as resolved
    store.updateTension(selectedTension.id, { status: "resolved" })

    // Add governance log
    store.addGovernanceLog({
      type: "tension_resolved",
      before_snapshot: { tension: selectedTension.title, status: "unprocessed" },
      after_snapshot: {
        tension: selectedTension.title,
        status: "resolved",
        integration_notes: integrationNotes,
        objections: Object.entries(objections)
          .filter(([, o]) => o.checked)
          .map(([memberId, o]) => ({
            member: store.getMember(memberId)?.name,
            text: o.text,
          })),
      },
      changed_by: selectedTension.author_id,
      changed_at: new Date().toISOString(),
    })

    setSelectedTension(null)
    setProcessPhase(0)
    refreshTensions()
    refreshLogs()
  }, [selectedTension, roleForm, objections, integrationNotes, refreshTensions, refreshLogs])

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#0f0f11", color: "#e0e0e4" }}>
      {/* Header */}
      <h1 className="text-2xl font-bold mb-6">Governance Meeting</h1>

      <div className="flex gap-6">
        {/* Sidebar: Tension Queue */}
        <div className="w-72 flex-shrink-0">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
          >
            <h2 className="text-sm font-bold mb-3" style={{ color: "#8a8694" }}>
              テンションキュー
            </h2>
            <div className="flex flex-col gap-2">
              {tensions.map((tension) => {
                const author = store.getMember(tension.author_id)
                const isSelected = selectedTension?.id === tension.id
                return (
                  <button
                    key={tension.id}
                    onClick={() => handleSelectTension(tension)}
                    className="text-left rounded-lg p-3 cursor-pointer transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: isSelected ? "rgba(123,94,167,0.15)" : "#22222a",
                      border: isSelected ? "1px solid #7b5ea7" : "1px solid #2a2a32",
                    }}
                  >
                    <div className="text-sm font-medium mb-1 leading-snug">{tension.title}</div>
                    {author && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                          style={{ backgroundColor: author.color, color: "#fff" }}
                        >
                          {author.abbr}
                        </div>
                        <span className="text-[11px]" style={{ color: "#666" }}>
                          {author.name}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
              {tensions.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: "#555" }}>
                  未処理のガバナンステンションはありません
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 min-w-0">
          {selectedTension ? (
            <>
              {/* Phase Stepper */}
              <div className="flex items-center gap-1 mb-6">
                {PROCESS_PHASES.map((phase, idx) => (
                  <div key={phase} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-colors"
                        style={{
                          backgroundColor:
                            idx === processPhase
                              ? "#7b5ea7"
                              : idx < processPhase
                              ? "rgba(123,94,167,0.3)"
                              : "#2a2a32",
                          color: idx <= processPhase ? "#fff" : "#555",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className="text-[11px] text-center leading-tight"
                        style={{ color: idx === processPhase ? "#7b5ea7" : "#666" }}
                      >
                        {phase}
                      </span>
                    </div>
                    {idx < PROCESS_PHASES.length - 1 && (
                      <div
                        className="h-0.5 flex-1 mx-1 mt-[-16px]"
                        style={{
                          backgroundColor:
                            idx < processPhase ? "rgba(123,94,167,0.5)" : "#2a2a32",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Phase Content */}
              <div
                className="rounded-xl p-6 mb-6 min-h-[350px]"
                style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
              >
                <h2 className="text-lg font-bold mb-1" style={{ color: "#7b5ea7" }}>
                  {PROCESS_PHASES[processPhase]}
                </h2>
                <p className="text-xs mb-4" style={{ color: "#666" }}>
                  テンション: {selectedTension.title}
                </p>

                {/* Phase 1: 提案 */}
                {processPhase === 0 && (
                  <div>
                    <div
                      className="rounded-lg p-4 mb-4"
                      style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                    >
                      <h3 className="text-sm font-semibold mb-2">{selectedTension.title}</h3>
                      <p className="text-sm" style={{ color: "#aaa" }}>
                        {selectedTension.description}
                      </p>
                      <div className="mt-3">
                        {(() => {
                          const author = store.getMember(selectedTension.author_id)
                          return author ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                style={{ backgroundColor: author.color, color: "#fff" }}
                              >
                                {author.abbr}
                              </div>
                              <span className="text-xs" style={{ color: "#666" }}>
                                提案者: {author.name}
                              </span>
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: "#8a8694" }}>
                      提案者はこのテンションについて説明し、必要な変更を提案してください。
                    </p>
                  </div>
                )}

                {/* Phase 2: 明確化Q&A */}
                {processPhase === 1 && (
                  <div>
                    <p className="text-xs mb-3" style={{ color: "#8a8694" }}>
                      提案について質問・回答を記録してください。
                    </p>
                    <textarea
                      value={clarificationNotes}
                      onChange={(e) => setClarificationNotes(e.target.value)}
                      placeholder="質問と回答をここに記録..."
                      rows={8}
                      className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none"
                      style={{
                        backgroundColor: "#22222a",
                        border: "1px solid #2a2a32",
                        color: "#e0e0e4",
                      }}
                    />
                  </div>
                )}

                {/* Phase 3: 異議 */}
                {processPhase === 2 && (
                  <div>
                    <p className="text-xs mb-4" style={{ color: "#8a8694" }}>
                      各メンバーは異議があれば記入してください。
                    </p>
                    <div className="flex flex-col gap-3">
                      {members.map((m) => {
                        const obj = objections[m.id] || { checked: false, text: "" }
                        return (
                          <div
                            key={m.id}
                            className="rounded-lg p-3"
                            style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                          >
                            <label className="flex items-center gap-3 cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={obj.checked}
                                onChange={() =>
                                  setObjections((prev) => ({
                                    ...prev,
                                    [m.id]: { ...obj, checked: !obj.checked },
                                  }))
                                }
                                className="w-4 h-4 rounded accent-purple-500"
                              />
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                                style={{ backgroundColor: m.color, color: "#fff" }}
                              >
                                {m.abbr}
                              </div>
                              <span className="text-sm">{m.name}</span>
                              {obj.checked && (
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: "rgba(212,100,74,0.2)", color: "#d4644a" }}
                                >
                                  異議あり
                                </span>
                              )}
                            </label>
                            {obj.checked && (
                              <textarea
                                value={obj.text}
                                onChange={(e) =>
                                  setObjections((prev) => ({
                                    ...prev,
                                    [m.id]: { ...obj, text: e.target.value },
                                  }))
                                }
                                placeholder="異議の内容を記入..."
                                rows={2}
                                className="w-full rounded-md px-3 py-2 text-xs outline-none resize-none ml-7"
                                style={{
                                  backgroundColor: "#1a1a1f",
                                  border: "1px solid #2a2a32",
                                  color: "#e0e0e4",
                                  width: "calc(100% - 28px)",
                                }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Phase 4: 統合 */}
                {processPhase === 3 && (
                  <div>
                    {hasObjections ? (
                      <>
                        <p className="text-xs mb-4" style={{ color: "#8a8694" }}>
                          異議を統合し、修正提案をまとめてください。
                        </p>
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold mb-2" style={{ color: "#d4644a" }}>
                            異議一覧
                          </h3>
                          <div className="flex flex-col gap-2">
                            {Object.entries(objections)
                              .filter(([, o]) => o.checked && o.text.trim())
                              .map(([memberId, o]) => {
                                const member = store.getMember(memberId)
                                return (
                                  <div
                                    key={memberId}
                                    className="rounded-md p-3 text-xs"
                                    style={{
                                      backgroundColor: "rgba(212,100,74,0.1)",
                                      border: "1px solid rgba(212,100,74,0.2)",
                                      color: "#ccc",
                                    }}
                                  >
                                    <span className="font-semibold" style={{ color: "#d4644a" }}>
                                      {member?.name}:
                                    </span>{" "}
                                    {o.text}
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                        <textarea
                          value={integrationNotes}
                          onChange={(e) => setIntegrationNotes(e.target.value)}
                          placeholder="統合メモ: 異議を踏まえた修正提案..."
                          rows={5}
                          className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none"
                          style={{
                            backgroundColor: "#22222a",
                            border: "1px solid #2a2a32",
                            color: "#e0e0e4",
                          }}
                        />
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-sm" style={{ color: "#4a9e6a" }}>
                          異議はありませんでした。承認フェーズに進めます。
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Phase 5: 承認 */}
                {processPhase === 4 && (
                  <div>
                    <p className="text-xs mb-4" style={{ color: "#8a8694" }}>
                      変更を反映するためロール情報を入力してください。
                    </p>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>
                          ロール名
                        </label>
                        <input
                          type="text"
                          value={roleForm.name}
                          onChange={(e) =>
                            setRoleForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="ロール名を入力..."
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                          style={{
                            backgroundColor: "#22222a",
                            border: "1px solid #2a2a32",
                            color: "#e0e0e4",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>
                          パーパス
                        </label>
                        <input
                          type="text"
                          value={roleForm.purpose}
                          onChange={(e) =>
                            setRoleForm((prev) => ({ ...prev, purpose: e.target.value }))
                          }
                          placeholder="このロールの存在意義..."
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                          style={{
                            backgroundColor: "#22222a",
                            border: "1px solid #2a2a32",
                            color: "#e0e0e4",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>
                          ドメイン
                        </label>
                        <input
                          type="text"
                          value={roleForm.domain}
                          onChange={(e) =>
                            setRoleForm((prev) => ({ ...prev, domain: e.target.value }))
                          }
                          placeholder="このロールが管轄する領域..."
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                          style={{
                            backgroundColor: "#22222a",
                            border: "1px solid #2a2a32",
                            color: "#e0e0e4",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>
                          アカウンタビリティ（改行区切り）
                        </label>
                        <textarea
                          value={roleForm.accountabilities}
                          onChange={(e) =>
                            setRoleForm((prev) => ({
                              ...prev,
                              accountabilities: e.target.value,
                            }))
                          }
                          placeholder={"責務1\n責務2\n責務3"}
                          rows={4}
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                          style={{
                            backgroundColor: "#22222a",
                            border: "1px solid #2a2a32",
                            color: "#e0e0e4",
                          }}
                        />
                      </div>
                      <button
                        onClick={handleApproveAndApply}
                        className="self-start px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90"
                        style={{ backgroundColor: "#7b5ea7", color: "#fff" }}
                      >
                        承認して反映
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase Navigation */}
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => setProcessPhase((prev) => Math.max(0, prev - 1))}
                  disabled={processPhase === 0}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "#1a1a1f",
                    border: "1px solid #2a2a32",
                    color: "#e0e0e4",
                  }}
                >
                  ← 前のフェーズ
                </button>
                <button
                  onClick={() =>
                    setProcessPhase((prev) =>
                      Math.min(PROCESS_PHASES.length - 1, prev + 1)
                    )
                  }
                  disabled={processPhase === PROCESS_PHASES.length - 1}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#7b5ea7", color: "#fff" }}
                >
                  次のフェーズ →
                </button>
              </div>
            </>
          ) : (
            <div
              className="rounded-xl p-12 flex items-center justify-center min-h-[400px]"
              style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
            >
              <p className="text-sm" style={{ color: "#555" }}>
                左のキューからテンションを選択して処理を開始してください
              </p>
            </div>
          )}

          {/* Governance Log */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
          >
            <h2 className="text-sm font-bold mb-3" style={{ color: "#8a8694" }}>
              ガバナンスログ
            </h2>
            {logs.length > 0 ? (
              <div className="flex flex-col gap-2">
                {logs
                  .slice()
                  .reverse()
                  .map((log) => {
                    const changer = store.getMember(log.changed_by)
                    return (
                      <div
                        key={log.id}
                        className="rounded-md p-3 text-xs"
                        style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold" style={{ color: "#7b5ea7" }}>
                            {log.type === "role_update"
                              ? "ロール更新"
                              : log.type === "role_delete"
                              ? "ロール削除"
                              : log.type === "tension_resolved"
                              ? "テンション解決"
                              : log.type === "role_proposal"
                              ? "ロール提案"
                              : log.type}
                          </span>
                          <span style={{ color: "#555" }}>
                            {new Date(log.changed_at).toLocaleString("ja-JP")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ color: "#888" }}>
                          {changer && (
                            <>
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                style={{ backgroundColor: changer.color, color: "#fff" }}
                              >
                                {changer.abbr}
                              </div>
                              <span>{changer.name}</span>
                            </>
                          )}
                          {log.after_snapshot &&
                            (log.after_snapshot as Record<string, unknown>).tension ? (
                              <span className="ml-2">
                                - {String((log.after_snapshot as Record<string, unknown>).tension)}
                              </span>
                            ) : null}
                          {log.after_snapshot &&
                            (log.after_snapshot as Record<string, unknown>).name ? (
                              <span className="ml-2">
                                - {String((log.after_snapshot as Record<string, unknown>).name)}
                              </span>
                            ) : null}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-xs text-center py-4" style={{ color: "#555" }}>
                ガバナンスログはまだありません
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
