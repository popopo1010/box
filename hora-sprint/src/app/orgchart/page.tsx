"use client"

import { useState } from 'react'
import { store } from '@/lib/store'
import { Network, GitBranch } from 'lucide-react'

type ViewMode = 'tree' | 'bubble'

export default function OrgChartPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)

  const circles = store.getCircles()
  const roles = store.getRoles()
  const members = store.getMembers()

  const getRoleMembers = (roleId: string) => {
    const assignments = store.getAssignmentsForRole(roleId)
    return assignments.map(a => store.getMember(a.member_id)).filter(Boolean)
  }

  const selectedRole = selectedRoleId ? store.getRole(selectedRoleId) : null
  const selectedRoleMembers = selectedRoleId ? getRoleMembers(selectedRoleId) : []

  // Tree view dimensions
  const treeWidth = 1000
  const treeHeight = 600
  const circleSpacing = treeWidth / (circles.length + 1)

  // Bubble view dimensions
  const bubbleWidth = 900
  const bubbleHeight = 600

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#e8e6f0' }}>組織図</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('tree')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: viewMode === 'tree' ? '#7b5ea7' : '#1a1a1f',
              color: viewMode === 'tree' ? '#fff' : '#8a8694',
              border: '1px solid #2a2a32',
            }}
          >
            <GitBranch size={16} />
            ツリービュー
          </button>
          <button
            onClick={() => setViewMode('bubble')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: viewMode === 'bubble' ? '#7b5ea7' : '#1a1a1f',
              color: viewMode === 'bubble' ? '#fff' : '#8a8694',
              border: '1px solid #2a2a32',
            }}
          >
            <Network size={16} />
            バブルビュー
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}>
        {viewMode === 'tree' ? (
          <svg viewBox={`0 0 ${treeWidth} ${treeHeight}`} className="w-full" style={{ maxHeight: '70vh' }}>
            {/* XCHANGE root */}
            <rect x={treeWidth / 2 - 80} y={20} width={160} height={40} rx={8} fill="#7b5ea7" />
            <text x={treeWidth / 2} y={45} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">XCHANGE</text>

            {/* Circle nodes */}
            {circles.map((circle, i) => {
              const cx = circleSpacing * (i + 1)
              const cy = 130
              const circleRoles = roles.filter(r => r.circle_id === circle.id)
              const colors = ['#7b5ea7', '#3d9e8c', '#c49a3c']
              const color = colors[i % colors.length]

              return (
                <g key={circle.id}>
                  {/* Bezier from root to circle */}
                  <path
                    d={`M ${treeWidth / 2} 60 C ${treeWidth / 2} 90, ${cx} 100, ${cx} ${cy}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  {/* Circle node */}
                  <rect x={cx - 80} y={cy - 20} width={160} height={40} rx={8} fill={color} opacity="0.9" />
                  <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                    {circle.name}
                  </text>

                  {/* Role nodes */}
                  {circleRoles.map((role, j) => {
                    const roleSpacing = 160 / (circleRoles.length + 1)
                    const rx = cx - 80 + roleSpacing * (j + 1)
                    const ry = 240 + j * 80
                    const roleMembers = getRoleMembers(role.id)
                    const isEmpty = roleMembers.length === 0

                    return (
                      <g key={role.id} onClick={() => setSelectedRoleId(role.id)} className="cursor-pointer">
                        {/* Line from circle to role */}
                        <path
                          d={`M ${cx} ${cy + 20} C ${cx} ${cy + 50}, ${rx} ${ry - 30}, ${rx} ${ry - 20}`}
                          fill="none"
                          stroke={color}
                          strokeWidth="1.5"
                          opacity="0.4"
                        />
                        {/* Role box */}
                        <rect
                          x={rx - 70}
                          y={ry - 20}
                          width={140}
                          height={50}
                          rx={6}
                          fill="#1a1a1f"
                          stroke={isEmpty ? '#d4644a' : color}
                          strokeWidth={isEmpty ? 2 : 1}
                        />
                        <text x={rx} y={ry + 2} textAnchor="middle" fill="#e8e6f0" fontSize="11" fontWeight="500">
                          {role.name}
                        </text>
                        {/* Member avatars */}
                        {roleMembers.slice(0, 3).map((m, k) => (
                          m && (
                            <g key={m.id}>
                              <circle cx={rx - 20 + k * 20} cy={ry + 22} r={8} fill={m.color} />
                              <text x={rx - 20 + k * 20} y={ry + 25} textAnchor="middle" fill="#fff" fontSize="7">
                                {m.abbr}
                              </text>
                            </g>
                          )
                        ))}
                        {roleMembers.length > 3 && (
                          <text x={rx + 30} y={ry + 25} fill="#8a8694" fontSize="9">+{roleMembers.length - 3}</text>
                        )}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        ) : (
          /* Bubble View */
          <svg viewBox={`0 0 ${bubbleWidth} ${bubbleHeight}`} className="w-full" style={{ maxHeight: '70vh' }}>
            {circles.map((circle, i) => {
              const circleRoles = roles.filter(r => r.circle_id === circle.id)
              const colors = ['#7b5ea7', '#3d9e8c', '#c49a3c']
              const color = colors[i % colors.length]
              const cx = 150 + i * 270
              const cy = bubbleHeight / 2
              const outerR = 120

              return (
                <g key={circle.id}>
                  {/* Outer circle (サークル) */}
                  <circle cx={cx} cy={cy} r={outerR} fill={color} opacity="0.1" stroke={color} strokeWidth="2" />
                  <text x={cx} y={cy - outerR + 25} textAnchor="middle" fill={color} fontSize="13" fontWeight="bold">
                    {circle.name}
                  </text>

                  {/* Inner role bubbles */}
                  {circleRoles.map((role, j) => {
                    const angle = (j / circleRoles.length) * Math.PI * 2 - Math.PI / 2
                    const innerR = outerR * 0.5
                    const roleR = 35
                    const rx = cx + Math.cos(angle) * innerR
                    const ry = cy + 10 + Math.sin(angle) * innerR
                    const roleMembers = getRoleMembers(role.id)
                    const isEmpty = roleMembers.length === 0

                    return (
                      <g key={role.id} onClick={() => setSelectedRoleId(role.id)} className="cursor-pointer">
                        <circle
                          cx={rx}
                          cy={ry}
                          r={roleR}
                          fill="#1a1a1f"
                          stroke={isEmpty ? '#d4644a' : color}
                          strokeWidth={isEmpty ? 2 : 1.5}
                        />
                        <text x={rx} y={ry - 5} textAnchor="middle" fill="#e8e6f0" fontSize="9" fontWeight="500">
                          {role.name.length > 8 ? role.name.slice(0, 8) + '…' : role.name}
                        </text>
                        {/* Mini member dots */}
                        {roleMembers.slice(0, 4).map((m, k) => {
                          const dotAngle = (k / Math.max(roleMembers.length, 1)) * Math.PI * 2 - Math.PI / 2
                          const dotR = roleR * 0.55
                          return m && (
                            <circle
                              key={m.id}
                              cx={rx + Math.cos(dotAngle) * dotR}
                              cy={ry + 10 + Math.sin(dotAngle) * dotR}
                              r={6}
                              fill={m.color}
                            />
                          )
                        })}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        )}
      </div>

      {/* Role Detail Modal */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: '#1a1a1f', border: '1px solid #2a2a32' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#e8e6f0' }}>{selectedRole.name}</h3>
              <button onClick={() => setSelectedRoleId(null)} className="text-sm" style={{ color: '#8a8694' }}>✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#8a8694' }}>Purpose</p>
                <p className="text-sm" style={{ color: '#e8e6f0' }}>{selectedRole.purpose}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#8a8694' }}>Domain</p>
                <p className="text-sm" style={{ color: '#e8e6f0' }}>{selectedRole.domain}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#8a8694' }}>Accountabilities</p>
                <ul className="space-y-1">
                  {selectedRole.accountabilities.map((a, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#e8e6f0' }}>
                      <span style={{ color: '#7b5ea7' }}>•</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#8a8694' }}>アサインメンバー</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedRoleMembers.map(m => m && (
                    <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: '#0f0f11' }}>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: m.color }}
                      >
                        {m.abbr}
                      </div>
                      <span className="text-sm" style={{ color: '#e8e6f0' }}>{m.name}</span>
                    </div>
                  ))}
                  {selectedRoleMembers.length === 0 && (
                    <span className="text-sm" style={{ color: '#d4644a' }}>空席（未アサイン）</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedRoleId(null)}
              className="mt-4 w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: '#7b5ea7', color: '#fff' }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
