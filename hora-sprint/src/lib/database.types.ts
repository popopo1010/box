export interface Database {
  public: {
    Tables: {
      members: {
        Row: Member
        Insert: Omit<Member, 'created_at'>
        Update: Partial<Member>
      }
      circles: {
        Row: Circle
        Insert: Omit<Circle, 'id' | 'created_at'>
        Update: Partial<Circle>
      }
      roles: {
        Row: Role
        Insert: Omit<Role, 'id' | 'created_at'>
        Update: Partial<Role>
      }
      role_assignments: {
        Row: RoleAssignment
        Insert: Omit<RoleAssignment, 'id'>
        Update: Partial<RoleAssignment>
      }
      policies: {
        Row: Policy
        Insert: Omit<Policy, 'id' | 'created_at'>
        Update: Partial<Policy>
      }
      tensions: {
        Row: Tension
        Insert: Omit<Tension, 'id' | 'created_at'>
        Update: Partial<Tension>
      }
      sprints: {
        Row: Sprint
        Insert: Omit<Sprint, 'id'>
        Update: Partial<Sprint>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at'>
        Update: Partial<Task>
      }
      proposals: {
        Row: Proposal
        Insert: Omit<Proposal, 'id' | 'created_at'>
        Update: Partial<Proposal>
      }
      governance_logs: {
        Row: GovernanceLog
        Insert: Omit<GovernanceLog, 'id'>
        Update: Partial<GovernanceLog>
      }
    }
  }
}

export interface Member {
  id: string
  name: string
  email: string
  color: string
  abbr: string
  created_at: string
}

export interface Circle {
  id: string
  name: string
  purpose: string
  parent_circle_id: string | null
  created_at: string
}

export interface Role {
  id: string
  circle_id: string
  name: string
  purpose: string
  domain: string
  accountabilities: string[]
  created_at: string
}

export interface RoleAssignment {
  id: string
  role_id: string
  member_id: string
  assigned_at: string
  unassigned_at: string | null
}

export interface Policy {
  id: string
  role_id: string
  title: string
  description: string
  created_by: string
  created_at: string
}

export interface Tension {
  id: string
  title: string
  description: string
  type: 'governance' | 'tactical' | 'strategy'
  status: 'unprocessed' | 'processing' | 'resolved'
  author_id: string
  sprint_id: string | null
  created_at: string
}

export interface Sprint {
  id: string
  name: string
  goal: string
  start_date: string
  end_date: string
  status: 'planning' | 'active' | 'completed'
}

export interface Task {
  id: string
  sprint_id: string
  role_id: string | null
  assignee_id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  created_at: string
}

export interface Proposal {
  id: string
  title: string
  description: string
  proposer_id: string
  phase: 'proposal' | 'clarification' | 'objection' | 'integration' | 'approved' | 'rejected'
  auto_approve_at: string | null
  created_at: string
}

export interface GovernanceLog {
  id: string
  type: string
  before_snapshot: Record<string, unknown>
  after_snapshot: Record<string, unknown>
  changed_by: string
  changed_at: string
}

// Extended types with relations
export interface RoleWithAssignments extends Role {
  role_assignments?: (RoleAssignment & { members?: Member })[]
  members?: Member[]
}

export interface CircleWithRoles extends Circle {
  roles?: RoleWithAssignments[]
  sub_circles?: Circle[]
}

export interface TensionWithAuthor extends Tension {
  members?: Member
}

export interface TaskWithRelations extends Task {
  members?: Member
  roles?: Role
}

export interface SprintWithTasks extends Sprint {
  tasks?: TaskWithRelations[]
}
