# 项目上下文

## 项目概述

团队管理助手 — 支持多账本管理、收支记录、分类标签、客户关系管理（CRM）、数据统计与可视化的全栈 Web 应用，同时集成 CRM 子系统（联系人管理、分组、事件/项目、关联关系网络、图谱可视化），并提供 CLI 命令行工具和 Token 鉴权。概览按当前选中账本独立展示，支持亮色/暗色主题和 Git 数据备份。系统需管理员登录后方可使用，外部 Agent 可通过 Token 凭证调用 CLI 或 API。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: SQLite (better-sqlite3 + Drizzle ORM)，通过 `src/storage/database/sqlite-client.ts` 访问
- **图表**: Recharts + react-force-graph-2d (关系图谱)
- **CLI**: Commander 风格命令行工具 (`scripts/cli.ts`)，使用 `npx tsx` 运行，通过 HTTP API 远程调用
- **部署**: Docker + Nginx 反向代理，SQLite 数据持久化 + Git 远程备份

## 目录结构

```
├── public/                 # 静态资源
├── scripts/
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   ├── start.sh            # 生产环境启动脚本
│   └── cli.ts              # CLI 命令行工具入口
├── src/
│   ├── app/
│   │   ├── api/            # API 路由 (ledgers, transactions, categories, category-groups, tags, stats, sync, crm/*, auth/*)
│   │   ├── globals.css     # 全局样式
│   │   ├── layout.tsx      # 根布局
│   │   └── page.tsx        # 主页面 (含 tab 切换 + 认证门控)
│   ├── components/
│   │   ├── ui/             # shadcn/ui 组件库
│   │   ├── app-sidebar.tsx # 侧边栏 (两大类: 账目/客户关系 + 系统设置)
│   │   ├── auth-gate.tsx           # 认证门控组件 (初始化/登录)
│   │   ├── auth-settings-view.tsx  # 系统设置 (Agent Token 管理)
│   │   ├── dashboard-view.tsx       # 概览页 (统计卡片 + 图表)
│   │   ├── transactions-view.tsx    # 收支明细页
│   │   ├── categories-view.tsx      # 分类管理页
│   │   ├── tags-view.tsx            # 标签管理页
│   │   ├── transaction-dialog.tsx   # 交易录入/编辑弹窗
│   │   ├── stat-cards.tsx           # 统计卡片组件
│   │   ├── overview-charts.tsx      # 图表可视化组件
│   │   ├── sync-settings-view.tsx   # 同步与备份设置页
│   │   ├── help-dialog.tsx       # 使用说明弹窗 (功能说明 + changelog)
│   │   ├── theme-provider.tsx       # 主题 Provider (next-themes)
│   │   └── theme-toggle.tsx         # 主题切换按钮组件
│   ├── components/crm/
│   │   ├── crm-contacts-view.tsx    # CRM 联系人管理页
│   │   ├── crm-groups-view.tsx      # CRM 分组管理页
│   │   ├── crm-events-view.tsx      # CRM 事件/项目管理页
│   │   ├── crm-relationships-view.tsx # CRM 关联关系管理页
│   │   └── crm-graph-view.tsx        # CRM 关系图谱可视化页
│   ├── hooks/
│   │   ├── use-ledger.tsx  # 账本状态管理 (Context + Provider)
│   │   ├── use-data.ts     # 数据请求 hooks (useFetch, apiPost, apiPut, apiDelete) — 自动携带 Auth Token
│   │   └── use-auth.tsx    # 认证状态管理 (登录/初始化/登出)
│   ├── lib/
│   │   ├── types.ts        # 共享类型定义
│   │   ├── constants.ts    # 常量 (分类颜色、图标映射、格式化函数)
│   │   ├── auth.ts         # 认证工具 (JWT/密码哈希/请求验证)
│   │   ├── utils.ts        # 通用工具函数 (cn)
│   │   └── middleware.ts    # Next.js 中间件 (API 认证检查)
│   └── storage/
│       └── database/
│           ├── sqlite-client.ts    # SQLite 客户端 (better-sqlite3 + Drizzle ORM)
│           └── shared/schema.ts    # Drizzle ORM Schema
├── nginx/                  # Nginx 反向代理配置
│   └── nginx.conf
├── Dockerfile              # Docker 镜像构建
├── docker-compose.yml      # Docker Compose 编排
├── DESIGN.md               # 设计规范文档
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 数据库 Schema

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `ledgers` | 账本 | id, name, description, currency, initial_balance, is_active |
| `category_groups` | 分类分组 | id, ledger_id, name, type(income/expense), icon, sort_order |
| `categories` | 分类 | id, ledger_id, group_id, name, type(income/expense), icon, color, sort_order |
| `tags` | 标签 | id, ledger_id, name, color |
| `transactions` | 交易记录 | id, ledger_id, category_id, amount, type, description, transaction_date, tag_ids |
| `crm_contacts` | CRM联系人 | id, ledger_id, name, phone, company, notes |
| `crm_contact_logs` | CRM联系记录 | id, contact_id, content, log_date |
| `crm_groups` | CRM分组 | id, ledger_id, name, color, description |
| `crm_group_members` | CRM分组成员 | id, group_id, contact_id |
| `crm_events` | CRM事件/项目 | id, ledger_id, title, type(event/project) |
| `crm_event_participants` | CRM事件参与者 | id, event_id, contact_id, role |
| `crm_relationships` | CRM关联关系 | id, ledger_id, source_type, source_id, target_type, target_id, label |
| `admin_accounts` | 管理员账号 | id, username, password_hash |
| `agent_tokens` | Agent调用凭证 | id, name, token_hash, token_prefix, is_active, last_used_at |

- 创建账本时自动初始化默认分组和分类（按公司常用消费类别：日常办公/餐饮食品/交通出行/营销推广/人力福利/租赁物业/技术服务/其他支出 + 经营收入/财务收益/其他收入）
- 删除分组时其下分类自动变为未分组（ON DELETE SET NULL）
- CRM 表通过 ledger_id 关联账本，删除账本时级联删除所有 CRM 数据（ON DELETE CASCADE）
- CRM 分组删除时级联清理成员关系（ON DELETE CASCADE）
- CRM 联系人删除时级联清理联系记录、分组成员、事件参与者（ON DELETE CASCADE）
- RLS 已启用，公开访问策略用于开发环境

## API 路由

| 路径 | 方法 | 功能 |
|------|------|------|
| `/api/ledgers` | GET/POST | 账本列表/创建 |
| `/api/ledgers/[id]` | GET/PUT/DELETE | 账本详情/编辑/删除 |
| `/api/categories` | GET/POST | 分类列表/创建（支持 group_id 关联） |
| `/api/categories/[id]` | PUT/DELETE | 分类编辑/删除 |
| `/api/category-groups` | GET/POST | 分类分组列表/创建 |
| `/api/category-groups/[id]` | PUT/DELETE | 分类分组编辑/删除 |
| `/api/transactions` | GET/POST | 交易列表/创建 |
| `/api/transactions/[id]` | PUT/DELETE | 交易编辑/删除 |
| `/api/tags` | GET/POST | 标签列表/创建 |
| `/api/tags/[id]` | PUT/DELETE | 标签编辑/删除 |
| `/api/stats` | GET | 统计数据 (收入/支出/分类/趋势) |
| `/api/sync` | GET/POST | 数据导出(JSON,含CRM)/导入(merge或replace模式) |
| `/api/sync/git` | GET/POST | Git备份状态查询/配置/推送/拉取 |
| `/api/crm/contacts` | GET/POST | CRM联系人列表/创建(支持search关键词搜索、group_id分组过滤) |
| `/api/crm/contacts/[id]` | GET/PUT/DELETE | CRM联系人详情(聚合logs/groups/events/relationships)/编辑/删除 |
| `/api/crm/contacts/[id]/logs` | GET/POST | CRM联系记录列表/添加 |
| `/api/crm/groups` | GET/POST | CRM分组列表/创建 |
| `/api/crm/groups/[id]` | GET/PUT/DELETE | CRM分组编辑/删除 |
| `/api/crm/groups/[id]/members` | POST/DELETE | CRM分组成员添加/移除 |
| `/api/crm/events` | GET/POST | CRM事件/项目列表/创建(支持type筛选、search搜索) |
| `/api/crm/events/[id]` | GET/PUT/DELETE | CRM事件详情(聚合participants)/编辑/删除 |
| `/api/crm/events/[id]/participants` | POST/DELETE | CRM事件参与者添加/移除 |
| `/api/crm/relationships` | GET/POST | CRM关联关系列表/创建 |
| `/api/crm/relationships/[id]` | DELETE | CRM关联关系删除 |
| `/api/crm/graph` | GET | CRM图谱数据(力导向图节点+边) |
| `/api/auth/check` | GET | 检查认证状态(是否初始化/是否已登录) |
| `/api/auth/init` | POST | 首次初始化管理员账号 |
| `/api/auth/login` | POST | 管理员登录(返回JWT) |
| `/api/auth/agent` | GET/POST | Agent Token列表/创建(需管理员认证) |
| `/api/auth/agent/[id]` | DELETE | 撤销Agent Token(需管理员认证) |
| `/api/auth/guide` | GET | Agent接入引导(需Agent Token认证) |

## CLI 使用

```bash
npx tsx scripts/cli.ts <command> [options]

# 账本命令
npx tsx scripts/cli.ts ledger list
npx tsx scripts/cli.ts ledger create --name <name> [--desc <desc>]
npx tsx scripts/cli.ts ledger get <id>
npx tsx scripts/cli.ts ledger update <id> [--name <name>] [--desc <desc>] [--currency <currency>] [--initial-balance <amount>] [--active <true|false>]
npx tsx scripts/cli.ts ledger use <id>

# 收支记录命令
npx tsx scripts/cli.ts tx add --amount <n> --type <income|expense> [--category <name>] [--desc <desc>]
npx tsx scripts/cli.ts tx list [--type <income|expense>] [--limit <n>]
npx tsx scripts/cli.ts tx update <id> [--amount <n>] [--type <income|expense>] [--category <name>] [--desc <desc>]

# 分类分组命令
npx tsx scripts/cli.ts category-group list
npx tsx scripts/cli.ts category-group add --name <n> --type <income|expense> [--icon <icon>]
npx tsx scripts/cli.ts category-group update <id> [--name <n>] [--icon <icon>]
npx tsx scripts/cli.ts category-group delete <id>

# 分类命令
npx tsx scripts/cli.ts category list
npx tsx scripts/cli.ts category add --name <n> --type <income|expense> [--group <group_id>] [--icon <icon>] [--color <color>]
npx tsx scripts/cli.ts category update <id> [--name <n>] [--icon <icon>] [--color <color>]
npx tsx scripts/cli.ts category delete <id>

# 标签命令
npx tsx scripts/cli.ts tag list
npx tsx scripts/cli.ts tag add --name <n> [--color <color>]
npx tsx scripts/cli.ts tag update <id> [--name <n>] [--color <color>]
npx tsx scripts/cli.ts tag delete <id>

# 统计命令
npx tsx scripts/cli.ts stats

# CRM 联系人命令
npx tsx scripts/cli.ts contact list [--search <keyword>]
npx tsx scripts/cli.ts contact add --name <n> [--phone <p>] [--company <c>] [--notes <n>]
npx tsx scripts/cli.ts contact get <id>
npx tsx scripts/cli.ts contact update <id> [--name <n>] [--phone <p>] [--company <c>] [--notes <n>]
npx tsx scripts/cli.ts contact delete <id>
npx tsx scripts/cli.ts contact log <id> --content <内容>

# CRM 分组命令
npx tsx scripts/cli.ts group list
npx tsx scripts/cli.ts group add --name <n> [--color <c>] [--desc <d>]
npx tsx scripts/cli.ts group update <id> [--name <n>] [--color <c>] [--desc <d>]
npx tsx scripts/cli.ts group delete <id>
npx tsx scripts/cli.ts group add-member <id> --contact <cid>
npx tsx scripts/cli.ts group remove-member <id> --contact <cid>

# CRM 事件/项目命令
npx tsx scripts/cli.ts event list [--type <event|project>]
npx tsx scripts/cli.ts event add --title <t> --type <event|project>
npx tsx scripts/cli.ts event get <id>
npx tsx scripts/cli.ts event update <id> [--title <t>]
npx tsx scripts/cli.ts event delete <id>
npx tsx scripts/cli.ts event add-participant <id> --contact <cid> [--role <r>]
npx tsx scripts/cli.ts event remove-participant <id> --contact <cid>

# CRM 关联关系命令
npx tsx scripts/cli.ts relation list
npx tsx scripts/cli.ts relation add --source-type <contact|event> --source-id <id> --target-type <contact|event> --target-id <id> [--label <l>]
npx tsx scripts/cli.ts relation delete <id>

# CRM 图谱命令
npx tsx scripts/cli.ts graph


# 导出命令
npx tsx scripts/cli.ts export ledger <id> [--format csv|json] [--period all|month|year|custom] [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>]
npx tsx scripts/cli.ts export contacts [--format csv|json]
```

### Agent CLI 使用

```bash
# 使用 --token 参数传入 Agent 凭证
npx tsx scripts/cli.ts --token <AGENT_TOKEN> --api-base <URL> <command> [options]

# 查看 Agent 接入引导
npx tsx scripts/cli.ts --token <AGENT_TOKEN> --api-base <URL> guide

# 通过自然语言描述添加关联关系示例
npx tsx scripts/cli.ts --token <TOKEN> --api-base <URL> relation add --source-type contact --source-id 1 --target-type contact --target-id 2 --label "同事"
```

CLI 配置文件 `.cli-config.json` 保存当前激活的账本 ID、Agent Token 和 API 地址，已被 .gitignore 忽略。
CLI 通过 HTTP API 远程调用，无需直接访问数据库。

## 认证系统

### 管理员认证
- 首次使用需通过 `/api/auth/init` 或前端初始化向导设置管理员账号密码
- 登录后返回 JWT Token，前端存储在 localStorage 中
- 所有业务 API 需要认证：`Authorization: Bearer <token>`
- 认证支持两种身份：`session`（管理员登录）和 `agent`（Agent Token）

### Agent Token
- 管理员可在"系统设置"中创建/撤销 Agent Token
- Token 格式：64 字符十六进制字符串
- Agent Token 用于外部程序/Agent 接入系统
- Agent 连入后可访问 `/api/auth/guide` 获取完整 CLI 命令说明
- CLI 通过 `--token` 参数传入 Agent Token

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
