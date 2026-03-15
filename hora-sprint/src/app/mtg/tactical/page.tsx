"use client"

import { useState, useEffect, useCallback } from 'react'
import { store } from '@/lib/store'
import { Play, Pause, ChevronRight, ChevronLeft, Check, Plus } from 'lucide-react'

const PHASES = ['チェックイン', 'メトリクス確認', 'プロジェクト更新', 'テンション処理', 'チェックアウト'] as const

export default function TacticalMTGPage() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set())
  const [checkedOut, setCheckedOut] = useState<Set<string>>(new Set())
  const [actionsCreated, setActionsCreated] = useState<string[]>([])
  const [newActionTitle, setNewActionTitle] = useState('')
  const [newActionAssignee, setNewActionAssignee] = useState('')
  const [tasks, setTasks] = useState(() => {
    const sprint = store.getActiveSprint()
    return sprint ? store.getTasksBySprint(sprint.id) : []
  })
  const [tensions, setTensions] = useState(() =>
    store.getTensionsByType('tactical').filter(t => t.status !== 'resolved')
  )

  const members = store.getMembers()
  const sprint = store.getActiveSprint()

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (timerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [timerRunning])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const nextPhase = useCallback(() => {
    if (phaseIndex < PHASES.length - 1) {
      setPhaseIndex(i => i + 1)
      setTimer(0)
    }
  }, [phaseIndex])

  const prevPhase = useCallback(() => {
    if (phaseIndex > 0) {
      setPhaseIndex(i => i - 1)
      setTimer(0)
    }
  }, [phaseIndex])

  const toggleCheckIn = (memberId: string) => {
    setCheckedIn(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const toggleCheckOut = (memberId: string) => {
    setCheckedOut(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const updateTaskStatus = (taskId: string, status: 'todo' | 'in_progress' | 'done' | 'blocked') => {
    store.updateTask(taskId, { status })
    setTasks(sprint ? store.getTasksBySprint(sprint.id) : [])
  }

  const processTension = (tensionId: string) => {
    store.updateTension(tensionId, { status: 'processing' })
    setTensions(store.getTensionsByType('tactical').filter(t => t.status !== 'resolved'))
  }

  const resolveTension = (tensionId: string) => {
    store.updateTension(tensionId, { status: 'resolved' })
    setTensions(store.getTensionsByType('tactical').filter(t => t.status !== 'resolved'))
  }

  const addNextAction = () => {
    if (!newActionTitle || !newActionAssignee || !sprint) return
    const task = store.addTask({
      sprint_id: sprint.id,
      role_id: null,
      assignee_id: newActionAssignee,
      title: newActionTitle,
      status: 'todo',
    })
    setActionsCreated(prev => [...prev, task.title])
    setTasks(store.getTasksBySprint(sprint.id))
    setNewActionTitle('')
    setNewActionAssignee('')
  }

  const statusLabels: Record<string, string> = {
    todo: '未着手', in_progress: '進行中', done: '完了', blocked: 'ブロック中'
  }
  const statusColors: Record<string, string> = {
    todo: '#8a8694', in_progress: '#4a7ec4', done: '#4a9e6a', blocked: '#d4644a'
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#e8e6f0' }}>タクティカルMTG</h1>
        <div className="flex items-center gap-3">
          <div className="font-mono text-2xl font-bold" style={{ color: '#7b5ea7' }}>
            {formatTime(timer)}
          </div>
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="p-2 rounded-lg"
            style={{ background: '#7b5ea7', color: '#fff' }}
          >
            {timerRunning ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      </div>

      {/* Phase stepper */}
      <div className="flex items-center gap-1 mb-8">
        {PHASES.map((phase, i) => (
          <div key={phase} className="flex items-center">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{
                background: i === phaseIndex ? '#7b5ea7' : i < phaseIndex ? 'rgba(123,94,167,0.2)' : '#1a1a1f',
                color: i === phaseIndex ? '#fff' : i < phaseIndex ? '#7b5ea7' : '#8a8694',
                border: '1px solid ' + (i === phaseIndex ? '#7b5ea7' : '#2a2a32'),
              }}
              onClick={() => { setPhaseIndex(i); setTimer(0) }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{
                background: i < phaseIndex ? '#7b5ea7' : 'transparent',
                border: i >= phaseIndex ? '1px solid currentColor' : 'none',
                color: i < phaseIndex ? '#fff' : 'inherit',
              }}>
                {i < phaseIndex ? <Check size={12} /> : i + 1}
              </span>
              {phase}
            </div>
            {i < PHASES.length - 1 && <ChevronRight size={16} style={{ color: '#2a2a32' }} className="mx-1" />}
          </div>
        ))}
      </div>

      {/* Phase content */}
      <div className="rounded-xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2a2a32', minHeight: '400px' }}>
        {/* チェックイン */}
        {phaseIndex === 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#e8e6f0' }}>チェックイン</h2>
            <p className="text-sm mb-4" style={{ color: '#8a8694' }}>各メンバーが一言ずつ共有します。</p>
            <div className="space-y-2">
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                  style={{ background: checkedIn.has(m.id) ? 'rgba(74,158,106,0.1)' : '#0f0f11', border: '1px solid ' + (checkedIn.has(m.id) ? '#4a9e6a' : '#2a2a32') }}
                  onClick={() => toggleCheckIn(m.id)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: m.color }}>
                    {m.abbr}
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#e8e6f0' }}>{m.name}</span>
                  {checkedIn.has(m.id) && <Check size={16} style={{ color: '#4a9e6a' }} className="ml-auto" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メトリクス確認 */}
        {phaseIndex === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#e8e6f0' }}>メトリクス確認</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '週次架電数', value: '127', target: '150', color: '#c49a3c' },
                { label: '書類通過率', value: '32%', target: '35%', color: '#3d9e8c' },
                { label: '面談実施数', value: '8', target: '15', color: '#4a7ec4' },
              ].map(metric => (
                <div key={metric.label} className="p-4 rounded-lg" style={{ background: '#0f0f11', border: '1px solid #2a2a32' }}>
                  <p className="text-xs mb-1" style={{ color: '#8a8694' }}>{metric.label}</p>
                  <p className="text-3xl font-bold font-mono" style={{ color: metric.color }}>{metric.value}</p>
                  <p className="text-xs mt-1" style={{ color: '#8a8694' }}>目標: {metric.target}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* プロジェクト更新 */}
        {phaseIndex === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#e8e6f0' }}>プロジェクト更新</h2>
            <div className="space-y-2">
              {tasks.map(task => {
                const member = store.getMember(task.assignee_id)
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#0f0f11', border: '1px solid #2a2a32' }}>
                    {member && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: member.color }}>
                        {member.abbr}
                      </div>
                    )}
                    <span className="text-sm flex-1" style={{ color: '#e8e6f0' }}>{task.title}</span>
                    <select
                      value={task.status}
                      onChange={e => updateTaskStatus(task.id, e.target.value as 'todo' | 'in_progress' | 'done' | 'blocked')}
                      className="text-xs px-2 py-1 rounded border-none outline-none"
                      style={{ background: statusColors[task.status] + '20', color: statusColors[task.status] }}
                    >
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* テンション処理 */}
        {phaseIndex === 3 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#e8e6f0' }}>テンション処理</h2>
            {tensions.length === 0 ? (
              <p className="text-sm" style={{ color: '#8a8694' }}>未処理のタクティカルテンションはありません。</p>
            ) : (
              <div className="space-y-3">
                {tensions.map(t => {
                  const author = store.getMember(t.author_id)
                  return (
                    <div key={t.id} className="p-4 rounded-lg" style={{ background: '#0f0f11', border: '1px solid #2a2a32' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: '#e8e6f0' }}>{t.title}</h3>
                          <p className="text-xs mt-1" style={{ color: '#8a8694' }}>{t.description}</p>
                          {author && <p className="text-xs mt-1" style={{ color: '#8a8694' }}>起票: {author.name}</p>}
                        </div>
                        <div className="flex gap-2">
                          {t.status === 'unprocessed' && (
                            <button onClick={() => processTension(t.id)} className="text-xs px-3 py-1 rounded-lg" style={{ background: '#4a7ec4', color: '#fff' }}>
                              処理開始
                            </button>
                          )}
                          <button onClick={() => resolveTension(t.id)} className="text-xs px-3 py-1 rounded-lg" style={{ background: '#4a9e6a', color: '#fff' }}>
                            解決済み
                          </button>
                        </div>
                      </div>

                      {/* Add next action */}
                      <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #2a2a32' }}>
                        <input
                          type="text"
                          placeholder="ネクストアクション..."
                          value={newActionTitle}
                          onChange={e => setNewActionTitle(e.target.value)}
                          className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ background: '#1a1a1f', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                        />
                        <select
                          value={newActionAssignee}
                          onChange={e => setNewActionAssignee(e.target.value)}
                          className="text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ background: '#1a1a1f', color: '#e8e6f0', border: '1px solid #2a2a32' }}
                        >
                          <option value="">担当者</option>
                          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <button onClick={addNextAction} className="p-2 rounded-lg" style={{ background: '#7b5ea7', color: '#fff' }}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* チェックアウト */}
        {phaseIndex === 4 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#e8e6f0' }}>チェックアウト</h2>

            {actionsCreated.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2" style={{ color: '#3d9e8c' }}>本MTGで追加されたアクション</h3>
                <ul className="space-y-1">
                  {actionsCreated.map((a, i) => (
                    <li key={i} className="text-sm flex items-center gap-2" style={{ color: '#e8e6f0' }}>
                      <span style={{ color: '#3d9e8c' }}>✓</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                  style={{ background: checkedOut.has(m.id) ? 'rgba(74,158,106,0.1)' : '#0f0f11', border: '1px solid ' + (checkedOut.has(m.id) ? '#4a9e6a' : '#2a2a32') }}
                  onClick={() => toggleCheckOut(m.id)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: m.color }}>
                    {m.abbr}
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#e8e6f0' }}>{m.name}</span>
                  {checkedOut.has(m.id) && <Check size={16} style={{ color: '#4a9e6a' }} className="ml-auto" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-4">
        <button
          onClick={prevPhase}
          disabled={phaseIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
          style={{ background: '#1a1a1f', color: '#e8e6f0', border: '1px solid #2a2a32' }}
        >
          <ChevronLeft size={16} /> 前のフェーズ
        </button>
        <button
          onClick={nextPhase}
          disabled={phaseIndex === PHASES.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
          style={{ background: '#7b5ea7', color: '#fff' }}
        >
          次のフェーズ <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
