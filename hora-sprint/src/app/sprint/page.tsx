"use client"

import { useState, useCallback, useMemo } from "react"
import { store } from "@/lib/store"
import type { Task } from "@/lib/database.types"

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
  const sprint = store.getActiveSprint()
  const members = store.getMembers()
  const roles = store.getRoles()

  const [tasks, setTasks] = useState<Task[]>(() =>
    sprint ? store.getTasksBySprint(sprint.id) : []
  )
  const [showModal, setShowModal] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    assignee_id: "",
    role_id: "",
    status: "todo" as TaskStatus,
  })
  const [statusMenu, setStatusMenu] = useState<string | null>(null)

  const refreshTasks = useCallback(() => {
    if (sprint) {
      setTasks(store.getTasksBySprint(sprint.id))
    }
  }, [sprint])

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      store.updateTask(taskId, { status: newStatus })
      refreshTasks()
      setStatusMenu(null)
    },
    [refreshTasks]
  )

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0f0f11", color: "#ccc" }}>
        <p className="text-lg">アクティブなスプリントがありません</p>
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
          <div className="flex flex-col items-end gap-2 min-w-[200px]">
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
                  return (
                    <div
                      key={task.id}
                      className="relative rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                      style={{
                        backgroundColor: "#22222a",
                        border: "1px solid #2a2a32",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      }}
                      onClick={() => setStatusMenu(statusMenu === task.id ? null : task.id)}
                    >
                      <p className="text-sm font-medium mb-2 leading-snug">{task.title}</p>
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

                      {/* Status Change Dropdown */}
                      {statusMenu === task.id && (
                        <div
                          className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden shadow-xl"
                          style={{ backgroundColor: "#2a2a32", border: "1px solid #3a3a42", minWidth: "140px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {STATUS_COLUMNS.map((s) => (
                            <button
                              key={s.key}
                              className="block w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5 cursor-pointer"
                              style={{ color: s.key === task.status ? s.color : "#aaa" }}
                              onClick={() => handleStatusChange(task.id, s.key)}
                            >
                              {s.key === task.status ? "● " : "○ "}
                              {s.label}
                            </button>
                          ))}
                        </div>
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

      {/* Close any open menus when clicking outside */}
      {statusMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setStatusMenu(null)} />
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
