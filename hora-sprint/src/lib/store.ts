"use client"

import type { Member, Circle, Role, RoleAssignment, Tension, Sprint, Task, GovernanceLog } from './database.types'

// localStorage persistence helpers

const LS_PREFIX = 'hora-sprint:'

function loadData<T>(key: string, defaults: T[]): T[] {
  if (typeof window === 'undefined') return [...defaults]
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T[]
  } catch {
    // corrupted data — fall back to defaults
  }
  return [...defaults]
}

function saveData(key: string, data: unknown[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

function loadNumber(key: string, defaultValue: number): number {
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as number
  } catch {
    // fall back
  }
  return defaultValue
}

function saveNumber(key: string, value: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // silently ignore
  }
}

// Seed data (defaults when localStorage is empty)

const SEED_MEMBERS: Member[] = [
  { id: 'ikeo', name: 'いけお（柴山友貴）', email: 'ikeo@xchange.co.jp', color: '#7b5ea7', abbr: 'IK', created_at: '2024-01-01T00:00:00Z' },
  { id: 'haya', name: '林 佑樹', email: 'hayashi@xchange.co.jp', color: '#3d9e8c', abbr: 'HA', created_at: '2024-01-01T00:00:00Z' },
  { id: 'fuku', name: '福山 和生', email: 'fukuyama@xchange.co.jp', color: '#c49a3c', abbr: 'FK', created_at: '2024-01-01T00:00:00Z' },
  { id: 'shige', name: '茂野 薫', email: 'shigeno@xchange.co.jp', color: '#4a9e6a', abbr: 'SH', created_at: '2024-01-01T00:00:00Z' },
  { id: 'yama', name: '山田 涼太郎', email: 'yamada@xchange.co.jp', color: '#d4644a', abbr: 'YM', created_at: '2024-01-01T00:00:00Z' },
  { id: 'koya', name: '小山田 典寛', email: 'koyamada@xchange.co.jp', color: '#4a7ec4', abbr: 'KY', created_at: '2024-01-01T00:00:00Z' },
]

const SEED_CIRCLES: Circle[] = [
  { id: 'circle-ca', name: 'CA事業サークル', purpose: '候補者に最適なキャリア機会を提供し、CA事業を成長させる', parent_circle_id: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 'circle-ra', name: 'RA事業サークル', purpose: '法人クライアントの採用課題を解決し、RA事業を確立する', parent_circle_id: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 'circle-mgmt', name: '経営サークル', purpose: 'XCHANGE全体の方向性を定め、組織運営を持続可能にする', parent_circle_id: null, created_at: '2024-01-01T00:00:00Z' },
]

const SEED_ROLES: Role[] = [
  { id: 'role-head-ca', circle_id: 'circle-ca', name: 'ヘッドCA', purpose: 'CA事業全体の品質と成果を統括する', domain: 'CA事業の戦略・KPI設定', accountabilities: ['CA事業のKPI管理', 'メンバーへの案件配分', 'クライアントとの関係構築'], created_at: '2024-01-01T00:00:00Z' },
  { id: 'role-ca', circle_id: 'circle-ca', name: 'CA候補者担当', purpose: '候補者に寄り添い、最適なマッチングを実現する', domain: '担当候補者の対応', accountabilities: ['候補者との面談実施', '求人提案・応募サポート', '選考プロセスの管理'], created_at: '2024-01-01T00:00:00Z' },
  { id: 'role-screening', circle_id: 'circle-ca', name: '書類選考担当', purpose: '書類選考の品質と速度を担保する', domain: '書類選考プロセス', accountabilities: ['書類選考の実施', '選考基準の管理', '通過率の改善提案'], created_at: '2024-01-01T00:00:00Z' },
  { id: 'role-ra', circle_id: 'circle-ra', name: 'RA法人担当', purpose: '法人クライアントの採用成功にコミットする', domain: '法人クライアント対応', accountabilities: ['法人ヒアリング', '求人票作成・管理', '採用進捗の報告'], created_at: '2024-01-01T00:00:00Z' },
  { id: 'role-dev', circle_id: 'circle-ra', name: '新規開拓担当', purpose: '新たな法人クライアントを獲得する', domain: '新規法人の開拓活動', accountabilities: ['ターゲット企業リスト管理', '初回アプローチの実施', '契約締結までのフォロー'], created_at: '2024-01-01T00:00:00Z' },
  { id: 'role-lead', circle_id: 'circle-mgmt', name: '代表Lead Link', purpose: 'XCHANGE全体の方向性を定め、意思決定を行う', domain: '経営判断・組織設計', accountabilities: ['経営戦略の策定', 'ロールアサインの最終決定', '外部ステークホルダー対応'], created_at: '2024-01-01T00:00:00Z' },
  { id: 'role-sys', circle_id: 'circle-mgmt', name: 'システム構築担当', purpose: '業務システムの最適化と運用を行う', domain: 'システム・ツール管理', accountabilities: ['Zoho CRM設定・管理', 'ツール選定・導入', 'システム運用マニュアル作成'], created_at: '2024-01-01T00:00:00Z' },
]

const SEED_ROLE_ASSIGNMENTS: RoleAssignment[] = [
  { id: 'ra-1', role_id: 'role-head-ca', member_id: 'ikeo', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-2', role_id: 'role-ca', member_id: 'haya', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-3', role_id: 'role-ca', member_id: 'fuku', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-4', role_id: 'role-ca', member_id: 'shige', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-5', role_id: 'role-ca', member_id: 'yama', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-6', role_id: 'role-screening', member_id: 'haya', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-7', role_id: 'role-screening', member_id: 'fuku', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-8', role_id: 'role-ra', member_id: 'koya', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-9', role_id: 'role-dev', member_id: 'koya', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-10', role_id: 'role-lead', member_id: 'ikeo', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
  { id: 'ra-11', role_id: 'role-sys', member_id: 'ikeo', assigned_at: '2024-01-01T00:00:00Z', unassigned_at: null },
]

const SEED_TENSIONS: Tension[] = [
  { id: 't-1', title: '書類選考フローが属人的', description: '林さんと福山さんで選考基準が統一されていない。ガイドラインを作成し共有する必要がある。', type: 'tactical', status: 'unprocessed', author_id: 'ikeo', sprint_id: 'sprint-1', created_at: '2024-03-11T09:00:00Z' },
  { id: 't-2', title: 'Zoho登録漏れが頻発', description: '候補者情報のZoho登録が漏れるケースが増えている。入力チェックリストが必要。', type: 'tactical', status: 'unprocessed', author_id: 'haya', sprint_id: 'sprint-1', created_at: '2024-03-11T10:00:00Z' },
  { id: 't-3', title: 'RA専任ロールの定義が曖昧', description: '小山田さんのRA業務範囲が明確でない。Accountabilitiesを再定義する必要がある。', type: 'governance', status: 'unprocessed', author_id: 'koya', sprint_id: null, created_at: '2024-03-11T11:00:00Z' },
  { id: 't-4', title: '新人CA研修プロセスの標準化', description: '山田さんの入社を機に、CA研修プロセスを標準化すべき。', type: 'strategy', status: 'processing', author_id: 'ikeo', sprint_id: null, created_at: '2024-03-10T09:00:00Z' },
]

const SEED_SPRINTS: Sprint[] = [
  { id: 'sprint-1', name: 'CA架電強化スプリント', goal: '週次架電数150件超・書類通過率35%達成', start_date: '2024-03-11', end_date: '2024-03-17', status: 'active' },
]

const SEED_TASKS: Task[] = [
  { id: 'task-1', sprint_id: 'sprint-1', role_id: 'role-ca', assignee_id: 'haya', title: '新規候補者30名へ初回架電', status: 'in_progress', created_at: '2024-03-11T09:00:00Z' },
  { id: 'task-2', sprint_id: 'sprint-1', role_id: 'role-ca', assignee_id: 'fuku', title: '書類選考20件完了', status: 'todo', created_at: '2024-03-11T09:00:00Z' },
  { id: 'task-3', sprint_id: 'sprint-1', role_id: 'role-ca', assignee_id: 'shige', title: '候補者面談15件実施', status: 'in_progress', created_at: '2024-03-11T09:00:00Z' },
  { id: 'task-4', sprint_id: 'sprint-1', role_id: 'role-ca', assignee_id: 'yama', title: '架電リスト50名作成', status: 'done', created_at: '2024-03-11T09:00:00Z' },
  { id: 'task-5', sprint_id: 'sprint-1', role_id: 'role-ra', assignee_id: 'koya', title: '新規法人5社へアプローチ', status: 'in_progress', created_at: '2024-03-11T09:00:00Z' },
  { id: 'task-6', sprint_id: 'sprint-1', role_id: 'role-sys', assignee_id: 'ikeo', title: 'Zoho入力チェックリスト作成', status: 'todo', created_at: '2024-03-11T09:00:00Z' },
  { id: 'task-7', sprint_id: 'sprint-1', role_id: 'role-screening', assignee_id: 'haya', title: '書類選考基準ドキュメント作成', status: 'blocked', created_at: '2024-03-11T09:00:00Z' },
  { id: 'task-8', sprint_id: 'sprint-1', role_id: 'role-lead', assignee_id: 'ikeo', title: '週次KPIレビュー準備', status: 'todo', created_at: '2024-03-11T09:00:00Z' },
]

const SEED_GOVERNANCE_LOGS: GovernanceLog[] = []

const SEED_NEXT_ID = 100

// Live data arrays — loaded from localStorage or seed defaults

const members: Member[] = loadData<Member>(`${LS_PREFIX}members`, SEED_MEMBERS)
const circles: Circle[] = loadData<Circle>(`${LS_PREFIX}circles`, SEED_CIRCLES)
const roles: Role[] = loadData<Role>(`${LS_PREFIX}roles`, SEED_ROLES)
const roleAssignments: RoleAssignment[] = loadData<RoleAssignment>(`${LS_PREFIX}roleAssignments`, SEED_ROLE_ASSIGNMENTS)
const tensions: Tension[] = loadData<Tension>(`${LS_PREFIX}tensions`, SEED_TENSIONS)
const sprints: Sprint[] = loadData<Sprint>(`${LS_PREFIX}sprints`, SEED_SPRINTS)
const tasks: Task[] = loadData<Task>(`${LS_PREFIX}tasks`, SEED_TASKS)
const governanceLogs: GovernanceLog[] = loadData<GovernanceLog>(`${LS_PREFIX}governanceLogs`, SEED_GOVERNANCE_LOGS)

let nextId = loadNumber(`${LS_PREFIX}nextId`, SEED_NEXT_ID)

function genId() {
  const id = `gen-${++nextId}`
  saveNumber(`${LS_PREFIX}nextId`, nextId)
  return id
}

// Store API
export const store = {
  // Members
  getMembers: () => [...members],
  getMember: (id: string) => members.find(m => m.id === id),

  // Circles
  getCircles: () => [...circles],
  getCircle: (id: string) => circles.find(c => c.id === id),
  addCircle: (data: Omit<Circle, 'id' | 'created_at'>) => {
    const circle: Circle = { ...data, id: genId(), created_at: new Date().toISOString() }
    circles.push(circle)
    saveData(`${LS_PREFIX}circles`, circles)
    return circle
  },
  updateCircle: (id: string, data: Partial<Circle>) => {
    const idx = circles.findIndex(c => c.id === id)
    if (idx >= 0) circles[idx] = { ...circles[idx], ...data }
    saveData(`${LS_PREFIX}circles`, circles)
    return circles[idx]
  },
  deleteCircle: (id: string) => {
    const idx = circles.findIndex(c => c.id === id)
    if (idx >= 0) circles.splice(idx, 1)
    saveData(`${LS_PREFIX}circles`, circles)
  },

  // Roles
  getRoles: () => [...roles],
  getRolesByCircle: (circleId: string) => roles.filter(r => r.circle_id === circleId),
  getRole: (id: string) => roles.find(r => r.id === id),
  addRole: (data: Omit<Role, 'id' | 'created_at'>) => {
    const role: Role = { ...data, id: genId(), created_at: new Date().toISOString() }
    roles.push(role)
    saveData(`${LS_PREFIX}roles`, roles)
    return role
  },
  updateRole: (id: string, data: Partial<Role>) => {
    const idx = roles.findIndex(r => r.id === id)
    if (idx >= 0) {
      const before = { ...roles[idx] }
      roles[idx] = { ...roles[idx], ...data }
      governanceLogs.push({
        id: genId(),
        type: 'role_update',
        before_snapshot: before as unknown as Record<string, unknown>,
        after_snapshot: roles[idx] as unknown as Record<string, unknown>,
        changed_by: 'ikeo',
        changed_at: new Date().toISOString(),
      })
      saveData(`${LS_PREFIX}governanceLogs`, governanceLogs)
    }
    saveData(`${LS_PREFIX}roles`, roles)
    return roles[idx]
  },
  deleteRole: (id: string) => {
    const idx = roles.findIndex(r => r.id === id)
    if (idx >= 0) {
      governanceLogs.push({
        id: genId(),
        type: 'role_delete',
        before_snapshot: roles[idx] as unknown as Record<string, unknown>,
        after_snapshot: {},
        changed_by: 'ikeo',
        changed_at: new Date().toISOString(),
      })
      roles.splice(idx, 1)
      saveData(`${LS_PREFIX}governanceLogs`, governanceLogs)
    }
    saveData(`${LS_PREFIX}roles`, roles)
  },

  // Role Assignments
  getRoleAssignments: () => [...roleAssignments],
  getAssignmentsForRole: (roleId: string) => roleAssignments.filter(ra => ra.role_id === roleId && !ra.unassigned_at),
  getAssignmentsForMember: (memberId: string) => roleAssignments.filter(ra => ra.member_id === memberId && !ra.unassigned_at),
  assignRole: (roleId: string, memberId: string) => {
    const assignment: RoleAssignment = { id: genId(), role_id: roleId, member_id: memberId, assigned_at: new Date().toISOString(), unassigned_at: null }
    roleAssignments.push(assignment)
    saveData(`${LS_PREFIX}roleAssignments`, roleAssignments)
    return assignment
  },
  unassignRole: (roleId: string, memberId: string) => {
    const ra = roleAssignments.find(r => r.role_id === roleId && r.member_id === memberId && !r.unassigned_at)
    if (ra) ra.unassigned_at = new Date().toISOString()
    saveData(`${LS_PREFIX}roleAssignments`, roleAssignments)
  },

  // Tensions
  getTensions: () => [...tensions],
  getTensionsByType: (type: Tension['type']) => tensions.filter(t => t.type === type),
  getTensionsByStatus: (status: Tension['status']) => tensions.filter(t => t.status === status),
  addTension: (data: Omit<Tension, 'id' | 'created_at'>) => {
    const tension: Tension = { ...data, id: genId(), created_at: new Date().toISOString() }
    tensions.push(tension)
    saveData(`${LS_PREFIX}tensions`, tensions)
    return tension
  },
  updateTension: (id: string, data: Partial<Tension>) => {
    const idx = tensions.findIndex(t => t.id === id)
    if (idx >= 0) tensions[idx] = { ...tensions[idx], ...data }
    saveData(`${LS_PREFIX}tensions`, tensions)
    return tensions[idx]
  },

  // Sprints
  getSprints: () => [...sprints],
  getActiveSprint: () => sprints.find(s => s.status === 'active'),
  addSprint: (data: Omit<Sprint, 'id'>) => {
    const sprint: Sprint = { ...data, id: genId() }
    sprints.push(sprint)
    saveData(`${LS_PREFIX}sprints`, sprints)
    return sprint
  },
  updateSprint: (id: string, data: Partial<Sprint>) => {
    const idx = sprints.findIndex(s => s.id === id)
    if (idx >= 0) sprints[idx] = { ...sprints[idx], ...data }
    saveData(`${LS_PREFIX}sprints`, sprints)
    return sprints[idx]
  },

  // Tasks
  getTasks: () => [...tasks],
  getTasksBySprint: (sprintId: string) => tasks.filter(t => t.sprint_id === sprintId),
  getTasksByAssignee: (assigneeId: string) => tasks.filter(t => t.assignee_id === assigneeId),
  addTask: (data: Omit<Task, 'id' | 'created_at'>) => {
    const task: Task = { ...data, id: genId(), created_at: new Date().toISOString() }
    tasks.push(task)
    saveData(`${LS_PREFIX}tasks`, tasks)
    return task
  },
  updateTask: (id: string, data: Partial<Task>) => {
    const idx = tasks.findIndex(t => t.id === id)
    if (idx >= 0) tasks[idx] = { ...tasks[idx], ...data }
    saveData(`${LS_PREFIX}tasks`, tasks)
    return tasks[idx]
  },
  deleteTask: (id: string) => {
    const idx = tasks.findIndex(t => t.id === id)
    if (idx >= 0) tasks.splice(idx, 1)
    saveData(`${LS_PREFIX}tasks`, tasks)
  },

  // Governance Logs
  getGovernanceLogs: () => [...governanceLogs],
  addGovernanceLog: (data: Omit<GovernanceLog, 'id'>) => {
    const log: GovernanceLog = { ...data, id: genId() }
    governanceLogs.push(log)
    saveData(`${LS_PREFIX}governanceLogs`, governanceLogs)
    return log
  },

  // Reset all data to seed defaults and clear localStorage
  resetToDefaults: () => {
    members.length = 0
    members.push(...SEED_MEMBERS)
    circles.length = 0
    circles.push(...SEED_CIRCLES)
    roles.length = 0
    roles.push(...SEED_ROLES)
    roleAssignments.length = 0
    roleAssignments.push(...SEED_ROLE_ASSIGNMENTS)
    tensions.length = 0
    tensions.push(...SEED_TENSIONS)
    sprints.length = 0
    sprints.push(...SEED_SPRINTS)
    tasks.length = 0
    tasks.push(...SEED_TASKS)
    governanceLogs.length = 0
    governanceLogs.push(...SEED_GOVERNANCE_LOGS)
    nextId = SEED_NEXT_ID

    if (typeof window !== 'undefined') {
      const keys = [
        `${LS_PREFIX}members`,
        `${LS_PREFIX}circles`,
        `${LS_PREFIX}roles`,
        `${LS_PREFIX}roleAssignments`,
        `${LS_PREFIX}tensions`,
        `${LS_PREFIX}sprints`,
        `${LS_PREFIX}tasks`,
        `${LS_PREFIX}governanceLogs`,
        `${LS_PREFIX}nextId`,
      ]
      for (const key of keys) {
        localStorage.removeItem(key)
      }
    }
  },
}
