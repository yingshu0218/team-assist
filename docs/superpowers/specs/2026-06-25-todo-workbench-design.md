# 待办工作台设计规格

日期：2026-06-25

## 背景

当前项目是单管理员使用的团队管理助手，已有账本、收支、分类标签、CRM、同步备份和 Token 鉴权能力。新功能希望引入类似滴答清单的待办管理，用来查看工作推进情况。

这里的“团队”不是多人协作系统，而是一个用于区分账本和待办事项的上下文字段。系统不引入成员、权限、分配人、评论、通知或多人协作。

## 目标

第一版建设一个清单优先的「待办工作台」：

- 让待办事项可以按团队/分组字段归类，也可以保持未归属。
- 让账本可以选择性归属到一个团队/分组，也可以保持未归属。
- 让待办可以选择性关联一个账本，用于凭证整理、回款跟进、分类检查等场景。
- 在一个页面里看到当前分组的任务数量、完成率、逾期情况和任务明细。
- 保持现有项目的 shadcn/ui、暖白内容区、深色侧边栏、翡翠绿主色的视觉语言。

## 非目标

第一版不做以下能力：

- 多用户团队管理。
- 成员、角色、权限、任务指派人。
- 评论、@提醒、通知中心。
- 复杂项目管理字段，例如工时、依赖、里程碑。
- 完整看板拖拽和完整日历排期。
- 与外部日历或消息系统同步。

## 产品范围

### 导航

侧边栏新增「待办事项」入口。它与「账目」「客户关系」「系统设置」并列，是单独的业务区域。

### 主页面结构

页面采用三段式布局：

1. 顶部标题区：显示「待办事项」、说明文案、`新建任务`、`新建分组`。
2. 中间工作区：左侧是团队/分组过滤和任务清单，右侧是选中任务详情。
3. 顶部统计区：显示当前筛选范围的今日待办、进行中、已完成、逾期和完成率。

### 分组过滤

分组过滤包含：

- 全部。
- 未归属，作为默认分组。
- 用户创建的团队/分组，例如市场项目、客户跟进、内部运营。

`team_id = null` 的账本和待办都归入未归属。未归属不是数据库中的真实团队记录，而是界面和查询层对空值的展示。

### 清单视图

第一版完整实现清单视图。任务按以下区段展示：

- 逾期。
- 今天。
- 未来。
- 无日期。
- 已完成。

每一行展示：

- 完成勾选框。
- 任务标题。
- 团队/分组标签；未归属时显示「未归属」。
- 可选关联账本标签。
- 优先级。
- 截止日期。
- 状态。

页面可展示「清单 / 看板 / 日历」切换入口，但第一版只有清单是完整功能。看板和日历可以显示为后续能力入口，避免第一版范围膨胀。

### 任务详情面板

右侧详情面板用于查看和编辑选中任务：

- 标题。
- 备注。
- 状态。
- 优先级。
- 截止日期。
- 团队/分组，可选择未归属。
- 关联账本，可选择无关联。
- checklist 子项。
- 创建时间和更新时间。

checklist 完成率用于展示单个任务内部进度。若任务没有 checklist，则任务进度由任务状态决定。

## 数据模型

### teams

团队/分组表，仅用于上下文归类。

字段：

- `id`
- `name`
- `color`
- `description`
- `sort_order`
- `created_at`
- `updated_at`

删除团队时：

- 关联账本的 `team_id` 置空。
- 关联待办的 `team_id` 置空。

### ledgers

现有账本表新增：

- `team_id`: nullable foreign key to `teams.id`

约束：

- 账本可以不归属团队。
- 一个账本最多归属一个团队。
- 删除团队时账本回到未归属。
- 删除账本时，关联到该账本的待办不删除，`ledger_id` 置空。

### todos

任务表。

字段：

- `id`
- `title`
- `notes`
- `status`: `todo` | `doing` | `done` | `canceled`
- `priority`: `low` | `medium` | `high` | `urgent`
- `due_date`
- `team_id`: nullable foreign key to `teams.id`
- `ledger_id`: nullable foreign key to `ledgers.id`
- `sort_order`
- `completed_at`
- `created_at`
- `updated_at`

约束：

- `team_id` 允许为空，空值展示为未归属。
- `ledger_id` 允许为空，表示该任务不关联账本。
- 设置状态为 `done` 时写入 `completed_at`。
- 从 `done` 改回其他状态时清空 `completed_at`。

### todo_checklist_items

任务 checklist 表。

字段：

- `id`
- `todo_id`
- `title`
- `is_done`
- `sort_order`
- `created_at`
- `updated_at`

删除任务时级联删除 checklist 子项。

## API 设计

所有业务 API 延续现有认证规则，支持管理员 session 和 Agent Token。

### 团队/分组

- `GET /api/teams`: 获取团队列表，包含每个团队的账本数量和待办数量。
- `POST /api/teams`: 创建团队。
- `PUT /api/teams/[id]`: 更新团队名称、颜色、描述、排序。
- `DELETE /api/teams/[id]`: 删除团队，并将关联账本和待办置为未归属。

### 待办

- `GET /api/todos`: 获取任务列表，支持 `team_id`、`ledger_id`、`status`、`search`、`due` 过滤。
- `POST /api/todos`: 创建任务。
- `GET /api/todos/[id]`: 获取任务详情，包含 checklist。
- `PUT /api/todos/[id]`: 更新任务。
- `DELETE /api/todos/[id]`: 删除任务。

### checklist

- `POST /api/todos/[id]/checklist`: 添加 checklist 子项。
- `PUT /api/todos/[id]/checklist/[itemId]`: 更新 checklist 子项。
- `DELETE /api/todos/[id]/checklist/[itemId]`: 删除 checklist 子项。

## CLI 设计

CLI 延续现有 `npx tsx scripts/cli.ts` 风格，并通过 HTTP API 调用。

### team

- `team list`
- `team add --name <name> [--color <color>] [--desc <desc>]`
- `team update <id> [--name <name>] [--color <color>] [--desc <desc>]`
- `team delete <id>`

### todo

- `todo list [--team <id|none>] [--ledger <id>] [--status <status>] [--search <keyword>]`
- `todo add --title <title> [--notes <notes>] [--team <id>] [--ledger <id>] [--due <YYYY-MM-DD>] [--priority <priority>]`
- `todo update <id> [--title <title>] [--notes <notes>] [--team <id|none>] [--ledger <id|none>] [--due <YYYY-MM-DD|none>] [--priority <priority>] [--status <status>]`
- `todo done <id>`
- `todo delete <id>`

## 前端组件边界

建议新增以下组件：

- `TodosView`: 待办工作台入口，负责页面级状态、筛选和数据请求。
- `TodoStatsCards`: 顶部统计卡片。
- `TodoTeamFilter`: 团队/分组过滤。
- `TodoList`: 清单区段和任务行。
- `TodoDetailPanel`: 右侧详情编辑。
- `TodoDialog`: 新建任务弹窗。
- `TeamDialog`: 新建/编辑团队弹窗。

这些组件应复用现有 shadcn/ui 组件、`use-data` 请求工具和项目主题变量。不要在 JSX 首屏渲染中使用会导致 hydration 不一致的动态值。

## 数据流

1. 用户进入「待办事项」。
2. 前端并行加载团队列表、账本列表和待办列表。
3. 默认筛选为全部，未归属作为一个虚拟过滤项。
4. 用户切换分组时，重新请求或本地过滤任务，并更新统计。
5. 用户选择任务时，右侧详情面板加载并展示任务详情。
6. 任务更新成功后刷新列表统计和详情。

## 错误处理

- 创建任务时标题必填，空标题在前端拦截，后端再次校验。
- 删除团队前提示：关联账本和待办会变为未归属。
- 删除账本后，待办中的账本关联自动置空，任务保留。
- API 返回现有项目风格的 `{ success, data, error }` 结构。
- 日期输入仅接受空值或 `YYYY-MM-DD`。

## 统计规则

当前筛选范围内：

- 今日待办：`due_date` 等于今天且状态不是 `done` 或 `canceled`。
- 进行中：状态为 `doing`。
- 已完成：状态为 `done`。
- 逾期：`due_date` 早于今天且状态不是 `done` 或 `canceled`。
- 完成率：`done / (todo + doing + done)`，排除 `canceled`。

单个任务 checklist 完成率：

- 有 checklist 时：已完成 checklist 数量 / checklist 总数。
- 无 checklist 时：任务状态为 `done` 视为 100%，其他状态视为 0%。

## 测试策略

第一版实现后需要验证：

- TypeScript 类型检查通过。
- 新增 schema、类型和 API 路由没有隐式 `any` 或 `as any`。
- 团队删除后账本和待办正确回到未归属。
- 账本删除后关联待办保留且 `ledger_id` 置空。
- 任务状态切换正确维护 `completed_at`。
- 清单筛选、统计和详情面板能同步更新。
- CLI 的 team/todo 命令能通过 Token 认证调用 API。

## 后续扩展

第一版稳定后可继续扩展：

- 完整看板视图，支持拖拽改变状态。
- 日历视图，按截止日期查看任务。
- 周/月复盘视图。
- 任务模板。
- 与 CRM 联系人或事件建立可选关联。
- 更细的导出和统计报表。

## 已确认决策

- 用户始终只有一个管理员。
- 团队不是成员系统，只是字段。
- 账本可以未归属，一个账本最多归属一个团队。
- 待办允许未归属，未归属是默认分组。
- 第一版采用清单优先，不做完整多人协作和复杂项目管理。
