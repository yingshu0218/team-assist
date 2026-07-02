# 团队管理助手 - Code Wiki

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 目录结构](#3-目录结构)
- [4. 整体架构](#4-整体架构)
- [5. 数据库设计](#5-数据库设计)
- [6. API 路由层](#6-api-路由层)
- [7. 前端组件层](#7-前端组件层)
- [8. Hooks 层](#8-hooks-层)
- [9. 工具库](#9-工具库)
- [10. CLI 命令行工具](#10-cli-命令行工具)
- [11. 运行方式](#11-运行方式)
- [12. 认证系统](#12-认证系统)

---

## 1. 项目概述

**团队管理助手**是一个支持多账本管理、收支记录、分类标签、待办事项工作台、客户关系管理（CRM）、数据统计与可视化的全栈 Web 应用。

### 核心功能

| 模块 | 功能描述 |
|------|----------|
| **账本管理** | 多账本支持、货币设置、初始余额、团队关联 |
| **收支记录** | 收入/支出录入、分类关联、标签标记、日期筛选 |
| **分类管理** | 分组管理、分类层级、预设分类模板 |
| **标签管理** | 自定义标签、颜色标记 |
| **待办工作台** | 团队分组、状态管理、优先级、checklist、进度统计 |
| **CRM 管理** | 联系人、分组、事件/项目、关联关系、图谱可视化 |
| **数据统计** | 收支汇总、分类占比、趋势图表 |
| **数据备份** | JSON 导出/导入、Git 远程备份 |

---

## 2. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **框架** | Next.js | 16.x (App Router) |
| **核心** | React | 19.x |
| **语言** | TypeScript | 5.x |
| **UI 组件** | shadcn/ui (Radix UI) | - |
| **样式** | Tailwind CSS | 4.x |
| **数据库** | SQLite + Drizzle ORM | better-sqlite3 12.x |
| **图表** | Recharts | 2.x |
| **图谱** | react-force-graph-2d | 1.x |
| **CLI** | npx tsx | 4.x |
| **部署** | Docker | - |

---

## 3. 目录结构

```
/workspace/
├── public/                    # 静态资源
├── scripts/                   # 脚本文件
│   ├── build.sh               # 构建脚本
│   ├── dev.sh                 # 开发启动脚本
│   ├── prepare.sh             # 预处理脚本
│   ├── start.sh               # 生产启动脚本
│   └── cli.ts                 # CLI 命令行工具入口
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API 路由
│   │   ├── globals.css        # 全局样式
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 主页面
│   ├── components/            # 组件库
│   │   ├── ui/                # shadcn/ui 组件
│   │   ├── crm/               # CRM 业务组件
│   │   ├── todos/             # 待办工作台组件
│   │   └── ...                # 其他业务组件
│   ├── hooks/                 # React Hooks
│   ├── lib/                   # 工具库
│   └── storage/               # 数据存储层
│       └── database/          # SQLite + Drizzle ORM
├── test/                      # 测试文件
└── config files...            # 配置文件
```

---

## 4. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  UI Components│  │  Business    │  │  React Hooks      │  │
│  │  (shadcn/ui)  │  │  Components  │  │  (use-ledger,     │  │
│  │              │  │              │  │   use-auth, etc)  │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        API 路由层                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Auth Routes │  │  Business    │  │  CRM Routes       │  │
│  │              │  │  Routes      │  │                   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ Drizzle ORM
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据存储层 (SQLite)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  sqlite-     │  │  Schema      │  │  Migration        │  │
│  │  client.ts   │  │  Definition  │  │  Logic            │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 架构特点

1. **全栈一体**: Next.js App Router 提供服务端和客户端渲染
2. **数据持久化**: SQLite + Drizzle ORM，支持 WAL 模式
3. **认证体系**: JWT Session + Agent Token 双重认证
4. **模块化设计**: 业务逻辑按领域划分（账本、交易、CRM、待办）
5. **CLI 支持**: 命令行工具通过 HTTP API 远程调用

---

## 5. 数据库设计

### 核心数据表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `ledgers` | 账本 | id, name, team_id, currency, initial_balance |
| `category_groups` | 分类分组 | id, ledger_id, name, type(income/expense) |
| `categories` | 分类 | id, ledger_id, group_id, name, type, icon, color |
| `tags` | 标签 | id, ledger_id, name, color |
| `transactions` | 交易记录 | id, ledger_id, category_id, amount, type, tag_ids |
| `teams` | 团队/待办分组 | id, name, color, description |
| `todos` | 待办事项 | id, title, status, priority, due_date, team_id, ledger_id |
| `todo_checklist_items` | 待办清单项 | id, todo_id, title, is_done |
| `crm_contacts` | CRM 联系人 | id, name, phone, company, region |
| `crm_groups` | CRM 分组 | id, ledger_id, name, color |
| `crm_events` | CRM 事件/项目 | id, ledger_id, title, type |
| `crm_relationships` | CRM 关联关系 | id, source_type, source_id, target_type, target_id |
| `admin_accounts` | 管理员账号 | id, username, password_hash |
| `agent_tokens` | Agent 凭证 | id, name, token_hash, token_prefix |

### 外键关系

- `category_groups.ledger_id` → `ledgers.id` (CASCADE)
- `categories.ledger_id` → `ledgers.id` (CASCADE)
- `categories.group_id` → `category_groups.id` (SET NULL)
- `transactions.ledger_id` → `ledgers.id` (CASCADE)
- `transactions.category_id` → `categories.id` (SET NULL)
- `todos.team_id` → `teams.id` (SET NULL)
- `todos.ledger_id` → `ledgers.id` (SET NULL)
- `todo_checklist_items.todo_id` → `todos.id` (CASCADE)
- `crm_groups.ledger_id` → `ledgers.id` (CASCADE)
- `crm_relationships.ledger_id` → `ledgers.id` (CASCADE)

### Schema 定义文件

- [schema.ts](file:///workspace/src/storage/database/shared/schema.ts) - Drizzle ORM 表定义
- [sqlite-client.ts](file:///workspace/src/storage/database/sqlite-client.ts) - 数据库连接与初始化

---

## 6. API 路由层

### 6.1 认证相关

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/auth/check` | GET | 检查认证状态 | [check/route.ts](file:///workspace/src/app/api/auth/check/route.ts) |
| `/api/auth/init` | POST | 初始化管理员账号 | [init/route.ts](file:///workspace/src/app/api/auth/init/route.ts) |
| `/api/auth/login` | POST | 管理员登录 | [login/route.ts](file:///workspace/src/app/api/auth/login/route.ts) |
| `/api/auth/agent` | GET/POST | Agent Token 管理 | [agent/route.ts](file:///workspace/src/app/api/auth/agent/route.ts) |
| `/api/auth/agent/[id]` | DELETE | 撤销 Agent Token | [agent/[id]/route.ts](file:///workspace/src/app/api/auth/agent/[id]/route.ts) |
| `/api/auth/guide` | GET | Agent 接入引导 | [guide/route.ts](file:///workspace/src/app/api/auth/guide/route.ts) |

### 6.2 账本相关

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/ledgers` | GET | 获取账本列表 | [ledgers/route.ts](file:///workspace/src/app/api/ledgers/route.ts) |
| `/api/ledgers` | POST | 创建账本（自动初始化分类） | [ledgers/route.ts](file:///workspace/src/app/api/ledgers/route.ts) |
| `/api/ledgers/[id]` | GET/PUT/DELETE | 账本详情/编辑/删除 | [ledgers/[id]/route.ts](file:///workspace/src/app/api/ledgers/[id]/route.ts) |
| `/api/ledgers/[id]/export` | GET | 导出账本数据 | [ledgers/[id]/export/route.ts](file:///workspace/src/app/api/ledgers/[id]/export/route.ts) |

### 6.3 交易相关

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/transactions` | GET | 获取交易列表（支持筛选） | [transactions/route.ts](file:///workspace/src/app/api/transactions/route.ts) |
| `/api/transactions` | POST | 创建交易记录 | [transactions/route.ts](file:///workspace/src/app/api/transactions/route.ts) |
| `/api/transactions/[id]` | PUT/DELETE | 编辑/删除交易 | [transactions/[id]/route.ts](file:///workspace/src/app/api/transactions/[id]/route.ts) |

### 6.4 分类相关

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/categories` | GET/POST | 分类列表/创建 | [categories/route.ts](file:///workspace/src/app/api/categories/route.ts) |
| `/api/categories/[id]` | PUT/DELETE | 分类编辑/删除 | [categories/[id]/route.ts](file:///workspace/src/app/api/categories/[id]/route.ts) |
| `/api/category-groups` | GET/POST | 分类分组列表/创建 | [category-groups/route.ts](file:///workspace/src/app/api/category-groups/route.ts) |
| `/api/category-groups/[id]` | PUT/DELETE | 分组编辑/删除 | [category-groups/[id]/route.ts](file:///workspace/src/app/api/category-groups/[id]/route.ts) |

### 6.5 标签相关

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/tags` | GET/POST | 标签列表/创建 | [tags/route.ts](file:///workspace/src/app/api/tags/route.ts) |
| `/api/tags/[id]` | PUT/DELETE | 标签编辑/删除 | [tags/[id]/route.ts](file:///workspace/src/app/api/tags/[id]/route.ts) |

### 6.6 统计相关

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/stats` | GET | 统计数据（收入/支出/分类/趋势） | [stats/route.ts](file:///workspace/src/app/api/stats/route.ts) |

### 6.7 团队与待办

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/teams` | GET/POST | 团队列表/创建 | [teams/route.ts](file:///workspace/src/app/api/teams/route.ts) |
| `/api/teams/[id]` | GET/PUT/DELETE | 团队详情/编辑/删除 | [teams/[id]/route.ts](file:///workspace/src/app/api/teams/[id]/route.ts) |
| `/api/todos` | GET/POST | 待办列表/创建 | [todos/route.ts](file:///workspace/src/app/api/todos/route.ts) |
| `/api/todos/[id]` | GET/PUT/DELETE | 待办详情/编辑/删除 | [todos/[id]/route.ts](file:///workspace/src/app/api/todos/[id]/route.ts) |
| `/api/todos/[id]/checklist` | POST | 添加 checklist 子项 | [todos/[id]/checklist/route.ts](file:///workspace/src/app/api/todos/[id]/checklist/route.ts) |
| `/api/todos/[id]/checklist/[itemId]` | PUT/DELETE | 更新/删除 checklist | [todos/[id]/checklist/[itemId]/route.ts](file:///workspace/src/app/api/todos/[id]/checklist/[itemId]/route.ts) |

### 6.8 CRM 相关

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/crm/contacts` | GET/POST | 联系人列表/创建 | [crm/contacts/route.ts](file:///workspace/src/app/api/crm/contacts/route.ts) |
| `/api/crm/contacts/[id]` | GET/PUT/DELETE | 联系人详情/编辑/删除 | [crm/contacts/[id]/route.ts](file:///workspace/src/app/api/crm/contacts/[id]/route.ts) |
| `/api/crm/contacts/[id]/logs` | GET/POST | 联系记录 | [crm/contacts/[id]/logs/route.ts](file:///workspace/src/app/api/crm/contacts/[id]/logs/route.ts) |
| `/api/crm/groups` | GET/POST | 分组列表/创建 | [crm/groups/route.ts](file:///workspace/src/app/api/crm/groups/route.ts) |
| `/api/crm/groups/[id]/members` | POST/DELETE | 成员添加/移除 | [crm/groups/[id]/members/route.ts](file:///workspace/src/app/api/crm/groups/[id]/members/route.ts) |
| `/api/crm/events` | GET/POST | 事件/项目列表/创建 | [crm/events/route.ts](file:///workspace/src/app/api/crm/events/route.ts) |
| `/api/crm/events/[id]/participants` | POST/DELETE | 参与者添加/移除 | [crm/events/[id]/participants/route.ts](file:///workspace/src/app/api/crm/events/[id]/participants/route.ts) |
| `/api/crm/relationships` | GET/POST | 关联关系列表/创建 | [crm/relationships/route.ts](file:///workspace/src/app/api/crm/relationships/route.ts) |
| `/api/crm/relationships/[id]` | DELETE | 删除关联关系 | [crm/relationships/[id]/route.ts](file:///workspace/src/app/api/crm/relationships/[id]/route.ts) |
| `/api/crm/graph` | GET | 图谱数据（力导向图） | [crm/graph/route.ts](file:///workspace/src/app/api/crm/graph/route.ts) |

### 6.9 同步与备份

| 路径 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/sync` | GET/POST | 数据导出/导入 | [sync/route.ts](file:///workspace/src/app/api/sync/route.ts) |
| `/api/sync/git` | GET/POST | Git 备份管理 | [sync/git/route.ts](file:///workspace/src/app/api/sync/git/route.ts) |

---

## 7. 前端组件层

### 7.1 UI 组件（shadcn/ui）

位于 [src/components/ui/](file:///workspace/src/components/ui/)，包含标准 UI 组件：

- `button.tsx` - 按钮
- `card.tsx` - 卡片
- `dialog.tsx` - 对话框
- `input.tsx` - 输入框
- `select.tsx` - 选择器
- `table.tsx` - 表格
- `tabs.tsx` - 标签页
- `sidebar.tsx` - 侧边栏
- `badge.tsx` - 徽章
- `progress.tsx` - 进度条
- `calendar.tsx` - 日历选择器

### 7.2 业务组件

| 组件 | 功能 | 文件 |
|------|------|------|
| `AppSidebar` | 应用侧边栏（导航 + 账本切换） | [app-sidebar.tsx](file:///workspace/src/components/app-sidebar.tsx) |
| `AuthGate` | 认证门控（初始化/登录） | [auth-gate.tsx](file:///workspace/src/components/auth-gate.tsx) |
| `DashboardView` | 概览页（统计卡片 + 图表） | [dashboard-view.tsx](file:///workspace/src/components/dashboard-view.tsx) |
| `TransactionsView` | 收支明细页 | [transactions-view.tsx](file:///workspace/src/components/transactions-view.tsx) |
| `CategoriesView` | 分类管理页 | [categories-view.tsx](file:///workspace/src/components/categories-view.tsx) |
| `TagsView` | 标签管理页 | [tags-view.tsx](file:///workspace/src/components/tags-view.tsx) |
| `TransactionDialog` | 交易录入/编辑弹窗 | [transaction-dialog.tsx](file:///workspace/src/components/transaction-dialog.tsx) |
| `StatCards` | 统计卡片组件 | [stat-cards.tsx](file:///workspace/src/components/stat-cards.tsx) |
| `OverviewCharts` | 图表可视化组件 | [overview-charts.tsx](file:///workspace/src/components/overview-charts.tsx) |
| `SyncSettingsView` | 同步与备份设置 | [sync-settings-view.tsx](file:///workspace/src/components/sync-settings-view.tsx) |
| `AuthSettingsView` | 系统设置（Agent Token） | [auth-settings-view.tsx](file:///workspace/src/components/auth-settings-view.tsx) |
| `ThemeToggle` | 主题切换按钮 | [theme-toggle.tsx](file:///workspace/src/components/theme-toggle.tsx) |

### 7.3 CRM 组件

| 组件 | 功能 | 文件 |
|------|------|------|
| `CrmContactsView` | 联系人管理页 | [crm-contacts-view.tsx](file:///workspace/src/components/crm/crm-contacts-view.tsx) |
| `CrmGroupsView` | 分组管理页 | [crm-groups-view.tsx](file:///workspace/src/components/crm/crm-groups-view.tsx) |
| `CrmEventsView` | 事件/项目管理页 | [crm-events-view.tsx](file:///workspace/src/components/crm/crm-events-view.tsx) |
| `CrmRelationshipsView` | 关联关系管理页 | [crm-relationships-view.tsx](file:///workspace/src/components/crm/crm-relationships-view.tsx) |
| `CrmGraphView` | 关系图谱可视化 | [crm-graph-view.tsx](file:///workspace/src/components/crm/crm-graph-view.tsx) |
| `CrmTimelineView` | 时间线视图 | [crm-timeline-view.tsx](file:///workspace/src/components/crm/crm-timeline-view.tsx) |

### 7.4 待办组件

| 组件 | 功能 | 文件 |
|------|------|------|
| `TodosView` | 待办工作台主视图 | [todos/todos-view.tsx](file:///workspace/src/components/todos/todos-view.tsx) |
| `TodoList` | 待办列表组件 | [todos/todo-list.tsx](file:///workspace/src/components/todos/todo-list.tsx) |
| `TodoDetailPanel` | 待办详情面板 | [todos/todo-detail-panel.tsx](file:///workspace/src/components/todos/todo-detail-panel.tsx) |
| `TodoDialog` | 待办创建/编辑弹窗 | [todos/todo-dialog.tsx](file:///workspace/src/components/todos/todo-dialog.tsx) |
| `TeamDialog` | 团队创建/编辑弹窗 | [todos/team-dialog.tsx](file:///workspace/src/components/todos/team-dialog.tsx) |
| `TodoTeamFilter` | 团队筛选器 | [todos/todo-team-filter.tsx](file:///workspace/src/components/todos/todo-team-filter.tsx) |
| `TodoStatsCards` | 待办统计卡片 | [todos/todo-stats-cards.tsx](file:///workspace/src/components/todos/todo-stats-cards.tsx) |

---

## 8. Hooks 层

### 8.1 use-ledger

**功能**: 账本状态管理（Context + Provider）

**位置**: [use-ledger.tsx](file:///workspace/src/hooks/use-ledger.tsx)

**导出内容**:

| 成员 | 类型 | 说明 |
|------|------|------|
| `LedgerProvider` | React Component | 账本状态 Provider |
| `useLedger` | Hook | 获取账本状态 |
| `ledgers` | `Ledger[]` | 账本列表 |
| `activeLedger` | `Ledger \| null` | 当前激活账本 |
| `activeLedgerId` | `number \| null` | 当前账本 ID |
| `setActiveLedgerId` | `(id: number) => void` | 设置当前账本 |
| `refreshLedgers` | `() => Promise<void>` | 刷新账本列表 |
| `loading` | `boolean` | 加载状态 |

**特性**:
- 自动创建默认账本（无账本时）
- 账本 ID 持久化到 localStorage

### 8.2 use-auth

**功能**: 认证状态管理（登录/初始化/登出）

**位置**: [use-auth.tsx](file:///workspace/src/hooks/use-auth.tsx)

**导出内容**:

| 成员 | 类型 | 说明 |
|------|------|------|
| `AuthProvider` | React Component | 认证状态 Provider |
| `useAuth` | Hook | 获取认证状态 |
| `authenticated` | `boolean` | 是否已认证 |
| `initialized` | `boolean` | 是否已初始化管理员 |
| `type` | `"session" \| "agent" \| "none"` | 认证类型 |
| `identity` | `string \| null` | 身份标识 |
| `login` | `(username, password) => Promise` | 登录 |
| `initAdmin` | `(username, password) => Promise` | 初始化管理员 |
| `logout` | `() => void` | 登出 |

### 8.3 use-data

**功能**: 数据请求 hooks（自动携带 Auth Token）

**位置**: [use-data.ts](file:///workspace/src/hooks/use-data.ts)

**导出内容**:

| 成员 | 类型 | 说明 |
|------|------|------|
| `useFetch` | Hook | 通用数据获取 |
| `authHeaders` | `(extra?) => Record<string, string>` | 构建认证头 |
| `apiPost` | `(url, body) => Promise` | POST 请求 |
| `apiPut` | `(url, body) => Promise` | PUT 请求 |
| `apiDelete` | `(url, body?) => Promise` | DELETE 请求 |

---

## 9. 工具库

### 9.1 auth.ts

**功能**: 认证工具（密码哈希、JWT、请求验证）

**位置**: [auth.ts](file:///workspace/src/lib/auth.ts)

**核心函数**:

| 函数 | 签名 | 说明 |
|------|------|------|
| `hashPassword` | `(password: string) => Promise<string>` | 密码哈希（bcrypt） |
| `verifyPassword` | `(password: string, hash: string) => Promise<boolean>` | 验证密码 |
| `generateSessionToken` | `(adminId: number, username: string) => string` | 生成 JWT |
| `verifySessionToken` | `(token: string) => { id, username } \| null` | 验证 JWT |
| `isAdminInitialized` | `() => Promise<boolean>` | 检查管理员是否初始化 |
| `generateAgentToken` | `() => { token, hash, prefix }` | 生成 Agent Token |
| `verifyAgentToken` | `(token: string) => Promise<boolean>` | 验证 Agent Token |
| `authenticateRequest` | `(request: Request) => Promise<AuthResult>` | 统一鉴权 |
| `authFailResponse` | `() => Response` | 鉴权失败响应 |

### 9.2 types.ts

**功能**: 共享类型定义

**位置**: [types.ts](file:///workspace/src/lib/types.ts)

**核心类型**:

| 类型 | 说明 |
|------|------|
| `TransactionType` | `"income" \| "expense"` |
| `Ledger` | 账本接口 |
| `Category` | 分类接口 |
| `Tag` | 标签接口 |
| `Transaction` | 交易记录接口 |
| `StatsResponse` | 统计响应接口 |
| `TodoStatus` | `"todo" \| "doing" \| "done" \| "canceled"` |
| `TodoPriority` | `"low" \| "medium" \| "high" \| "urgent"` |
| `Team` | 团队接口 |
| `Todo` | 待办事项接口 |
| `CrmContact` | CRM 联系人接口 |
| `CrmGroup` | CRM 分组接口 |
| `CrmEvent` | CRM 事件/项目接口 |
| `CrmRelationship` | CRM 关联关系接口 |
| `GraphNode` / `GraphLink` | 图谱节点/边接口 |

### 9.3 constants.ts

**功能**: 常量定义（分类预设、颜色、格式化函数）

**位置**: [constants.ts](file:///workspace/src/lib/constants.ts)

**核心内容**:

| 常量/函数 | 说明 |
|-----------|------|
| `DEFAULT_EXPENSE_GROUPS` | 默认支出分组（日常办公、餐饮食品、交通出行等） |
| `DEFAULT_INCOME_GROUPS` | 默认收入分组（经营收入、财务收益等） |
| `DEFAULT_TAG_COLORS` | 默认标签颜色列表 |
| `formatCurrency` | 货币格式化（中文） |
| `formatDate` | 日期格式化（相对时间 + 标准格式） |
| `getDateKey` | 获取日期分组 key |

### 9.4 utils.ts

**功能**: 通用工具函数

**位置**: [utils.ts](file:///workspace/src/lib/utils.ts)

**核心函数**:

| 函数 | 签名 | 说明 |
|------|------|------|
| `cn` | `(...inputs: ClassValue[]) => string` | clsx + tailwind-merge 合并类名 |

### 9.5 其他工具模块

| 文件 | 功能 |
|------|------|
| [todos.ts](file:///workspace/src/lib/todos.ts) | 待办事项工具函数（状态校验、日期处理、进度计算） |
| [transactions.ts](file:///workspace/src/lib/transactions.ts) | 交易记录格式化 |
| [contact-migration.ts](file:///workspace/src/lib/contact-migration.ts) | CRM 联系人数据库迁移 |
| [contact-regions.ts](file:///workspace/src/lib/contact-regions.ts) | 联系人地区序列化/反序列化 |
| [contact-groups.ts](file:///workspace/src/lib/contact-groups.ts) | CRM 分组工具 |
| [ledger-presentation.ts](file:///workspace/src/lib/ledger-presentation.ts) | 账本展示逻辑 |
| [ledger-selection.ts](file:///workspace/src/lib/ledger-selection.ts) | 账本选择逻辑 |
| [timeline-groups.ts](file:///workspace/src/lib/timeline-groups.ts) | 时间线分组逻辑 |

---

## 10. CLI 命令行工具

### 10.1 使用方式

```bash
npx tsx scripts/cli.ts [options] <command> [subcommand] [args]

# 全局选项
--token <TOKEN>     Agent Token 凭证
--api-base <URL>    API 服务地址（默认 http://localhost:5000）
```

### 10.2 命令列表

| 命令 | 子命令 | 功能 |
|------|--------|------|
| `ledger` | list/create/update/use/delete | 账本管理 |
| `tx` | add/list/update/delete | 收支记录 |
| `category` | list/add/update/delete | 分类管理 |
| `category-group` | list/add/update/delete | 分类分组管理 |
| `tag` | list/add/update/delete | 标签管理 |
| `stats` | - | 统计概览 |
| `team` | list/add/update/delete | 团队管理 |
| `todo` | list/add/update/done/delete | 待办管理 |
| `contact` | list/add/get/update/delete/log | CRM 联系人 |
| `group` | list/add/update/delete/add-member/remove-member | CRM 分组 |
| `event` | list/add/get/update/delete/add-participant/remove-participant | CRM 事件 |
| `relation` | list/add/delete | CRM 关联关系 |
| `graph` | - | 关系图谱数据 |
| `export` | ledger/contacts | 数据导出 |
| `guide` | - | CLI 接入引导 |

### 10.3 配置文件

CLI 使用 `.cli-config.json` 保存配置：

```json
{
  "activeLedgerId": 1,
  "agentToken": "xxx",
  "apiBase": "http://localhost:5000"
}
```

**位置**: [cli.ts](file:///workspace/scripts/cli.ts)

---

## 11. 运行方式

### 11.1 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

**开发脚本**: [dev.sh](file:///workspace/scripts/dev.sh)

### 11.2 生产构建

```bash
# 构建项目
pnpm build

# 启动生产服务器
pnpm start
```

**构建脚本**: [build.sh](file:///workspace/scripts/build.sh)
**启动脚本**: [start.sh](file:///workspace/scripts/start.sh)

### 11.3 Docker 部署

```bash
# 构建镜像
docker build -t team-management-assistant .

# 运行容器
docker run -p 5000:5000 -v ./data:/app/data team-management-assistant
```

**配置**:
- 数据库路径: `/app/data/ledger-crm.db`
- 端口: `5000`
- 数据卷: `/app/data`

### 11.4 测试

```bash
# 运行测试
pnpm test

# 类型检查
pnpm ts-check

# 代码检查
pnpm lint
```

---

## 12. 认证系统

### 12.1 认证流程

```
┌──────────────────────────────────────────────────────────┐
│                    认证流程                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  首次访问 → 检查是否初始化 → 初始化向导 → 创建管理员       │
│      │                         │                         │
│      │                         ▼                         │
│      │                   登录页面 → 验证密码              │
│      │                         │                         │
│      │                         ▼                         │
│      │                    返回 JWT Token                  │
│      │                         │                         │
│      │                         ▼                         │
│      │                   存储到 localStorage              │
│      │                         │                         │
│      ▼                         ▼                         │
│  后续请求 → Authorization: Bearer <token> → API 验证    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 12.2 双重认证

| 认证类型 | 用途 | 存储方式 |
|----------|------|----------|
| **Session Token** | 管理员登录 | localStorage `admin_token` |
| **Agent Token** | 外部程序接入 | 配置文件 `.cli-config.json` |

### 12.3 JWT 验证

- Token 存储在 localStorage
- 每次 API 请求自动携带 `Authorization: Bearer <token>`
- 服务端验证 Token 有效性
- 过期或无效时返回 401，前端自动清除 Token

### 12.4 API 安全

- 所有业务 API 需要认证
- 中间件检查认证状态
- 支持两种身份类型：`session` 和 `agent`
- Agent Token 有独立的权限控制

---

## 附录

### A. 默认分类模板

**支出分组**:
1. 日常办公（办公用品、快递物流、通讯费、打印复印）
2. 餐饮食品（员工餐补、商务宴请、下午茶、零食饮品）
3. 交通出行（差旅交通、打车出行、停车过路、车辆维保）
4. 营销推广（广告投放、活动策划、礼品赠品、物料制作）
5. 人力福利（薪资报酬、社保公积金、培训费、团建活动）
6. 租赁物业（办公租金、水电物业、装修维保）
7. 技术服务（云服务、软件订阅、外包开发、域名主机）
8. 其他支出（罚款赔偿、捐赠公益、杂项支出）

**收入分组**:
1. 经营收入（主营收入、服务收入、产品销售）
2. 财务收益（投资收益、利息收入）
3. 其他收入（补贴退税、违约赔偿、杂项收入）

### B. 待办状态流转

```
todo → doing → done
  │        │
  └────────┴→ canceled
```

### C. 数据备份策略

- **JSON 导出**: 支持全量数据导出，包含 CRM 数据
- **Git 备份**: 支持远程 Git 仓库自动备份
- **导入模式**: merge（合并）或 replace（替换）