"use client"

import { useState } from 'react'
import { store } from '@/lib/store'
import type { Member } from '@/lib/database.types'

const COLOR_PRESETS = ['#7b5ea7', '#3d9e8c', '#c49a3c', '#4a9e6a', '#d4644a', '#4a7ec4', '#8b5e8c', '#5a8e9e']

export default function MembersPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // Add form state
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addAbbr, setAddAbbr] = useState('')
  const [addColor, setAddColor] = useState(COLOR_PRESETS[0])

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAbbr, setEditAbbr] = useState('')
  const [editColor, setEditColor] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Force re-render
  const [, setTick] = useState(0)
  const forceUpdate = () => setTick(t => t + 1)

  const members = store.getMembers()

  const handleAdd = () => {
    if (!addName.trim() || !addAbbr.trim()) return
    store.addMember({
      name: addName.trim(),
      email: addEmail.trim(),
      abbr: addAbbr.trim().slice(0, 2).toUpperCase(),
      color: addColor,
    })
    setAddName('')
    setAddEmail('')
    setAddAbbr('')
    setAddColor(COLOR_PRESETS[0])
    setShowAddModal(false)
    forceUpdate()
  }

  const openDetail = (member: Member) => {
    setEditName(member.name)
    setEditEmail(member.email)
    setEditAbbr(member.abbr)
    setEditColor(member.color)
    setConfirmDelete(false)
    setSelectedMember(member)
  }

  const handleSave = () => {
    if (!selectedMember || !editName.trim() || !editAbbr.trim()) return
    store.updateMember(selectedMember.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      abbr: editAbbr.trim().slice(0, 2).toUpperCase(),
      color: editColor,
    })
    setSelectedMember(null)
    forceUpdate()
  }

  const handleDelete = () => {
    if (!selectedMember) return
    store.deleteMember(selectedMember.id)
    setSelectedMember(null)
    setConfirmDelete(false)
    forceUpdate()
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    setAddName('')
    setAddEmail('')
    setAddAbbr('')
    setAddColor(COLOR_PRESETS[0])
  }

  const closeDetailModal = () => {
    setSelectedMember(null)
    setConfirmDelete(false)
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#0f0f11' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">メンバー管理</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: '#7b5ea7' }}
        >
          メンバー追加
        </button>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => {
          const assignments = store.getAssignmentsForMember(member.id)
          return (
            <div
              key={member.id}
              onClick={() => openDetail(member)}
              className="rounded-xl p-5 cursor-pointer transition-colors hover:brightness-110"
              style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            >
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: 14,
                    backgroundColor: member.color,
                  }}
                >
                  {member.abbr}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{member.name}</h3>
                  <p className="text-xs truncate" style={{ color: '#9a9aaa' }}>{member.email}</p>
                </div>
              </div>

              {/* Role assignments */}
              {assignments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {assignments.map(a => {
                    const role = store.getRole(a.role_id)
                    if (!role) return null
                    return (
                      <span
                        key={a.id}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#22222a', color: '#9a9aaa', border: '1px solid #2a2a32' }}
                      >
                        {role.name}
                      </span>
                    )
                  })}
                </div>
              )}
              {assignments.length === 0 && (
                <p className="text-xs mt-2" style={{ color: '#6a6a7a' }}>
                  ロール未割当
                </p>
              )}
            </div>
          )
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: '#6a6a7a' }}>メンバーがいません</p>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={closeAddModal}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">メンバー追加</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  名前
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                  placeholder="例: 山田 太郎"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                  placeholder="例: yamada@xchange.co.jp"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  略称（2文字）
                </label>
                <input
                  type="text"
                  value={addAbbr}
                  onChange={e => setAddAbbr(e.target.value.slice(0, 2))}
                  maxLength={2}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                  placeholder="例: YT"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  カラー
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      onClick={() => setAddColor(color)}
                      className="rounded-full shrink-0 transition-transform"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: color,
                        border: addColor === color ? '3px solid #ffffff' : '3px solid transparent',
                        transform: addColor === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeAddModal}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={!addName.trim() || !addAbbr.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7b5ea7' }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail / Edit Modal */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={closeDetailModal}
        >
          <div
            className="w-full max-w-lg rounded-xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
                  style={{
                    width: 48,
                    height: 48,
                    fontSize: 16,
                    backgroundColor: editColor,
                  }}
                >
                  {editAbbr || selectedMember.abbr}
                </div>
                <h2 className="text-lg font-bold text-white">{selectedMember.name}</h2>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-sm px-2 py-1 rounded"
                style={{ color: '#9a9aaa' }}
              >
                ✕
              </button>
            </div>

            {/* Edit Form */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  名前
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  略称（2文字）
                </label>
                <input
                  type="text"
                  value={editAbbr}
                  onChange={e => setEditAbbr(e.target.value.slice(0, 2))}
                  maxLength={2}
                  className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#9a9aaa' }}>
                  カラー
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className="rounded-full shrink-0 transition-transform"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: color,
                        border: editColor === color ? '3px solid #ffffff' : '3px solid transparent',
                        transform: editColor === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Role Assignments */}
            <div className="mb-5">
              <span className="text-xs font-medium" style={{ color: '#7b5ea7' }}>
                割り当てられたロール
              </span>
              <div className="mt-2 space-y-2">
                {store.getAssignmentsForMember(selectedMember.id).map(a => {
                  const role = store.getRole(a.role_id)
                  if (!role) return null
                  const circle = store.getCircle(role.circle_id)
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ backgroundColor: '#22222a' }}
                    >
                      <div>
                        <span className="text-sm text-white">{role.name}</span>
                        {circle && (
                          <span className="text-xs ml-2" style={{ color: '#6a6a7a' }}>
                            ({circle.name})
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {store.getAssignmentsForMember(selectedMember.id).length === 0 && (
                  <p className="text-xs" style={{ color: '#6a6a7a' }}>
                    割り当てられたロールはありません
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#9a9aaa', border: '1px solid #2a2a32' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!editName.trim() || !editAbbr.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7b5ea7' }}
              >
                保存
              </button>
            </div>

            {/* Delete */}
            <div className="pt-3" style={{ borderTop: '1px solid #2a2a32' }}>
              {confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: '#d4644a' }}>
                    本当にこのメンバーを削除しますか？この操作は取り消せません。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
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
                  メンバーを削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
