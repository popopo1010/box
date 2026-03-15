"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { store } from "@/lib/store"
import type { Task, Tension } from "@/lib/database.types"

const PHASES = ['チェックイン', 'メトリクス確認', 'プロジェクト更新', 'テンション処理', 'チェックアウト'] as const

const STATUS_OPTIONS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "未着手" },
  { key: "in_progress", label: "進行中" },
  { key: "done", label: "完了" },
  { key: "blocked", label: "ブロック中" },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function TacticalMeetingPage() {
  const members = store.getMembers()
  const roles = store.getRoles()
  const sprint = store.getActiveSprint()

  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseTimes, setPhaseTimes] = useState<number[]>(() => PHASES.map(() => 0))

  // Phase 1: Check-in
  const [checkedIn, setCheckedIn] = useState<Record<string, boolean>>({})

  // Phase 3: Tasks
  const [tasks, setTasks] = useState<Task[]>(() =>
    sprint ? store.getTasksBySprint(sprint.id) : []
  )

  // Phase 4: Tensions
  const [tensions, setTensions] = useState<Tension[]>(() =>
    store.getTensionsByType("tactical").filter((t) => t.status !== "resolved")
  )
  const [nextActionForm, setNextActionForm] = useState<Record<string, { title: string; assignee_id: string }>>({})

  // Phase 5: Check-out
  const [checkedOut, setCheckedOut] = useState<Record<string, boolean>>({})

  // Track actions taken during meeting
  const [meetingActions, setMeetingActions] = useState<string[]>([])

  // Timer: auto-increments for the current phase
  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseTimes((prev) => {
        const next = [...prev]
        next[phaseIndex] = (next[phaseIndex] || 0) + 1
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phaseIndex])

  const refreshTasks = useCallback(() => {
    if (sprint) {
      setTasks(store.getTasksBySprint(sprint.id))
    }
  }, [sprint])

  const refreshTensions = useCallback(() => {
    setTensions(store.getTensionsByType("tactical").filter((t) => t.status !== "resolved"))
  }, [])

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: Task["status"]) => {
      store.updateTask(taskId, { status: newStatus })
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setMeetingActions((prev) => [
          ...prev,
          `タスク「${task.title}」のステータスを${STATUS_OPTIONS.find((s) => s.key === newStatus)?.label}に変更`,
        ])
      }
      refreshTasks()
    },
    [tasks, refreshTasks]
  )

  const handleProcessTension = useCallback(
    (tensionId: string) => {
      store.updateTension(tensionId, { status: "processing" })
      const tension = tensions.find((t) => t.id === tensionId)
      if (tension) {
        setMeetingActions((prev) => [...prev, `テンション「${tension.title}」の処理を開始`])
      }
      refreshTensions()
    },
    [tensions, refreshTensions]
  )

  const handleResolveTension = useCallback(
    (tensionId: string) => {
      const form = nextActionForm[tensionId]
      if (form && form.title.trim() && form.assignee_id && sprint) {
        store.addTask({
          sprint_id: sprint.id,
          title: form.title.trim(),
          assignee_id: form.assignee_id,
          role_id: null,
          status: "todo",
        })
        setMeetingActions((prev) => [...prev, `ネクストアクション「${form.title.trim()}」を作成`])
        refreshTasks()
      }
      store.updateTension(tensionId, { status: "resolved" })
      const tension = tensions.find((t) => t.id === tensionId)
      if (tension) {
        setMeetingActions((prev) => [...prev, `テンション「${tension.title}」を解決済みに`])
      }
      setNextActionForm((prev) => {
        const next = { ...prev }
        delete next[tensionId]
        return next
      })
      refreshTensions()
    },
    [nextActionForm, sprint, tensions, refreshTasks, refreshTensions]
  )

  const placeholderMetrics = useMemo(
    () => [
      { label: "架電数", value: "127 / 150", pct: 85, color: "#7b5ea7" },
      { label: "書類通過率", value: "32%", pct: 91, color: "#4a9e6a" },
      { label: "面談数", value: "12 / 15", pct: 80, color: "#4a7ec4" },
    ],
    []
  )

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#0f0f11", color: "#e0e0e4" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tactical Meeting</h1>
        <div
          className="px-4 py-2 rounded-lg font-mono text-lg font-bold"
          style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32", color: "#7b5ea7" }}
        >
          {formatTime(phaseTimes[phaseIndex] || 0)}
        </div>
      </div>

      {/* Phase Stepper */}
      <div className="flex items-center gap-1 mb-8">
        {PHASES.map((phase, idx) => (
          <div key={phase} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-colors"
                style={{
                  backgroundColor: idx === phaseIndex ? "#7b5ea7" : idx < phaseIndex ? "rgba(123,94,167,0.3)" : "#2a2a32",
                  color: idx <= phaseIndex ? "#fff" : "#555",
                }}
              >
                {idx + 1}
              </div>
              <span
                className="text-[11px] text-center leading-tight"
                style={{ color: idx === phaseIndex ? "#7b5ea7" : "#666" }}
              >
                {phase}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className="h-0.5 flex-1 mx-1 mt-[-16px]"
                style={{ backgroundColor: idx < phaseIndex ? "rgba(123,94,167,0.5)" : "#2a2a32" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Phase Content */}
      <div
        className="rounded-xl p-6 mb-6 min-h-[400px]"
        style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "#7b5ea7" }}>
          {PHASES[phaseIndex]}
        </h2>

        {/* Phase 1: チェックイン */}
        {phaseIndex === 0 && (
          <div>
            <p className="text-sm mb-4" style={{ color: "#8a8694" }}>
              一言チェックイン。今の気分や状態を一言で共有してください。
            </p>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors hover:bg-white/5"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedIn[m.id]}
                    onChange={() =>
                      setCheckedIn((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                    }
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: m.color, color: "#fff" }}
                  >
                    {m.abbr}
                  </div>
                  <span className="text-sm">{m.name}</span>
                  {checkedIn[m.id] && (
                    <span className="ml-auto text-xs" style={{ color: "#4a9e6a" }}>
                      完了
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Phase 2: メトリクス確認 */}
        {phaseIndex === 1 && (
          <div>
            <p className="text-sm mb-4" style={{ color: "#8a8694" }}>
              主要KPIの確認
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {placeholderMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg p-5"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                >
                  <div className="text-xs mb-2" style={{ color: "#8a8694" }}>
                    {metric.label}
                  </div>
                  <div className="text-2xl font-bold mb-3" style={{ color: metric.color }}>
                    {metric.value}
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#2a2a32" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${metric.pct}%`, backgroundColor: metric.color }}
                    />
                  </div>
                  <div className="text-right text-[11px] mt-1" style={{ color: "#666" }}>
                    目標達成率 {metric.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 3: プロジェクト更新 */}
        {phaseIndex === 2 && (
          <div>
            <p className="text-sm mb-4" style={{ color: "#8a8694" }}>
              {sprint ? `${sprint.name} のタスク状況` : "アクティブなスプリントなし"}
            </p>
            <div className="flex flex-col gap-2">
              {tasks.map((task) => {
                const assignee = store.getMember(task.assignee_id)
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                  >
                    {assignee && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: assignee.color, color: "#fff" }}
                      >
                        {assignee.abbr}
                      </div>
                    )}
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value as Task["status"])
                      }
                      className="rounded-md px-2 py-1 text-xs cursor-pointer outline-none"
                      style={{
                        backgroundColor: "#1a1a1f",
                        border: "1px solid #2a2a32",
                        color: "#e0e0e4",
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
              {tasks.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "#555" }}>
                  タスクがありません
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phase 4: テンション処理 */}
        {phaseIndex === 3 && (
          <div>
            <p className="text-sm mb-4" style={{ color: "#8a8694" }}>
              Tacticalテンションの処理
            </p>
            <div className="flex flex-col gap-4">
              {tensions.map((tension) => {
                const author = store.getMember(tension.author_id)
                const form = nextActionForm[tension.id] || { title: "", assignee_id: "" }
                return (
                  <div
                    key={tension.id}
                    className="rounded-lg p-4"
                    style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold">{tension.title}</h3>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                tension.status === "processing"
                                  ? "rgba(74,126,196,0.2)"
                                  : "rgba(138,134,148,0.2)",
                              color:
                                tension.status === "processing" ? "#4a7ec4" : "#8a8694",
                            }}
                          >
                            {tension.status === "processing" ? "処理中" : "未処理"}
                          </span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: "#8a8694" }}>
                          {tension.description}
                        </p>
                        {author && (
                          <span className="text-[11px]" style={{ color: "#666" }}>
                            起票: {author.name}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {tension.status === "unprocessed" && (
                          <button
                            onClick={() => handleProcessTension(tension.id)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors hover:opacity-90"
                            style={{ backgroundColor: "#4a7ec4", color: "#fff" }}
                          >
                            処理開始
                          </button>
                        )}
                        <button
                          onClick={() => handleResolveTension(tension.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors hover:opacity-90"
                          style={{ backgroundColor: "#4a9e6a", color: "#fff" }}
                        >
                          解決
                        </button>
                      </div>
                    </div>

                    {/* Next Action Form */}
                    <div
                      className="mt-3 pt-3 flex items-end gap-2"
                      style={{ borderTop: "1px solid #2a2a32" }}
                    >
                      <div className="flex-1">
                        <label className="block text-[11px] mb-1" style={{ color: "#666" }}>
                          ネクストアクション
                        </label>
                        <input
                          type="text"
                          placeholder="アクションのタイトル..."
                          value={form.title}
                          onChange={(e) =>
                            setNextActionForm((prev) => ({
                              ...prev,
                              [tension.id]: { ...form, title: e.target.value },
                            }))
                          }
                          className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                          style={{
                            backgroundColor: "#1a1a1f",
                            border: "1px solid #2a2a32",
                            color: "#e0e0e4",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] mb-1" style={{ color: "#666" }}>
                          担当者
                        </label>
                        <select
                          value={form.assignee_id}
                          onChange={(e) =>
                            setNextActionForm((prev) => ({
                              ...prev,
                              [tension.id]: { ...form, assignee_id: e.target.value },
                            }))
                          }
                          className="rounded-md px-2 py-1.5 text-xs cursor-pointer outline-none"
                          style={{
                            backgroundColor: "#1a1a1f",
                            border: "1px solid #2a2a32",
                            color: "#e0e0e4",
                          }}
                        >
                          <option value="">選択</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
              {tensions.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "#555" }}>
                  未解決のテンションはありません
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phase 5: チェックアウト */}
        {phaseIndex === 4 && (
          <div>
            <p className="text-sm mb-4" style={{ color: "#8a8694" }}>
              ミーティングのまとめとチェックアウト
            </p>

            {/* Meeting Summary */}
            <div
              className="rounded-lg p-4 mb-5"
              style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
            >
              <h3 className="text-sm font-semibold mb-3">ミーティングアクションログ</h3>
              {meetingActions.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {meetingActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs" style={{ color: "#aaa" }}>
                      <span className="text-[10px] mt-0.5" style={{ color: "#4a9e6a" }}>
                        ●
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs" style={{ color: "#555" }}>
                  アクションはありませんでした
                </p>
              )}
            </div>

            {/* Current Sprint Tasks Summary */}
            <div
              className="rounded-lg p-4 mb-5"
              style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
            >
              <h3 className="text-sm font-semibold mb-3">現在のタスク状況</h3>
              <div className="flex flex-col gap-1.5">
                {tasks.map((task) => {
                  const assignee = store.getMember(task.assignee_id)
                  const statusLabel = STATUS_OPTIONS.find((s) => s.key === task.status)?.label
                  return (
                    <div key={task.id} className="flex items-center gap-2 text-xs" style={{ color: "#aaa" }}>
                      {assignee && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                          style={{ backgroundColor: assignee.color, color: "#fff" }}
                        >
                          {assignee.abbr}
                        </div>
                      )}
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className="text-[10px]" style={{ color: "#666" }}>
                        {statusLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Checkout */}
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors hover:bg-white/5"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedOut[m.id]}
                    onChange={() =>
                      setCheckedOut((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                    }
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: m.color, color: "#fff" }}
                  >
                    {m.abbr}
                  </div>
                  <span className="text-sm">{m.name}</span>
                  {checkedOut[m.id] && (
                    <span className="ml-auto text-xs" style={{ color: "#4a9e6a" }}>
                      完了
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPhaseIndex((prev) => Math.max(0, prev - 1))}
          disabled={phaseIndex === 0}
          className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32", color: "#e0e0e4" }}
        >
          ← 前のフェーズ
        </button>

        <div className="flex items-center gap-3">
          {PHASES.map((_, idx) => (
            <span key={idx} className="font-mono text-[11px]" style={{ color: "#666" }}>
              {formatTime(phaseTimes[idx] || 0)}
            </span>
          ))}
        </div>

        <button
          onClick={() => setPhaseIndex((prev) => Math.min(PHASES.length - 1, prev + 1))}
          disabled={phaseIndex === PHASES.length - 1}
          className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#7b5ea7", color: "#fff" }}
        >
          次のフェーズ →
        </button>
      </div>
    </div>
  )
}
