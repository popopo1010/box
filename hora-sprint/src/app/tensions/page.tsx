"use client"

import { useState, useMemo } from 'react'
import { store } from '@/lib/store'
import type { Tension } from '@/lib/database.types'

const typeLabels: Record<Tension['type'], string> = {
  governance: 'ガバナンス',
  tactical: 'タクティカル',
  strategy: '戦略',
}

const typeColors: Record<Tension['type'], string> = {
  governance: '#7b5ea7',
  tactical: '#3d9e8c',
  strategy: '#c49a3c',
}

const statusLabels: Record<Tension['status'], string> = {
  unprocessed: '未処理',
  processing: '処理中',
  resolved: '解決済み',
}

const statusColors: Record<Tension['status'], string> = {
  unprocessed: '#8a8694',
  processing: '#4a7ec4',
  resolved: '#4a9e6a',
}

type TypeFilter = 'all' | Tension['type']
type StatusFilter = 'all' | Tension['status']

export default function TensionsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const [tensions, setTensions] = useState(() => store.getTensions())
  const members = useMemo(() => store.getMembers(), [])
  const sprints = useMemo(() => store.getSprints(), [])

  // Form state (create modal)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState<Tension['type']>('tactical')
  const [formAuthorId, setFormAuthorId] = useState(members[0]?.id ?? '')
  const [formSprintId, setFormSprintId] = useState<string>('')

  // Detail/edit modal state
  const [selectedTension, setSelectedTension] = useState<Tension | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<Tension['type']>('tactical')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filtered = useMemo(() => {
    return tensions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      return true
    })
  }, [tensions, typeFilter, statusFilter])

  // Stats
  const totalCount = tensions.length
  const unprocessedCount = tensions.filter(t => t.status === 'unprocessed').length
  const governanceCount = tensions.filter(t => t.type === 'governance').length
  const tacticalCount = tensions.filter(t => t.type === 'tactical').length
  const strategyCount = tensions.filter(t => t.type === 'strategy').length

  function handleAddTension() {
    if (!formTitle.trim()) return
    store.addTension({
      title: formTitle.trim(),
      description: formDescription.trim(),
      type: formType,
      status: 'unprocessed',
      author_id: formAuthorId,
      sprint_id: formType === 'tactical' && formSprintId ? formSprintId : null,
    })
    setTensions(store.getTensions())
    setFormTitle('')
    setFormDescription('')
    setFormType('tactical')
    setFormAuthorId(members[0]?.id ?? '')
    setFormSprintId('')
    setShowModal(false)
  }

  function handleStatusChange(id: string, newStatus: Tension['status']) {
    store.updateTension(id, { status: newStatus })
    setTensions(store.getTensions())
    // If the detail modal is open for this tension, update it
    if (selectedTension && selectedTension.id === id) {
      setSelectedTension({ ...selectedTension, status: newStatus })
    }
  }

  function openDetailModal(tension: Tension) {
    setSelectedTension(tension)
    setEditTitle(tension.title)
    setEditDescription(tension.description)
    setEditType(tension.type)
    setConfirmDelete(false)
  }

  function closeDetailModal() {
    setSelectedTension(null)
    setConfirmDelete(false)
  }

  function handleSaveEdit() {
    if (!selectedTension || !editTitle.trim()) return
    store.updateTension(selectedTension.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      type: editType,
    })
    setTensions(store.getTensions())
    closeDetailModal()
  }

  function handleDeleteTension() {
    if (!selectedTension) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    store.deleteTension(selectedTension.id)
    setTensions(store.getTensions())
    closeDetailModal()
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const typeFilterTabs: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'governance', label: 'ガバナンス' },
    { key: 'tactical', label: 'タクティカル' },
    { key: 'strategy', label: '戦略' },
  ]

  const statusFilterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'unprocessed', label: '未処理' },
    { key: 'processing', label: '処理中' },
    { key: 'resolved', label: '解決済み' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f11' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">テンション管理</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#7b5ea7' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            テンション起票
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="rounded-lg p-4" style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}>
            <div className="text-xs text-gray-400 mb-1">合計</div>
            <div className="text-2xl font-bold text-white">{totalCount}</div>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: '#1a1a1f', border: '2px solid #c49a3c' }}>
            <div className="text-xs text-gray-400 mb-1">未処理</div>
            <div className="text-2xl font-bold" style={{ color: '#c49a3c' }}>{unprocessedCount}</div>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}>
            <div className="text-xs mb-1" style={{ color: '#7b5ea7' }}>ガバナンス</div>
            <div className="text-2xl font-bold text-white">{governanceCount}</div>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}>
            <div className="text-xs mb-1" style={{ color: '#3d9e8c' }}>タクティカル</div>
            <div className="text-2xl font-bold text-white">{tacticalCount}</div>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}>
            <div className="text-xs mb-1" style={{ color: '#c49a3c' }}>戦略</div>
            <div className="text-2xl font-bold text-white">{strategyCount}</div>
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 mb-4">
          {typeFilterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: typeFilter === tab.key ? '#2a2a32' : 'transparent',
                color: typeFilter === tab.key ? '#ffffff' : '#8a8694',
                border: typeFilter === tab.key ? '1px solid #3a3a44' : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6">
          {statusFilterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: statusFilter === tab.key ? '#2a2a32' : 'transparent',
                color: statusFilter === tab.key ? '#ffffff' : '#8a8694',
                border: statusFilter === tab.key ? '1px solid #3a3a44' : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tension list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              該当するテンションがありません
            </div>
          )}
          {filtered.map(tension => {
            const author = store.getMember(tension.author_id)
            return (
              <div
                key={tension.id}
                className="rounded-lg p-5 cursor-pointer transition-colors"
                style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
                onClick={() => openDetailModal(tension)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#3a3a44')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a32')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title row with badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-base font-semibold text-white">{tension.title}</h3>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: typeColors[tension.type] }}
                      >
                        {typeLabels[tension.type]}
                      </span>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: statusColors[tension.status] }}
                      >
                        {statusLabels[tension.status]}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-400 mb-3 leading-relaxed">
                      {tension.description}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {author && (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: author.color }}
                          >
                            {author.abbr}
                          </span>
                          <span>{author.name}</span>
                        </span>
                      )}
                      <span>{formatDate(tension.created_at)}</span>
                    </div>
                  </div>

                  {/* Status change buttons */}
                  <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {(['unprocessed', 'processing', 'resolved'] as Tension['status'][]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(tension.id, s)}
                        disabled={tension.status === s}
                        className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30"
                        style={{
                          backgroundColor: tension.status === s ? statusColors[s] : '#2a2a32',
                          color: tension.status === s ? '#ffffff' : '#8a8694',
                        }}
                      >
                        {statusLabels[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Tension Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          {/* Modal content */}
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl p-6"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
          >
            <h2 className="text-lg font-bold text-white mb-5">テンション起票</h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">タイトル</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1"
                  style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32', '--tw-ring-color': '#7b5ea7' } as React.CSSProperties}
                  placeholder="テンションのタイトルを入力"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">詳細</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none focus:ring-1"
                  style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32', '--tw-ring-color': '#7b5ea7' } as React.CSSProperties}
                  placeholder="テンションの詳細を入力"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">タイプ</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as Tension['type'])}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32' }}
                >
                  <option value="governance">ガバナンス</option>
                  <option value="tactical">タクティカル</option>
                  <option value="strategy">戦略</option>
                </select>
              </div>

              {/* Author */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">起票者</label>
                <select
                  value={formAuthorId}
                  onChange={e => setFormAuthorId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32' }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Sprint (only for tactical) */}
              {formType === 'tactical' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">スプリント（任意）</label>
                  <select
                    value={formSprintId}
                    onChange={e => setFormSprintId(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ backgroundColor: '#0f0f11', border: '1px solid #2a2a32' }}
                  >
                    <option value="">なし</option>
                    {sprints.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 transition-colors"
                style={{ backgroundColor: '#2a2a32' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddTension}
                disabled={!formTitle.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7b5ea7' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                起票する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail/Edit Tension Modal */}
      {selectedTension && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeDetailModal}
          />
          {/* Modal content */}
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
          >
            <h2 className="text-lg font-bold text-white mb-5">テンション詳細</h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">タイトル</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32', '--tw-ring-color': '#7b5ea7' } as React.CSSProperties}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">詳細</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none focus:ring-1"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32', '--tw-ring-color': '#7b5ea7' } as React.CSSProperties}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">タイプ</label>
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value as Tension['type'])}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ backgroundColor: '#22222a', border: '1px solid #2a2a32' }}
                >
                  <option value="governance">ガバナンス</option>
                  <option value="tactical">タクティカル</option>
                  <option value="strategy">戦略</option>
                </select>
              </div>

              {/* Status display + change buttons */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">ステータス</label>
                <div className="flex gap-2">
                  {(['unprocessed', 'processing', 'resolved'] as Tension['status'][]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selectedTension.id, s)}
                      disabled={selectedTension.status === s}
                      className="px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-40"
                      style={{
                        backgroundColor: selectedTension.status === s ? statusColors[s] : '#2a2a32',
                        color: selectedTension.status === s ? '#ffffff' : '#8a8694',
                      }}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2" style={{ borderTop: '1px solid #2a2a32' }}>
                {(() => {
                  const author = store.getMember(selectedTension.author_id)
                  return author ? (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: author.color }}
                      >
                        {author.abbr}
                      </span>
                      <span>{author.name}</span>
                    </span>
                  ) : null
                })()}
                <span>{formatDate(selectedTension.created_at)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid #2a2a32' }}>
              {/* Delete button (two-step) */}
              <button
                onClick={handleDeleteTension}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: confirmDelete ? '#d4644a' : '#2a2a32',
                  color: confirmDelete ? '#ffffff' : '#d4644a',
                }}
              >
                {confirmDelete ? '本当に削除する' : 'テンションを削除'}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 transition-colors"
                  style={{ backgroundColor: '#2a2a32' }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editTitle.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#7b5ea7' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
