"use client"

import { useState, useCallback, useMemo } from "react"
import { store } from "@/lib/store"
import type { Task, Sprint } from "@/lib/database.types"

type TaskStatus = Task["status"]

const STATUS_COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "未着手", color: "#8a8694" },
  { key: "in_progress", label: "進行中", color: "#4a7ec4" },
  { key: "done", label: "完了", color: "#4a9e6a" },
  { key: "blocked", label: "ブロック中", color: "#d4644a" },
]

const STATUS_CYCLE: TaskStatus[] = ["todo", "in_progress", "done", "blocked"]

function daysRemaining(endDate: string): number {
  const end = new Date(endDate + "T23:59:59")
  const now = new Date()
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

function statusLabel(status: string): string {
  switch (status) {
    case "planning": return "計画中"
    case "active": return "実行中"
    case "completed": return "完了"
    default: return status
  }
}

export default function SprintPage() {
  const [activeSprint, setActiveSprint] = useState<Sprint | undefined>(() => store.getActiveSprint())
  const sprint = activeSprint
  const members = store.getMembers()
  const roles = store.getRoles()

  const [tasks, setTasks] = useState<Task[]>(() =>
    sprint ? store.getTasksBySprint(sprint.id) : []
  )
  const [showModal, setShowModal] = useState(false)
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [newSprint, setNewSprint] = useState({
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
  })
  const [newTask, setNewTask] = useState({
    title: "",
    assignee_id: "",
    role_id: "",
    status: "todo" as TaskStatus,
  })
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editForm, setEditForm] = useState({ title: "", assignee_id: "", role_id: "", status: "todo" as TaskStatus })
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false)
  const [completedSprints, setCompletedSprints] = useState<Sprint[]>(() =>
    store.getSprints().filter((s) => s.status === "completed")
  )

  const refreshState = useCallback(() => {
    const newActive = store.getActiveSprint()
    setActiveSprint(newActive)
    if (newActive) {
      setTasks(store.getTasksBySprint(newActive.id))
    } else {
      setTasks([])
    }
    setCompletedSprints(store.getSprints().filter((s) => s.status === "completed"))
  }, [])

  const refreshTasks = useCallback(() => {
    if (sprint) {
      setTasks(store.getTasksBySprint(sprint.id))
    }
  }, [sprint])

  const handleCreateSprint = useCallback(() => {
    if (!newSprint.name.trim()) return
    // Complete the currently active sprint first
    const current = store.getActiveSprint()
    if (current) {
      store.updateSprint(current.id, { status: "completed" })
    }
    store.addSprint({
      name: newSprint.name.trim(),
      goal: newSprint.goal.trim(),
      start_date: newSprint.start_date,
      end_date: newSprint.end_date,
      status: "active",
    })
    setNewSprint({ name: "", goal: "", start_date: "", end_date: "" })
    setShowSprintModal(false)
    refreshState()
  }, [newSprint, refreshState])

  const handleCompleteSprint = useCallback(() => {
    if (!sprint) return
    store.updateSprint(sprint.id, { status: "completed" })
    refreshState()
  }, [sprint, refreshState])

  const handleAddTask = useCallback(() => {
    if (!sprint || !newTask.title.trim() || !newTask.assignee_id) return
    store.addTask({
      sprint_id: sprint.id,
      title: newTask.title.trim(),
      assignee_id: newTask.assignee_id,
      role_id: newTask.role_id || null,
      status: newTask.status,
    })
    refreshTasks()
    setNewTask({ title: "", assignee_id: "", role_id: "", status: "todo" })
    setShowModal(false)
  }, [sprint, newTask, refreshTasks])

  const handleOpenEdit = useCallback((task: Task) => {
    setEditTask(task)
    setEditForm({
      title: task.title,
      assignee_id: task.assignee_id,
      role_id: task.role_id ?? "",
      status: task.status,
    })
    setConfirmDeleteTask(false)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editTask || !editForm.title.trim()) return
    store.updateTask(editTask.id, {
      title: editForm.title.trim(),
      assignee_id: editForm.assignee_id,
      role_id: editForm.role_id || null,
      status: editForm.status,
    })
    setEditTask(null)
    refreshTasks()
  }, [editTask, editForm, refreshTasks])

  const handleDeleteTask = useCallback(() => {
    if (!editTask) return
    store.deleteTask(editTask.id)
    setEditTask(null)
    setConfirmDeleteTask(false)
    refreshTasks()
  }, [editTask, refreshTasks])

  const handleCycleStatus = useCallback((e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    const currentIdx = STATUS_CYCLE.indexOf(task.status)
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]
    store.updateTask(task.id, { status: nextStatus })
    refreshTasks()
  }, [refreshTasks])

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
      blocked: [],
    }
    for (const t of tasks) {
      map[t.status]?.push(t)
    }
    return map
  }, [tasks])

  const doneCount = tasksByStatus.done.length
  const totalCount = tasks.length
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const memberStats = useMemo(() => {
    return members.map((m) => {
      const memberTasks = tasks.filter((t) => t.assignee_id === m.id)
      const done = memberTasks.filter((t) => t.status === "done").length
      const total = memberTasks.length
      return { member: m, tasks: memberTasks, done, total }
    }).filter((s) => s.total > 0)
  }, [members, tasks])

  if (!sprint) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: "#0f0f11", color: "#ccc" }}>
        <p className="text-lg">アクティブなスプリントがありません</p>
        <button
          onClick={() => setShowSprintModal(true)}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: "#7b5ea7", color: "#fff" }}
        >
          新規スプリント
        </button>

        {/* Sprint History when no active sprint */}
        {completedSprints.length > 0 && (
          <div className="w-full max-w-4xl px-6 mt-4">
            <div className="rounded-xl p-6" style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}>
              <h2 className="text-lg font-bold mb-5">スプリント履歴</h2>
              <div className="flex flex-col gap-3">
                {completedSprints.map((cs) => {
                  const csTasks = store.getTasksBySprint(cs.id)
                  const csDone = csTasks.filter((t) => t.status === "done").length
                  const csTotal = csTasks.length
                  const csPct = csTotal > 0 ? Math.round((csDone / csTotal) * 100) : 0
                  return (
                    <div key={cs.id} className="rounded-lg p-4" style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{cs.name}</span>
                        <span className="text-xs" style={{ color: "#8a8694" }}>
                          {csDone}/{csTotal} 完了 ({csPct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "#8a8694" }}>
                        <span>{cs.start_date} 〜 {cs.end_date}</span>
                        {cs.goal && <span>・{cs.goal}</span>}
                      </div>
                      <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: "#2a2a32" }}>
                        <div className="h-full rounded-full" style={{ width: `${csPct}%`, backgroundColor: "#4a9e6a" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sprint Creation Modal (no-sprint state) */}
        {showSprintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSprintModal(false)}>
            <div
              className="rounded-xl p-6 w-full max-w-md shadow-2xl"
              style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-5">新規スプリント作成</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>スプリント名 *</label>
                  <input
                    type="text"
                    value={newSprint.name}
                    onChange={(e) => setNewSprint((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                    style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                    placeholder="Sprint 2 など..."
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>ゴール</label>
                  <input
                    type="text"
                    value={newSprint.goal}
                    onChange={(e) => setNewSprint((p) => ({ ...p, goal: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                    style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                    placeholder="スプリントの目標..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>開始日</label>
                    <input
                      type="date"
                      value={newSprint.start_date}
                      onChange={(e) => setNewSprint((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                      style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>終了日</label>
                    <input
                      type="date"
                      value={newSprint.end_date}
                      onChange={(e) => setNewSprint((p) => ({ ...p, end_date: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                      style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSprintModal(false)}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors hover:bg-white/5"
                  style={{ color: "#8a8694" }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateSprint}
                  disabled={!newSprint.name.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#7b5ea7", color: "#fff" }}
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const remaining = daysRemaining(sprint.end_date)

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#0f0f11", color: "#e0e0e4" }}>
      {/* Sprint Header */}
      <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold truncate">{sprint.name}</h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  backgroundColor:
                    sprint.status === "active" ? "rgba(74,158,106,0.2)" :
                    sprint.status === "planning" ? "rgba(74,126,196,0.2)" :
                    "rgba(138,134,148,0.2)",
                  color:
                    sprint.status === "active" ? "#4a9e6a" :
                    sprint.status === "planning" ? "#4a7ec4" :
                    "#8a8694",
                }}
              >
                {statusLabel(sprint.status)}
              </span>
            </div>
            <p className="text-sm mb-3" style={{ color: "#8a8694" }}>{sprint.goal}</p>
            <div className="flex items-center gap-4 text-sm" style={{ color: "#8a8694" }}>
              <span>{sprint.start_date} 〜 {sprint.end_date}</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: remaining <= 1 ? "rgba(212,100,74,0.2)" : "rgba(74,126,196,0.2)",
                  color: remaining <= 1 ? "#d4644a" : "#4a7ec4",
                }}
              >
                残り {remaining} 日
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 min-w-[200px]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSprintModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: "#7b5ea7", color: "#fff" }}
              >
                新規スプリント
              </button>
              <button
                onClick={handleCompleteSprint}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: "rgba(74,158,106,0.2)", color: "#4a9e6a", border: "1px solid rgba(74,158,106,0.3)" }}
              >
                スプリント完了
              </button>
            </div>
            <span className="text-sm font-medium" style={{ color: "#8a8694" }}>
              進捗: {doneCount}/{totalCount} タスク ({progressPct}%)
            </span>
            <div className="w-full h-2.5 rounded-full" style={{ backgroundColor: "#2a2a32" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: "#4a9e6a" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: "#4a7ec4", color: "#fff" }}
        >
          ＋ タスク追加
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATUS_COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.key]
          return (
            <div key={col.key} className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}>
              {/* Column Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `2px solid ${col.color}` }}>
                <span className="text-sm font-semibold" style={{ color: col.color }}>
                  {col.label}
                </span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${col.color}22`, color: col.color }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="p-3 flex flex-col gap-3 min-h-[120px]">
                {colTasks.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: "#555" }}>タスクなし</p>
                )}
                {colTasks.map((task) => {
                  const assignee = store.getMember(task.assignee_id)
                  const role = task.role_id ? store.getRole(task.role_id) : null
                  const statusCol = STATUS_COLUMNS.find((c) => c.key === task.status)
                  return (
                    <div
                      key={task.id}
                      className="relative rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                      style={{
                        backgroundColor: "#22222a",
                        border: "1px solid #2a2a32",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      }}
                      onClick={() => handleOpenEdit(task)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${statusCol?.color ?? "#555"}22`, color: statusCol?.color ?? "#555" }}
                          onClick={(e) => handleCycleStatus(e, task)}
                          title="クリックでステータス変更"
                        >
                          {statusCol?.label}
                        </span>
                      </div>
                      {assignee && (
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: assignee.color, color: "#fff" }}
                          >
                            {assignee.abbr}
                          </div>
                          <span className="text-xs truncate" style={{ color: "#aaa" }}>
                            {assignee.name}
                          </span>
                        </div>
                      )}
                      {role && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#2a2a32", color: "#8a8694" }}>
                          {role.name}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Member Progress Section */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}>
        <h2 className="text-lg font-bold mb-5">メンバー別進捗</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {memberStats.map(({ member, tasks: mTasks, done, total }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <div key={member.id} className="rounded-lg p-4" style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: member.color, color: "#fff" }}
                  >
                    {member.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{member.name}</span>
                      <span className="text-xs ml-2 whitespace-nowrap" style={{ color: "#8a8694" }}>
                        {done}/{total} 完了 ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full mt-1.5" style={{ backgroundColor: "#2a2a32" }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: member.color }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {mTasks.map((t) => {
                    const col = STATUS_COLUMNS.find((c) => c.key === t.status)
                    return (
                      <div key={t.id} className="flex items-center gap-2 text-xs" style={{ color: "#aaa" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: col?.color ?? "#555" }} />
                        <span className="truncate flex-1">{t.title}</span>
                        <span className="text-[10px] whitespace-nowrap" style={{ color: col?.color ?? "#555" }}>
                          {col?.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Task Edit Modal */}
      {editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setEditTask(null); setConfirmDeleteTask(false) }}>
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-5">タスク詳細</h3>

            <div className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>タイトル</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                  placeholder="タスクのタイトルを入力..."
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>担当者</label>
                <select
                  value={editForm.assignee_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, assignee_id: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 cursor-pointer"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                >
                  <option value="">選択してください</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>ロール</label>
                <select
                  value={editForm.role_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, role_id: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 cursor-pointer"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                >
                  <option value="">なし</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>ステータス</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as TaskStatus }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 cursor-pointer"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                >
                  {STATUS_COLUMNS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Delete Section */}
            <div className="mt-6 pt-4" style={{ borderTop: "1px solid #2a2a32" }}>
              {!confirmDeleteTask ? (
                <button
                  onClick={() => setConfirmDeleteTask(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:opacity-90"
                  style={{ backgroundColor: "rgba(212,100,74,0.15)", color: "#d4644a", border: "1px solid rgba(212,100,74,0.3)" }}
                >
                  タスクを削除
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "#d4644a" }}>本当に削除しますか？</span>
                  <button
                    onClick={handleDeleteTask}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#d4644a", color: "#fff" }}
                  >
                    削除する
                  </button>
                  <button
                    onClick={() => setConfirmDeleteTask(false)}
                    className="px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:bg-white/5"
                    style={{ color: "#8a8694" }}
                  >
                    やめる
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setEditTask(null); setConfirmDeleteTask(false) }}
                className="px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors hover:bg-white/5"
                style={{ color: "#8a8694" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editForm.title.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#4a7ec4", color: "#fff" }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint History */}
      {completedSprints.length > 0 && (
        <div className="rounded-xl p-6 mt-6" style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}>
          <h2 className="text-lg font-bold mb-5">スプリント履歴</h2>
          <div className="flex flex-col gap-3">
            {completedSprints.map((cs) => {
              const csTasks = store.getTasksBySprint(cs.id)
              const csDone = csTasks.filter((t) => t.status === "done").length
              const csTotal = csTasks.length
              const csPct = csTotal > 0 ? Math.round((csDone / csTotal) * 100) : 0
              return (
                <div key={cs.id} className="rounded-lg p-4" style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{cs.name}</span>
                    <span className="text-xs" style={{ color: "#8a8694" }}>
                      {csDone}/{csTotal} 完了 ({csPct}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#8a8694" }}>
                    <span>{cs.start_date} 〜 {cs.end_date}</span>
                    {cs.goal && <span>・{cs.goal}</span>}
                  </div>
                  <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: "#2a2a32" }}>
                    <div className="h-full rounded-full" style={{ width: `${csPct}%`, backgroundColor: "#4a9e6a" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sprint Creation Modal */}
      {showSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSprintModal(false)}>
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-5">新規スプリント作成</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>スプリント名 *</label>
                <input
                  type="text"
                  value={newSprint.name}
                  onChange={(e) => setNewSprint((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                  placeholder="Sprint 2 など..."
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>ゴール</label>
                <input
                  type="text"
                  value={newSprint.goal}
                  onChange={(e) => setNewSprint((p) => ({ ...p, goal: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                  style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                  placeholder="スプリントの目標..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>開始日</label>
                  <input
                    type="date"
                    value={newSprint.start_date}
                    onChange={(e) => setNewSprint((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                    style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>終了日</label>
                  <input
                    type="date"
                    value={newSprint.end_date}
                    onChange={(e) => setNewSprint((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                    style={{ backgroundColor: "#22222a", border: "1px solid #2a2a32", color: "#e0e0e4" }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSprintModal(false)}
                className="px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors hover:bg-white/5"
                style={{ color: "#8a8694" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateSprint}
                disabled={!newSprint.name.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#7b5ea7", color: "#fff" }}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: "#1a1a1f", border: "1px solid #2a2a32" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-5">タスク追加</h3>

            <div className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>タイトル</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                  style={{
                    backgroundColor: "#22222a",
                    border: "1px solid #2a2a32",
                    color: "#e0e0e4",
                  }}
                  placeholder="タスクのタイトルを入力..."
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>担当者</label>
                <select
                  value={newTask.assignee_id}
                  onChange={(e) => setNewTask((p) => ({ ...p, assignee_id: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 cursor-pointer"
                  style={{
                    backgroundColor: "#22222a",
                    border: "1px solid #2a2a32",
                    color: "#e0e0e4",
                  }}
                >
                  <option value="">選択してください</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>ロール</label>
                <select
                  value={newTask.role_id}
                  onChange={(e) => setNewTask((p) => ({ ...p, role_id: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 cursor-pointer"
                  style={{
                    backgroundColor: "#22222a",
                    border: "1px solid #2a2a32",
                    color: "#e0e0e4",
                  }}
                >
                  <option value="">なし</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8694" }}>ステータス</label>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask((p) => ({ ...p, status: e.target.value as TaskStatus }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 cursor-pointer"
                  style={{
                    backgroundColor: "#22222a",
                    border: "1px solid #2a2a32",
                    color: "#e0e0e4",
                  }}
                >
                  {STATUS_COLUMNS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors hover:bg-white/5"
                style={{ color: "#8a8694" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTask.title.trim() || !newTask.assignee_id}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#4a7ec4", color: "#fff" }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
