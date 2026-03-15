"use client"

import Link from "next/link"
import { store } from "@/lib/store"

const statusColor: Record<string, string> = {
  todo: "bg-gray-500/20 text-gray-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  done: "bg-green-500/20 text-green-400",
  blocked: "bg-[#d4644a]/20 text-[#d4644a]",
}

const statusLabel: Record<string, string> = {
  todo: "Todo",
  in_progress: "進行中",
  done: "完了",
  blocked: "ブロック",
}

const tensionTypeColor: Record<string, string> = {
  governance: "bg-[#7b5ea7]/20 text-[#7b5ea7]",
  tactical: "bg-[#3d9e8c]/20 text-[#3d9e8c]",
  strategy: "bg-[#c49a3c]/20 text-[#c49a3c]",
}

const tensionTypeLabel: Record<string, string> = {
  governance: "ガバナンス",
  tactical: "タクティカル",
  strategy: "ストラテジー",
}

export default function DashboardPage() {
  const currentUser = "ikeo"
  const now = new Date()
  const dateStr = now.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })

  // Sprint data
  const activeSprint = store.getActiveSprint()
  const sprintTasks = activeSprint
    ? store.getTasksBySprint(activeSprint.id)
    : []
  const totalTasks = sprintTasks.length
  const doneTasks = sprintTasks.filter((t) => t.status === "done").length
  const inProgressTasks = sprintTasks.filter(
    (t) => t.status === "in_progress"
  ).length
  const blockedTasks = sprintTasks.filter((t) => t.status === "blocked").length
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Days remaining
  let daysRemaining = 0
  if (activeSprint) {
    const end = new Date(activeSprint.end_date + "T23:59:59")
    const diff = end.getTime() - now.getTime()
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  // Personal tasks
  const myTasks = sprintTasks.filter((t) => t.assignee_id === currentUser)

  // Unprocessed tensions
  const allTensions = store.getTensions()
  const unprocessedTensions = allTensions.filter(
    (t) => t.status === "unprocessed"
  )

  // Team members
  const members = store.getMembers()

  return (
    <div className="min-h-screen bg-[#0f0f11] text-[#e8e6f0]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              ダッシュボード
            </h1>
            <p className="mt-1 text-sm text-[#8a8694]">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#8a8694]">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: store.getMember(currentUser)?.color }}
            >
              {store.getMember(currentUser)?.abbr}
            </span>
            <span>{store.getMember(currentUser)?.name}</span>
          </div>
        </div>

        {/* Top row: Sprint Overview + Personal Tasks */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Sprint Overview Card */}
          <div className="rounded-xl border border-[#2a2a32] bg-[#1a1a1f] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {activeSprint?.name ?? "スプリントなし"}
                </h2>
                <p className="mt-1 text-sm text-[#8a8694]">
                  {activeSprint?.goal}
                </p>
              </div>
              <span className="rounded-lg bg-[#7b5ea7]/20 px-3 py-1 text-xs font-medium text-[#7b5ea7]">
                残り {daysRemaining} 日
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-[#8a8694]">進捗</span>
                <span className="font-medium">
                  {doneTasks}/{totalTasks} タスク ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#2a2a32]">
                <div
                  className="h-full rounded-full bg-[#7b5ea7] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Task stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-[#0f0f11] p-3 text-center">
                <div className="text-2xl font-bold">{totalTasks}</div>
                <div className="text-xs text-[#8a8694]">合計</div>
              </div>
              <div className="rounded-lg bg-[#0f0f11] p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {doneTasks}
                </div>
                <div className="text-xs text-[#8a8694]">完了</div>
              </div>
              <div className="rounded-lg bg-[#0f0f11] p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {inProgressTasks}
                </div>
                <div className="text-xs text-[#8a8694]">進行中</div>
              </div>
              <div className="rounded-lg bg-[#0f0f11] p-3 text-center">
                <div className="text-2xl font-bold text-[#d4644a]">
                  {blockedTasks}
                </div>
                <div className="text-xs text-[#8a8694]">ブロック</div>
              </div>
            </div>
          </div>

          {/* Personal Tasks */}
          <div className="rounded-xl border border-[#2a2a32] bg-[#1a1a1f] p-6">
            <h2 className="mb-4 text-lg font-semibold">マイタスク</h2>
            {myTasks.length === 0 ? (
              <p className="text-sm text-[#8a8694]">
                割り当てられたタスクはありません
              </p>
            ) : (
              <ul className="space-y-3">
                {myTasks.map((task) => {
                  const role = task.role_id
                    ? store.getRole(task.role_id)
                    : null
                  return (
                    <li
                      key={task.id}
                      className="flex items-start justify-between rounded-lg bg-[#0f0f11] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        {role && (
                          <p className="mt-0.5 text-xs text-[#8a8694]">
                            {role.name}
                          </p>
                        )}
                      </div>
                      <span
                        className={`ml-3 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${statusColor[task.status]}`}
                      >
                        {statusLabel[task.status]}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Second row: Tensions + Team KPI */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Unprocessed Tensions */}
          <div className="rounded-xl border border-[#2a2a32] bg-[#1a1a1f] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">未処理テンション</h2>
              <span className="rounded-full bg-[#d4644a]/20 px-2.5 py-0.5 text-xs font-bold text-[#d4644a]">
                {unprocessedTensions.length}
              </span>
            </div>
            <ul className="mb-4 space-y-3">
              {unprocessedTensions.map((tension) => (
                <li
                  key={tension.id}
                  className="rounded-lg bg-[#0f0f11] p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${tensionTypeColor[tension.type]}`}
                    >
                      {tensionTypeLabel[tension.type]}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{tension.title}</p>
                  <p className="mt-0.5 text-xs text-[#8a8694]">
                    {store.getMember(tension.author_id)?.name}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              href="/tensions"
              className="inline-flex items-center text-sm font-medium text-[#7b5ea7] hover:text-[#9b7ec7] transition-colors"
            >
              すべてのテンションを見る
              <svg
                className="ml-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          {/* Team KPI */}
          <div className="rounded-xl border border-[#2a2a32] bg-[#1a1a1f] p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">チーム KPI</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const assignments = store.getAssignmentsForMember(member.id)
                const memberTasks = store.getTasksByAssignee(member.id)
                const memberDone = memberTasks.filter(
                  (t) => t.status === "done"
                ).length
                const completionRate =
                  memberTasks.length > 0
                    ? Math.round((memberDone / memberTasks.length) * 100)
                    : 0

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg bg-[#0f0f11] p-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.abbr}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[#8a8694]">
                        <span>{assignments.length} ロール</span>
                        <span className="text-[#2a2a32]">|</span>
                        <span>
                          完了率{" "}
                          <span
                            className={
                              completionRate >= 50
                                ? "text-green-400"
                                : completionRate > 0
                                  ? "text-[#c49a3c]"
                                  : "text-[#8a8694]"
                            }
                          >
                            {completionRate}%
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
