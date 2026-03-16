"use client"

import { useState } from 'react'
import { store } from '@/lib/store'
import type { Role, Circle } from '@/lib/database.types'

const ACCENT_COLORS = ['#7b5ea7', '#3d9e8c', '#c49a3c', '#4a9e6a', '#d4644a', '#4a7ec4']

export default function CirclesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showAddCircle, setShowAddCircle] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)
  const [addRoleCircleId, setAddRoleCircleId] = useState('')

  // Add Circle form
  const [circleName, setCircleName] = useState('')
  const [circlePurpose, setCirclePurpose] = useState('')
  const [circleParent, setCircleParent] = useState('')

  // Add Role form
  const [roleName, setRoleName] = useState('')
  const [rolePurpose, setRolePurpose] = useState('')
  const [roleDomain, setRoleDomain] = useState('')
  const [roleAccountabilities, setRoleAccountabilities] = useState('')
  const [roleCircleId, setRoleCircleId] = useState('')

  // Role edit mode
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPurpose, setEditPurpose] = useState('')
  const [editDomain, setEditDomain] = useState('')
  const [editAccountabilities, setEditAccountabilities] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Assign member state
  const [assignMemberId, setAssignMemberId] = useState('')

  // Circle edit/delete state
  const [editCircle, setEditCircle] = useState<Circle | null>(null)
  const [editCircleName, setEditCircleName] = useState('')
  const [editCirclePurpose, setEditCirclePurpose] = useState('')
  const [editCircleParent, setEditCircleParent] = useState('')
  const [confirmDeleteCircle, setConfirmDeleteCircle] = useState<string | null>(null)
  const [circleMenuOpen, setCircleMenuOpen] = useState<string | null>(null)

  // Force re-render
  const [, setTick] = useState(0)
  const forceUpdate = () => setTick(t => t + 1)

  const circles = store.getCircles()
  const allMembers = store.getMembers()

  const handleAddCircle = () => {
    if (!circleName.trim()) return
    store.addCircle({
      name: circleName.trim(),
      purpose: circlePurpose.trim(),
      parent_circle_id: circleParent || null,
    })
    setCircleName('')
    setCirclePurpose('')
    setCircleParent('')
    setShowAddCircle(false)
    forceUpdate()
  }

  const handleAddRole = () => {
    if (!roleName.trim() || !roleCircleId) return
    store.addRole({
      name: roleName.trim(),
      purpose: rolePurpose.trim(),
      domain: roleDomain.trim(),
      accountabilities: roleAccountabilities
        .split('\n')
        .map(a => a.trim())
        .filter(Boolean),
      circle_id: roleCircleId,
    })
    setRoleName('')
    setRolePurpose('')
    setRoleDomain('')
    setRoleAccountabilities('')
    setRoleCircleId('')
    setShowAddRole(false)
    forceUpdate()
  }

  const openEditCircle = (circle: Circle) => {
    setEditCircleName(circle.name)
    setEditCirclePurpose(circle.purpose)
    setEditCircleParent(circle.parent_circle_id || '')
    setEditCircle(circle)
    setCircleMenuOpen(null)
  }

  const handleSaveCircle = () => {
    if (!editCircle || !editCircleName.trim()) return
    store.updateCircle(editCircle.id, {
      name: editCircleName.trim(),
      purpose: editCirclePurpose.trim(),
      parent_circle_id: editCircleParent || null,
    })
    setEditCircle(null)
    forceUpdate()
  }

  const handleDeleteCircle = (circleId: string) => {
    store.deleteCircle(circleId)
    setConfirmDeleteCircle(null)
    forceUpdate()
  }

  const openAddRoleForCircle = (circleId: string) => {
    setRoleCircleId(circleId)
    setAddRoleCircleId(circleId)
    setShowAddRole(true)
  }

  const handleAssign = (roleId: string) => {
    if (!assignMemberId) return
    store.assignRole(roleId, assignMemberId)
    setAssignMemberId('')
    setSelectedRole(store.getRole(roleId) || null)
    forceUpdate()
  }

  const handleUnassign = (roleId: string, memberId: string) => {
    store.unassignRole(roleId, memberId)
    setSelectedRole(store.getRole(roleId) || null)
    forceUpdate()
  }

  const enterEditMode = () => {
    if (!selectedRole) return
    setEditName(selectedRole.name)
    setEditPurpose(selectedRole.purpose)
    setEditDomain(selectedRole.domain)
    setEditAccountabilities(selectedRole.accountabilities.join('\n'))
    setEditMode(true)
    setConfirmDelete(false)
  }

  const cancelEditMode = () => {
    setEditMode(false)
    setConfirmDelete(false)
  }

  const handleSaveRole = () => {
    if (!selectedRole || !editName.trim()) return
    const data = {
      name: editName.trim(),
      purpose: editPurpose.trim(),
      domain: editDomain.trim(),
      accountabilities: editAccountabilities
        .split('\n')
        .map(a => a.trim())
        .filter(Boolean),
    }
    store.updateRole(selectedRole.id, data)
    const updated = store.getRole(selectedRole.id) || null
    setSelectedRole(updated)
    setEditMode(false)
    forceUpdate()
  }

  const handleDeleteRole = () => {
    if (!selectedRole) return
    store.deleteRole(selectedRole.id)
    setSelectedRole(null)
    setEditMode(false)
    setConfirmDelete(false)
    forceUpdate()
  }

  const closeRoleModal = () => {
    setSelectedRole(null)
    setEditMode(false)
    setConfirmDelete(false)
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#0f0f11' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">サークル・ロール管理</h1>
        <button
          onClick={() => setShowAddCircle(true)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: '#7b5ea7' }}
        >
          サークル追加
        </button>
      </div>

      {/* Circle Cards */}
      <div className="space-y-6">
        {circles.map((circle, ci) => {
          const circleRoles = store.getRolesByCircle(circle.id)
          const accentColor = ACCENT_COLORS[ci % ACCENT_COLORS.length]

          return (
            <div
              key={circle.id}
              className="rounded-xl p-5"
              style={{
                backgroundColor: '#1a1a1f',
                borderLeft: `4px solid ${accentColor}`,
                border: `1px solid #2a2a32`,
                borderLeftWidth: '4px',
                borderLeftColor: accentColor,
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{circle.name}</h2>
                  <p className="text-sm mt-1" style={{ color: '#9a9aaa' }}>
                    {circle.purpose}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAddRoleForCircle(circle.id)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#7b5ea7', color: '#ffffff' }}
                  >
                    ロール追加
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setCircleMenuOpen(circleMenuOpen === circle.id ? null : circle.id)}
                      className="px-2 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-90"
                      style={{ backgroundColor: '#22222a', color: '#9a9aaa', border: '1px solid #2a2a32' }}
                    >
                      &#x2026;
                    </button>
                    {circleMenuOpen === circle.id && (
                      <div
                        className="absolute right-0 top-full mt-1 rounded-lg py-1 z-20 min-w-[140px]"
                        style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                      >
                        <button
                          onClick={() => openEditCircle(circle)}
                          className="w-full text-left px-4 py-2 text-sm transition-colors hover:brightness-125"
                          style={{ color: '#d0d0dd' }}
                        >
                          サークルを編集
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteCircle(circle.id); setCircleMenuOpen(null) }}
                          className="w-full text-left px-4 py-2 text-sm transition-colors hover:brightness-125"
                          style={{ color: '#d4644a' }}
                        >
                          サークルを削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Roles within this circle */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {circleRoles.map(role => {
                  const assignments = store.getAssignmentsForRole(role.id)
                  const hasNoAssignments = assignments.length === 0

                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className="rounded-lg p-4 cursor-pointer transition-colors hover:brightness-110"
                      style={{
                        backgroundColor: '#22222a',
                        border: hasNoAssignments
                          ? '1px solid #d4644a'
                          : '1px solid #2a2a32',
                      }}
                    >
                      <h3 className="text-sm font-semibold text-white mb-1">
                        {role.name}
                      </h3>
                      <p
                        className="text-xs mb-2 line-clamp-2"
                        style={{ color: '#8a8a9a' }}
                      >
                        {role.purpose}
                      </p>
                      {role.domain && (
                        <p className="text-xs mb-2" style={{ color: '#6a6a7a' }}>
                          Domain: {role.domain}
                        </p>
                      )}

                      {/* Accountabilities */}
                      {role.accountabilities.length > 0 && (
                        <ul className="mb-3 space-y-0.5">
                          {role.accountabilities.map((a, i) => (
                            <li
                              key={i}
                              className="text-xs"
                              style={{ color: '#7a7a8a' }}
                            >
                              - {a}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Assigned Members */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {assignments.length > 0 ? (
                          assignments.map(a => {
                            const member = store.getMember(a.member_id)
                            if (!member) return null
                            return (
                              <div
                                key={a.id}
                                title={member.name}
                                className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
                                style={{
                                  width: 28,
                                  height: 28,
                                  fontSize: 10,
                                  backgroundColor: member.color,
                                }}
                              >
                                {member.abbr}
                              </div>
                            )
                          })
                        ) : (
                          <div
                            className="flex items-center justify-center rounded-full shrink-0"
                            style={{
                              width: 28,
                              height: 28,
                              border: '2px solid #d4644a',
                            }}
                          >
                            <span className="text-xs" style={{ color: '#d4644a' }}>
                              --
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Role Detail Modal */}
      {selectedRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={closeRoleModal}
        >
          <div
            className="w-full max-w-lg rounded-xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editMode ? 'ロールを編集' : selectedRole.name}
              </h2>
              <button
                onClick={closeRoleModal}
                className="text-sm px-2 py-1 rounded"
                style={{ color: '#9a9aaa' }}
              >
                ✕
              </button>
            </div>

            {editMode ? (
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                    ロール名
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                    style={{
                      backgroundColor: '#22222a',
                      border: '1px solid #2a2a32',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                    Purpose
                  </label>
                  <input
                    type="text"
                    value={editPurpose}
                    onChange={e => setEditPurpose(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                    style={{
                      backgroundColor: '#22222a',
                      border: '1px solid #2a2a32',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                    Domain
                  </label>
                  <input
                    type="text"
                    value={editDomain}
                    onChange={e => setEditDomain(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                    style={{
                      backgroundColor: '#22222a',
                      border: '1px solid #2a2a32',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                    Accountabilities（1行に1つ）
                  </label>
                  <textarea
                    value={editAccountabilities}
                    onChange={e => setEditAccountabilities(e.target.value)}
                    rows={4}
                    className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none resize-none"
                    style={{
                      backgroundColor: '#22222a',
                      border: '1px solid #2a2a32',
                    }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={cancelEditMode}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveRole}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#7b5ea7' }}
                  >
                    保存
                  </button>
                </div>

                {/* Delete Role */}
                <div className="pt-3" style={{ borderTop: '1px solid #2a2a32' }}>
                  {confirmDelete ? (
                    <div className="space-y-2">
                      <p className="text-xs" style={{ color: '#d4644a' }}>
                        本当にこのロールを削除しますか？この操作は取り消せません。
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteRole}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                          style={{ backgroundColor: '#d4644a' }}
                        >
                          削除する
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="px-4 py-2 rounded-lg text-sm"
                          style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
                        >
                          やめる
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                      style={{ border: '1px solid #d4644a', color: '#d4644a' }}
                    >
                      ロールを削除
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <div className="space-y-3 mb-5">
              <div>
                <span className="text-xs font-medium" style={{ color: '#7b5ea7' }}>
                  Purpose
                </span>
                <p className="text-sm text-white mt-0.5">{selectedRole.purpose}</p>
              </div>
              <div>
                <span className="text-xs font-medium" style={{ color: '#7b5ea7' }}>
                  Domain
                </span>
                <p className="text-sm text-white mt-0.5">{selectedRole.domain}</p>
              </div>
              <div>
                <span className="text-xs font-medium" style={{ color: '#7b5ea7' }}>
                  Accountabilities
                </span>
                <ul className="mt-1 space-y-1">
                  {selectedRole.accountabilities.map((a, i) => (
                    <li key={i} className="text-sm text-white">
                      - {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            )}

            {!editMode && (
            <>
            {/* Current Assigned Members */}
            <div className="mb-4">
              <span className="text-xs font-medium" style={{ color: '#7b5ea7' }}>
                Assigned Members
              </span>
              <div className="mt-2 space-y-2">
                {store.getAssignmentsForRole(selectedRole.id).map(a => {
                  const member = store.getMember(a.member_id)
                  if (!member) return null
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ backgroundColor: '#22222a' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
                          style={{
                            width: 28,
                            height: 28,
                            fontSize: 10,
                            backgroundColor: member.color,
                          }}
                        >
                          {member.abbr}
                        </div>
                        <span className="text-sm text-white">{member.name}</span>
                      </div>
                      <button
                        onClick={() => handleUnassign(selectedRole.id, member.id)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: '#d4644a', border: '1px solid #d4644a' }}
                      >
                        解除
                      </button>
                    </div>
                  )
                })}
                {store.getAssignmentsForRole(selectedRole.id).length === 0 && (
                  <p className="text-xs" style={{ color: '#6a6a7a' }}>
                    アサインされたメンバーはいません
                  </p>
                )}
              </div>
            </div>

            {/* Assign Member */}
            <div className="flex items-center gap-2 mb-4">
              <select
                value={assignMemberId}
                onChange={e => setAssignMemberId(e.target.value)}
                className="flex-1 text-sm rounded-lg px-3 py-2 text-white outline-none"
                style={{
                  backgroundColor: '#22222a',
                  border: '1px solid #2a2a32',
                }}
              >
                <option value="">メンバーを選択...</option>
                {allMembers
                  .filter(
                    m =>
                      !store
                        .getAssignmentsForRole(selectedRole.id)
                        .some(a => a.member_id === m.id)
                  )
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => handleAssign(selectedRole.id)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#7b5ea7' }}
              >
                アサイン
              </button>
            </div>

            {/* Edit Role Button */}
            <button
              onClick={enterEditMode}
              className="w-full py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
              style={{ border: '1px solid #7b5ea7', color: '#7b5ea7' }}
            >
              ロールを編集
            </button>
            </>
            )}
          </div>
        </div>
      )}

      {/* Add Circle Modal */}
      {showAddCircle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowAddCircle(false)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">サークル追加</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  サークル名
                </label>
                <input
                  type="text"
                  value={circleName}
                  onChange={e => setCircleName(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder="例: プロダクトサークル"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  Purpose
                </label>
                <input
                  type="text"
                  value={circlePurpose}
                  onChange={e => setCirclePurpose(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder="このサークルの目的"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  親サークル
                </label>
                <select
                  value={circleParent}
                  onChange={e => setCircleParent(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                >
                  <option value="">なし（トップレベル）</option>
                  {circles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAddCircle(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddCircle}
                disabled={!circleName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7b5ea7' }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Circle Modal */}
      {editCircle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setEditCircle(null)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">サークルを編集</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  サークル名
                </label>
                <input
                  type="text"
                  value={editCircleName}
                  onChange={e => setEditCircleName(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder="例: プロダクトサークル"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  Purpose
                </label>
                <input
                  type="text"
                  value={editCirclePurpose}
                  onChange={e => setEditCirclePurpose(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder="このサークルの目的"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  親サークル
                </label>
                <select
                  value={editCircleParent}
                  onChange={e => setEditCircleParent(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                >
                  <option value="">なし（トップレベル）</option>
                  {circles
                    .filter(c => c.id !== editCircle.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditCircle(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveCircle}
                disabled={!editCircleName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7b5ea7' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Circle Confirmation Dialog */}
      {confirmDeleteCircle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setConfirmDeleteCircle(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-3">サークルを削除</h2>
            <p className="text-sm mb-2" style={{ color: '#d0d0dd' }}>
              本当にこのサークルを削除しますか？
            </p>
            <p className="text-xs mb-5" style={{ color: '#d4644a' }}>
              ⚠ このサークル内のすべてのロールは所属先を失います。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteCircle(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
              >
                やめる
              </button>
              <button
                onClick={() => handleDeleteCircle(confirmDeleteCircle)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#d4644a' }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowAddRole(false)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">ロール追加</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  ロール名
                </label>
                <input
                  type="text"
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder="例: マーケティング担当"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  Purpose
                </label>
                <input
                  type="text"
                  value={rolePurpose}
                  onChange={e => setRolePurpose(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder="このロールの目的"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  Domain
                </label>
                <input
                  type="text"
                  value={roleDomain}
                  onChange={e => setRoleDomain(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder="管轄領域"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  Accountabilities（1行に1つ）
                </label>
                <textarea
                  value={roleAccountabilities}
                  onChange={e => setRoleAccountabilities(e.target.value)}
                  rows={4}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none resize-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                  placeholder={"責務1\n責務2\n責務3"}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  サークル
                </label>
                <select
                  value={roleCircleId}
                  onChange={e => setRoleCircleId(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{
                    backgroundColor: '#22222a',
                    border: '1px solid #2a2a32',
                  }}
                >
                  <option value="">サークルを選択...</option>
                  {circles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAddRole(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddRole}
                disabled={!roleName.trim() || !roleCircleId}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7b5ea7' }}
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
