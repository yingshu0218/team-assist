# 团队管理助手

支持多账本管理、收支记录、分类标签分组、客户关系管理（CRM）、数据统计与可视化的全栈 Web 应用，同时提供 CLI 命令行工具和 Agent 接入能力。概览按当前选中账本独立展示，支持亮色/暗色主题和 Git 数据备份。

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript 5 (strict) |
| UI 组件 | shadcn/ui (基于 Radix UI) |
| 样式 | Tailwind CSS 4 |
| 数据库 | SQLite (better-sqlite3 + Drizzle ORM) |
| 图表 | Recharts |
| 主题 | next-themes |
| CLI | Commander 风格 (`scripts/cli.ts`)，使用 `npx tsx` 运行 |

## 快速开始

### 启动开发服务器

```bash
pnpm dev
```

启动后，在浏览器中打开 [http://localhost:5000](http://localhost:5000) 查看应用。开发服务器支持热更新，修改代码后页面会自动刷新。

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

## 核心功能

### 1. 多账本管理

每个账本是一个独立的团队记账空间，互不干扰。

- 创建、编辑、删除账本（可设置名称、描述、初始余额、币种）
- 在侧边栏快速切换账本，所有页面数据跟随切换
- 创建账本时自动初始化预设分类分组和分类

### 2. 收支记录

- 添加收入/支出记录：金额、分类、标签、日期、备注
- 编辑、删除已有记录
- 收支明细页支持按类型（收入/支出）、分类、日期范围筛选
- 交易列表显示分类图标和标签颜色标记

### 3. 分类分组管理

分类按分组组织，预设公司常用消费类别：

**支出分组（8 组）**

| 分组 | 包含分类 |
|------|---------|
| 日常办公 | 办公用品、快递物流、通讯费、打印复印 |
| 餐饮食品 | 员工餐补、商务宴请、下午茶、零食饮品 |
| 交通出行 | 差旅交通、打车出行、停车过路、车辆维保 |
| 营销推广 | 广告投放、活动策划、礼品赠品、物料制作 |
| 人力福利 | 薪资报酬、社保公积金、培训费、团建活动 |
| 租赁物业 | 办公租金、水电物业、装修维保 |
| 技术服务 | 云服务、软件订阅、外包开发、域名主机 |
| 其他支出 | 罚款赔偿、捐赠公益、杂项支出 |

**收入分组（3 组）**

| 分组 | 包含分类 |
|------|---------|
| 经营收入 | 主营收入、服务收入、产品销售 |
| 财务收益 | 投资收益、利息收入 |
| 其他收入 | 补贴退税、违约赔偿、杂项收入 |

- 支持创建、编辑、删除自定义分组
- 支持在分组下创建、编辑、删除分类
- 删除分组时，其下分类自动归入「未分组」（ON DELETE SET NULL）

### 4. 标签管理

- 创建、编辑、删除标签（可设置颜色）
- 标签用于对交易记录进行多维度标记
- 一条交易可关联多个标签

### 5. 数据统计与可视化

概览页按当前选中账本独立展示：

- **统计卡片**：总收入、总支出、净收支、实际余额（含初始余额）、交易笔数
- **收支趋势图**：折线图展示每日收入和支出趋势
- **分类占比图**：饼图展示各分类支出占比
- **最近交易**：展示最近 5 条交易记录

### 6. 亮色/暗色主题

- 支持亮色、暗色、跟随系统三种主题模式
- 侧边栏顶部主题切换按钮，一键切换
- 翡翠绿主色调贯穿两套主题
- 主题切换无过渡闪烁

### 7. 数据同步与备份

#### 本地备份

- **导出**：将全部数据导出为 JSON 文件
- **合并导入**：保留现有数据并添加新数据
- **替换导入**：清空现有数据后导入（谨慎操作）

#### Git 远程备份

- 支持 **GitHub** 和 **Gitea** 两种 Git 服务商
- 配置仓库地址、分支、访问令牌、用户信息后即可推送/拉取
- 推送时自动从 API 导出最新数据并 commit + push
- 拉取时自动从仓库读取备份数据并合并到数据库

#### 自动同步

- 开启后按设定间隔（5分钟 ~ 12小时）自动推送数据到 Git 仓库
- 配置存储在浏览器 localStorage 中

### 8. CLI 命令行工具

```bash
# 账本管理
npx tsx scripts/cli.ts ledger list                              # 列出所有账本
npx tsx scripts/cli.ts ledger create --name <名称> [--desc <描述>]  # 创建账本
npx tsx scripts/cli.ts ledger use <id>                           # 切换当前账本
npx tsx scripts/cli.ts ledger delete <id>                        # 删除账本

# 交易管理
npx tsx scripts/cli.ts tx add --amount <金额> --type <income|expense> [--category <分类名>] [--desc <描述>]
npx tsx scripts/cli.ts tx list [--type <income|expense>] [--limit <数量>]
npx tsx scripts/cli.ts tx delete <id>

# 分类管理
npx tsx scripts/cli.ts category list
npx tsx scripts/cli.ts category add --name <名称> --type <income|expense> [--color <颜色>]

# 标签管理
npx tsx scripts/cli.ts tag list
npx tsx scripts/cli.ts tag add --name <名称> [--color <颜色>]

# 统计
npx tsx scripts/cli.ts stats
```

CLI 配置文件 `.cli-config.json` 保存当前激活的账本 ID，已被 .gitignore 忽略。

## 技术架构

### 语言与运行时

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 编程语言 | TypeScript | 5.x (strict) | 全栈统一语言，`tsconfig.json` 启用 `strict: true` |
| 运行时 | Node.js | 24.x | 服务端运行环境 |
| 包管理 | pnpm | 9.x | **严禁使用 npm 或 yarn**，`package.json` 配置 `preinstall` 校验 |

### 前端框架与库

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 全栈框架 | Next.js | 16.x | App Router 模式，RSC + Client Components |
| UI 核心 | React | 19.x | 服务端组件 + 客户端交互 |
| 组件库 | shadcn/ui | latest | 基于 Radix UI 原语，`src/components/ui/` 目录下 |
| 样式方案 | Tailwind CSS | 4.x | 工具类优先，`globals.css` 中定义 CSS 变量双主题 |
| 主题管理 | next-themes | 0.4.x | 亮色/暗色/系统三模式，`ThemeProvider` 包裹 |
| 图表可视化 | Recharts | 2.15.x | 折线图（收支趋势）+ 饼图（分类占比） |
| 图标 | lucide-react | 0.468.x | 统一图标库，Tree-shakable |
| 日期处理 | date-fns | 4.x | 轻量级日期格式化与计算 |
| 表单 | react-hook-form | 7.x | 高性能表单管理 |
| 校验 | Zod | 4.x | Schema 校验，配合 react-hook-form |
| 弹窗/抽屉 | Radix UI Dialog/Vaul | — | 无障碍交互原语 |
| 通知 | Sonner | 2.x | Toast 通知 |

### 后端与数据库

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 数据库 | Supabase (PostgreSQL) | — | 托管 PostgreSQL，`@supabase/supabase-js` 2.95.x |
| ORM | Drizzle ORM | 0.45.x | 类型安全 ORM，`shared/schema.ts` 定义表结构 |
| 数据库初始化 | 应用启动时自动执行 | — | `sqlite-client.ts` 创建缺失表和索引 |
| 数据库驱动 | better-sqlite3 | 12.x | 本地 SQLite 驱动 |
| API 路由 | Next.js Route Handlers | — | `src/app/api/` 目录，每个路由 `route.ts` 导出 GET/POST 等 |
| Git 操作 | child_process (git) | — | 通过 `execSync` 调用系统 git 命令，支持 GitHub/Gitea |
| CLI | Commander 风格 | — | `scripts/cli.ts`，通过 `npx tsx` 运行 |

### 构建与部署

| 类别 | 技术 | 说明 |
|------|------|------|
| 构建工具 | Next.js 内置 (Turbopack) | `next build`，`scripts/build.sh` 封装 |
| 开发服务器 | `next dev` | 端口从 `DEPLOY_RUN_PORT` 环境变量读取，默认 5000 |
| 生产服务器 | `next start` | `scripts/start.sh` 封装 |
| 运行环境 | Node.js / Docker | 通过环境变量配置端口和数据目录 |

### 关键配置文件

| 文件 | 说明 |
|------|------|
| `tsconfig.json` | TypeScript 配置，`strict: true`，路径别名 `@/*` → `./src/*` |
| `next.config.ts` | Next.js 配置，启用 standalone 部署输出和远程图片允许 |
| `package.json` | 依赖声明、脚本定义、pnpm 引擎约束 |

## 项目结构

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
│   │   ├── api/            # API 路由 (ledgers, transactions, categories, category-groups, tags, stats, sync)
│   │   ├── globals.css     # 全局样式
│   │   ├── layout.tsx      # 根布局
│   │   └── page.tsx        # 主页面 (含 tab 切换)
│   ├── components/
│   │   ├── ui/             # shadcn/ui 组件库
│   │   ├── app-sidebar.tsx       # 侧边栏 (账本管理 + 导航 + 主题切换)
│   │   ├── dashboard-view.tsx   # 概览页 (统计卡片 + 图表)
│   │   ├── transactions-view.tsx # 收支明细页
│   │   ├── categories-view.tsx  # 分类管理页 (分组折叠)
│   │   ├── tags-view.tsx        # 标签管理页
│   │   ├── transaction-dialog.tsx # 交易录入/编辑弹窗
│   │   ├── stat-cards.tsx       # 统计卡片组件
│   │   ├── overview-charts.tsx  # 图表可视化组件
│   │   ├── sync-settings-view.tsx # 同步与备份设置页
│   │   ├── help-dialog.tsx      # 使用说明弹窗
│   │   ├── theme-provider.tsx   # 主题 Provider
│   │   └── theme-toggle.tsx     # 主题切换按钮
│   ├── hooks/
│   │   ├── use-ledger.tsx  # 账本状态管理 (Context + Provider)
│   │   └── use-data.ts     # 数据请求 hooks (useFetch, apiPost, apiPut, apiDelete)
│   ├── lib/
│   │   ├── types.ts        # 共享类型定义
│   │   ├── constants.ts    # 常量 (分类颜色、图标映射、格式化函数)
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── storage/
│       └── database/
│           ├── supabase-client.ts  # Supabase 客户端
│           └── shared/schema.ts    # Drizzle ORM Schema
├── DESIGN.md               # 设计规范文档
├── AGENTS.md               # 项目规范文档
└── next.config.ts
```

## 数据库 Schema

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `ledgers` | 账本 | id, name, description, currency, initial_balance, is_active |
| `category_groups` | 分类分组 | id, ledger_id, name, type(income/expense), icon, sort_order |
| `categories` | 分类 | id, ledger_id, group_id, name, type(income/expense), icon, color, sort_order |
| `tags` | 标签 | id, ledger_id, name, color |
| `transactions` | 交易记录 | id, ledger_id, category_id, amount, type, description, transaction_date, tag_ids |

- 创建账本时自动初始化默认分组和分类（按公司常用消费类别）
- 删除分组时其下分类自动变为未分组（ON DELETE SET NULL）
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
| `/api/sync` | GET/POST | 数据导出(JSON)/导入(merge或replace模式) |
| `/api/sync/git` | GET/POST | Git备份状态查询/配置/推送/拉取 |

## 包管理

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

```bash
pnpm install          # 安装所有依赖
pnpm add <package>    # 安装依赖
pnpm add -D <package> # 安装开发依赖
pnpm remove <package> # 移除依赖
```

## 开发者指南

### 本地开发

```bash
# 安装依赖（仅 pnpm）
pnpm install

# 启动开发服务器（支持热更新）
pnpm dev

# 类型检查
pnpm ts-check

# 代码规范检查
pnpm lint

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 新增页面/功能的标准流程

1. **数据库层**：在 `src/storage/database/shared/schema.ts` 中定义 Drizzle 表结构
2. **数据库初始化**：应用启动时会创建缺失的 SQLite 表和索引
4. **类型定义**：在 `src/lib/types.ts` 中添加/更新 TypeScript 接口
5. **API 路由**：在 `src/app/api/` 下创建 `route.ts`，导出 GET/POST/PUT/DELETE
6. **数据 Hook**：使用 `useFetch` / `apiPost` / `apiPut` / `apiDelete`（来自 `src/hooks/use-data.ts`）
7. **前端组件**：在 `src/components/` 下创建页面组件，使用 shadcn/ui 组件
8. **页面集成**：在 `src/app/page.tsx` 中添加 Tab 或路由
9. **CLI 扩展**：在 `scripts/cli.ts` 中添加对应命令

### API 路由约定

- 所有 API 返回 `{ success: boolean, data?: T, error?: string }` 格式
- 列表接口支持 `ledger_id` 查询参数过滤数据
- 使用 `getSupabaseClient()` 获取数据库客户端
- POST/PUT 请求体从 `request.json()` 解析
- 错误返回 HTTP 状态码 + `{ success: false, error: "描述" }`

### 前端组件约定

- 页面级组件以 `-view.tsx` 结尾（如 `dashboard-view.tsx`）
- 使用 `'use client'` 声明客户端组件
- 通过 `useLedger()` Hook 获取当前活跃账本
- 主题感知：使用 CSS 变量（`--background`, `--foreground`, `--primary` 等）
- 图标统一使用 `lucide-react`

### 数据库操作约定

- 使用 Drizzle ORM 构建查询（`eq`, `and`, `desc`, `sql` 等）
- 交易查询通过 `sql` 模板进行 JOIN 和聚合
- 所有表使用 `serial()` 自增主键
- 外键关系：`categories.group_id → category_groups.id`（SET NULL）、`*.ledger_id → ledgers.id`（CASCADE）

## Changelog

### v1.4.0

- README.md 新增技术架构、开发者指南章节
- 使用说明弹窗新增「技术文档」分区（技术栈/架构/数据库/开发指南）
- 方便后续衍生开发调阅技术信息

### v1.3.0

- 新增「使用说明」弹窗组件，设置页独立按钮点击弹出
- 新增 README.md 详细项目文档
- 弹窗内含功能说明、操作指南和版本更新记录

### v1.2.0

- 新增分类分组功能（category_groups 表）
- 预设公司常用消费类别：支出 8 组 + 收入 3 组，共 11 组 30+ 分类
- 分类管理页重构为分组折叠展示
- 交易弹窗分类选择按分组分区展示
- 删除分组时分类自动归入「未分组」

### v1.1.0

- 新增亮色/暗色主题切换（next-themes + CSS 变量双主题）
- 新增数据同步功能：本地导出/导入（JSON）
- 新增 Git 远程备份：支持 GitHub 和 Gitea
- 新增自动同步：定时推送数据到 Git 仓库
- 新增同步与备份设置页面

### v1.0.0

- 初始版本发布
- 多账本管理：创建、切换、删除独立账本
- 收支记录：添加、编辑、删除交易记录
- 分类管理：自定义分类（颜色、图标）
- 标签管理：自定义标签（颜色）
- 数据统计：收支汇总、分类占比、日趋势
- 可视化：统计卡片 + 折线图 + 饼图
- CLI 命令行工具：账本/交易/分类/标签/统计操作
- Supabase 数据库，RLS 行级安全策略
