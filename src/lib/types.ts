// 共享类型定义

export type TransactionType = "income" | "expense";

export interface Ledger {
  id: number;
  team_id: number | null;
  name: string;
  description: string | null;
  currency: string;
  initial_balance: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryGroup {
  id: number;
  ledger_id: number;
  name: string;
  type: TransactionType;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Category {
  id: number;
  ledger_id: number;
  group_id: number | null;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: number;
  ledger_id: number;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  ledger_id: number;
  category_id: number | null;
  amount: string;
  type: TransactionType;
  description: string | null;
  transaction_date: string;
  tag_ids: string | null;
  created_at: string;
  updated_at: string;
  // 关联数据
  category?: Category | null;
  tags?: Tag[];
}

export interface TransactionWithRelations extends Transaction {
  category?: Category | null;
  tags?: Tag[];
}

export interface StatsResponse {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  categoryBreakdown: {
    category_id: number | null;
    category_name: string;
    type: TransactionType;
    total: number;
    count: number;
    color: string | null;
    icon: string | null;
  }[];
  dailyTrend: {
    date: string;
    income: number;
    expense: number;
  }[];
}

export type TodoStatus = "todo" | "doing" | "done" | "canceled";
export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoDateBucket = "overdue" | "today" | "future" | "no_date" | "done";

export interface Team {
  id: number;
  name: string;
  color: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  ledgerCount?: number;
  todoCount?: number;
}

export interface TodoChecklistItem {
  id: number;
  todo_id: number;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: number;
  title: string;
  notes: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  due_date: string | null;
  team_id: number | null;
  ledger_id: number | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  team?: Team | null;
  ledger?: Ledger | null;
  checklist?: TodoChecklistItem[];
  checklistProgress?: number;
}

export interface TodoStats {
  today: number;
  doing: number;
  done: number;
  overdue: number;
  completionRate: number;
}

// ==================== CRM 类型 ====================

export type CrmEventType = "event" | "project";
export type CrmEntityType = "contact" | "event";
export type GraphNodeType = CrmEntityType | "project";

export interface CrmContact {
  id: number;
  name: string;
  phone: string | null;
  company: string | null;
  region: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  // 关联数据
  groups?: CrmGroup[];
  logs?: CrmContactLog[];
  events?: { id: number; title: string; type: string; role?: string | null }[];
  relationships?: CrmRelationship[];
  relationshipCount?: number;
}

export interface CrmContactLog {
  id: number;
  contact_id: number;
  content: string;
  log_date: string;
  created_at: string;
}

export interface CrmGroup {
  id: number;
  ledger_id: number;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  // 关联数据
  memberCount?: number;
  contacts?: CrmContact[];
}

export interface CrmGroupMember {
  id: number;
  group_id: number;
  contact_id: number;
  created_at: string;
}

export interface CrmEvent {
  id: number;
  ledger_id: number;
  title: string;
  type: CrmEventType;
  created_at: string;
  updated_at: string;
  // 关联数据
  participants?: CrmEventParticipant[];
  participantCount?: number;
}

export interface CrmEventParticipant {
  id: number;
  event_id: number;
  contact_id: number;
  role: string | null;
  created_at: string;
  // 关联数据
  contact?: CrmContact;
}

export interface CrmRelationship {
  id: number;
  ledger_id: number;
  source_type: CrmEntityType;
  source_id: number;
  target_type: CrmEntityType;
  target_id: number;
  label: string | null;
  created_at: string;
}

// 图谱可视化节点
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  sublabel?: string | null;
  color: string;
  borderColor: string;
}

// 图谱可视化边
export type GraphEndpoint = string | { id?: string };

export interface GraphLink {
  source: GraphEndpoint;
  target: GraphEndpoint;
  label: string | null;
  color: string;
}
