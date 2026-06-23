"use client";

import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface HelpSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: HelpSection[] = [
  {
    id: "overview",
    title: "功能概览",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>团队管理助手是一款支持多团队账本管理与客户关系管理的工具，主要功能包括：</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong>多账本管理</strong>：创建多个独立账本，按团队隔离数据</li>
          <li><strong>收支记录</strong>：录入收入/支出，关联分类和标签</li>
          <li><strong>分类分组</strong>：预设公司常用消费类别，支持自定义分组</li>
          <li><strong>标签管理</strong>：多维度标记交易记录</li>
          <li><strong>数据统计</strong>：收支汇总、分类占比、趋势可视化</li>
          <li><strong>主题切换</strong>：亮色/暗色/跟随系统</li>
          <li><strong>数据备份</strong>：本地导出/导入 + Git 远程备份</li>
          <li><strong>CLI 工具</strong>：命令行方式操作记账</li>
        </ul>
      </div>
    ),
  },
  {
    id: "ledger",
    title: "账本管理",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>每个账本是一个独立的团队记账空间，所有数据互不干扰。</p>
        <p><strong>操作方式：</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>在左侧侧边栏顶部管理账本</li>
          <li>点击「创建账本」按钮，填写名称、描述等信息</li>
          <li>点击账本名称快速切换，所有页面数据跟随切换</li>
          <li>账本名称右侧菜单可编辑或删除账本</li>
        </ul>
        <p className="text-muted-foreground">创建账本时会自动初始化预设的分类分组和分类，无需手动配置。</p>
      </div>
    ),
  },
  {
    id: "transactions",
    title: "收支记录",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p><strong>添加交易：</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>点击「记一笔」按钮打开交易录入弹窗</li>
          <li>选择类型（收入/支出）、填写金额</li>
          <li>选择分类（按分组排列）、选择标签（可多选）</li>
          <li>填写日期和备注</li>
        </ul>
        <p><strong>编辑/删除：</strong>在收支明细页点击交易记录右侧的菜单按钮</p>
        <p><strong>筛选：</strong>支持按类型、分类、日期范围筛选交易列表</p>
      </div>
    ),
  },
  {
    id: "categories",
    title: "分类分组",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>分类按分组组织，系统预设了公司常用消费类别：</p>
        <p><strong>支出分组（8 组）：</strong></p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>日常办公：办公用品、快递物流、通讯费、打印复印</li>
          <li>餐饮食品：员工餐补、商务宴请、下午茶、零食饮品</li>
          <li>交通出行：差旅交通、打车出行、停车过路、车辆维保</li>
          <li>营销推广：广告投放、活动策划、礼品赠品、物料制作</li>
          <li>人力福利：薪资报酬、社保公积金、培训费、团建活动</li>
          <li>租赁物业：办公租金、水电物业、装修维保</li>
          <li>技术服务：云服务、软件订阅、外包开发、域名主机</li>
          <li>其他支出：罚款赔偿、捐赠公益、杂项支出</li>
        </ul>
        <p><strong>收入分组（3 组）：</strong>经营收入、财务收益、其他收入</p>
        <p><strong>自定义操作：</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>创建、编辑、删除自定义分组</li>
          <li>在分组下创建、编辑、删除分类</li>
          <li>删除分组时，其下分类自动归入「未分组」</li>
        </ul>
      </div>
    ),
  },
  {
    id: "stats",
    title: "数据统计",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>概览页按当前选中账本独立展示统计数据：</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong>统计卡片</strong>：总收入、总支出、净收支、实际余额（含初始余额）、交易笔数</li>
          <li><strong>收支趋势图</strong>：折线图展示每日收入和支出趋势</li>
          <li><strong>分类占比图</strong>：饼图展示各分类支出占比</li>
          <li><strong>最近交易</strong>：展示最近 5 条交易记录</li>
        </ul>
      </div>
    ),
  },
  {
    id: "theme",
    title: "主题切换",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>支持三种主题模式：</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong>亮色</strong>：暖白底色 + 翡翠绿主色</li>
          <li><strong>暗色</strong>：深墨蓝底色 + 翡翠绿（提亮）</li>
          <li><strong>跟随系统</strong>：自动匹配操作系统设置</li>
        </ul>
        <p>在侧边栏顶部点击主题图标即可切换。</p>
      </div>
    ),
  },
  {
    id: "backup",
    title: "数据备份与同步",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p><strong>本地备份：</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>导出：将全部数据导出为 JSON 文件</li>
          <li>合并导入：保留现有数据并添加新数据</li>
          <li>替换导入：清空现有数据后导入（谨慎操作）</li>
        </ul>
        <p><strong>Git 远程备份（GitHub / Gitea）：</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>选择 Git 服务商，填写仓库地址、分支、访问令牌</li>
          <li>保存配置后可推送备份数据到远程仓库</li>
          <li>拉取可从远程仓库恢复数据到本地</li>
        </ul>
        <p><strong>自动同步：</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>开启后按设定间隔自动推送数据到 Git</li>
          <li>间隔可选：5 分钟 ~ 12 小时</li>
        </ul>
      </div>
    ),
  },
  {
    id: "cli",
    title: "CLI 命令行工具",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>通过命令行操作团队管理助手：</p>
        <pre className="rounded bg-muted p-3 text-xs overflow-x-auto"><code>{`# 账本管理
npx tsx scripts/cli.ts ledger list
npx tsx scripts/cli.ts ledger create --name "研发团队" --desc "研发部门账本"
npx tsx scripts/cli.ts ledger use <id>
npx tsx scripts/cli.ts ledger delete <id>

# 交易管理
npx tsx scripts/cli.ts tx add --amount 50 --type expense --category "餐饮" --desc "午餐"
npx tsx scripts/cli.ts tx list --type expense --limit 10
npx tsx scripts/cli.ts tx delete <id>

# 分类与标签
npx tsx scripts/cli.ts category list
npx tsx scripts/cli.ts category add --name "差旅" --type expense --color "#3B82F6"
npx tsx scripts/cli.ts tag list
npx tsx scripts/cli.ts tag add --name "重要" --color "#EF4444"

# 统计
npx tsx scripts/cli.ts stats`}</code></pre>
        <p className="text-muted-foreground">CLI 配置保存在 .cli-config.json 中，记录当前激活的账本 ID。</p>
      </div>
    ),
  },
  {
    id: "tech-docs",
    title: "技术文档",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <div>
          <p className="font-semibold mb-1">语言与运行时</p>
          <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>TypeScript 5.x（strict 模式），全栈统一语言</li>
            <li>Node.js 24.x 运行时</li>
            <li>pnpm 9.x 包管理（严禁 npm / yarn）</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-1">前端框架</p>
          <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>Next.js 16（App Router）+ React 19</li>
            <li>shadcn/ui 组件库（基于 Radix UI 原语）</li>
            <li>Tailwind CSS 4 工具类样式 + CSS 变量双主题</li>
            <li>next-themes 主题管理（亮色/暗色/系统）</li>
            <li>Recharts 图表可视化（折线图 + 饼图）</li>
            <li>lucide-react 图标、date-fns 日期处理</li>
            <li>react-hook-form + Zod 表单校验</li>
            <li>Sonner Toast 通知</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-1">后端与数据库</p>
          <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>Supabase（PostgreSQL）托管数据库</li>
            <li>Drizzle ORM 类型安全查询构建</li>
            <li>Next.js Route Handlers API 路由</li>
            <li>Git 备份通过 child_process 调用系统 git</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-1">数据库 Schema</p>
          <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>ledgers — 账本（id, name, description, currency, initial_balance）</li>
            <li>category_groups — 分类分组（id, ledger_id, name, type, icon, sort_order）</li>
            <li>categories — 分类（id, ledger_id, group_id, name, type, icon, color）</li>
            <li>tags — 标签（id, ledger_id, name, color）</li>
            <li>transactions — 交易记录（id, ledger_id, category_id, amount, type, description, tag_ids）</li>
            <li>外键：categories.group_id → category_groups.id（SET NULL）、*.ledger_id → ledgers.id（CASCADE）</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-1">项目目录结构</p>
          <pre className="rounded bg-muted p-3 text-xs overflow-x-auto"><code>{`src/
├── app/
│   ├── api/          # API 路由（ledgers, categories, category-groups, tags, transactions, stats, sync）
│   ├── globals.css   # 全局样式 + CSS 变量双主题
│   ├── layout.tsx    # 根布局（ThemeProvider 包裹）
│   └── page.tsx      # 主页面（Tab 切换 + Sidebar）
├── components/
│   ├── ui/           # shadcn/ui 组件库
│   ├── app-sidebar.tsx        # 侧边栏导航
│   ├── dashboard-view.tsx     # 概览页
│   ├── transactions-view.tsx  # 收支明细页
│   ├── categories-view.tsx    # 分类管理页
│   ├── tags-view.tsx          # 标签管理页
│   ├── transaction-dialog.tsx # 交易录入弹窗
│   ├── stat-cards.tsx         # 统计卡片
│   ├── overview-charts.tsx    # 图表组件
│   ├── sync-settings-view.tsx # 同步与备份
│   ├── help-dialog.tsx        # 使用说明弹窗
│   ├── theme-provider.tsx     # 主题 Provider
│   └── theme-toggle.tsx       # 主题切换按钮
├── hooks/
│   ├── use-ledger.tsx  # 账本状态管理（Context + Provider）
│   └── use-data.ts     # 数据请求 hooks
├── lib/
│   ├── types.ts        # 共享类型定义
│   ├── constants.ts    # 常量 + 预设分组
│   └── utils.ts        # 工具函数
└── storage/database/
    ├── sqlite-client.ts    # SQLite 数据库客户端
    └── shared/schema.ts    # Drizzle ORM Schema`}</code></pre>
        </div>
        <div>
          <p className="font-semibold mb-1">开发流程</p>
          <ol className="ml-4 list-decimal space-y-0.5 text-muted-foreground">
            <li>定义 Drizzle Schema → 执行迁移 → 启用 RLS</li>
            <li>在 types.ts 添加接口 → 创建 API route.ts</li>
            <li>使用 useFetch / apiPost hooks 开发前端组件</li>
            <li>在 page.tsx 中集成页面 → 扩展 CLI 命令</li>
            <li>API 统一返回 {"{ success, data?, error? }"} 格式</li>
          </ol>
        </div>
        <div>
          <p className="font-semibold mb-1">关键配置</p>
          <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>tsconfig.json：strict: true，路径别名 @/* → ./src/*</li>
            <li>next.config.ts：Next.js 独立部署输出配置</li>
            <li>端口从 DEPLOY_RUN_PORT 环境变量读取</li>
            <li>端口从 DEPLOY_RUN_PORT 环境变量读取</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "changelog",
    title: "版本更新记录",
    content: (
      <div className="space-y-4 text-sm">
        <div className="border-l-2 border-primary pl-4">
          <p className="font-semibold text-primary">v1.4.0</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>使用说明弹窗新增「技术文档」分区（技术栈/架构/数据库/开发指南）</li>
            <li>README.md 新增技术架构、开发者指南章节</li>
            <li>方便后续衍生开发调阅技术信息</li>
          </ul>
        </div>
        <div className="border-l-2 border-muted-foreground/30 pl-4">
          <p className="font-semibold">v1.3.0</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>新增「使用说明」弹窗组件，设置页独立按钮点击弹出</li>
            <li>新增 README.md 详细项目文档</li>
            <li>弹窗内含功能说明、操作指南和版本更新记录</li>
          </ul>
        </div>
        <div className="border-l-2 border-muted-foreground/30 pl-4">
          <p className="font-semibold">v1.2.0</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>新增分类分组功能（category_groups 表）</li>
            <li>预设公司常用消费类别：支出 8 组 + 收入 3 组</li>
            <li>分类管理页重构为分组折叠展示</li>
            <li>交易弹窗分类选择按分组分区展示</li>
            <li>删除分组时分类自动归入「未分组」</li>
          </ul>
        </div>
        <div className="border-l-2 border-muted-foreground/30 pl-4">
          <p className="font-semibold">v1.1.0</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>新增亮色/暗色主题切换（next-themes）</li>
            <li>新增数据同步功能：本地导出/导入（JSON）</li>
            <li>新增 Git 远程备份：支持 GitHub 和 Gitea</li>
            <li>新增自动同步：定时推送数据到 Git</li>
            <li>新增同步与备份设置页面</li>
          </ul>
        </div>
        <div className="border-l-2 border-muted-foreground/30 pl-4">
          <p className="font-semibold">v1.0.0</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li>初始版本发布</li>
            <li>多账本管理：创建、切换、删除独立账本</li>
            <li>收支记录：添加、编辑、删除交易记录</li>
            <li>分类与标签管理</li>
            <li>数据统计与可视化</li>
            <li>CLI 命令行工具</li>
            <li>Supabase 数据库，RLS 行级安全策略</li>
          </ul>
        </div>
      </div>
    ),
  },
];

interface HelpDialogProps {
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  className?: string;
}

export function HelpDialog({
  triggerVariant = "outline",
  className,
}: HelpDialogProps) {
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview"])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={className}>
          <BookOpen className="h-4 w-4" />
          使用说明
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            团队管理助手 — 使用说明
          </DialogTitle>
          <DialogDescription>
            了解各项功能的使用方法和版本更新记录
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 pb-4">
            {sections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              return (
                <Collapsible
                  key={section.id}
                  open={isExpanded}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between font-medium"
                    >
                      {section.title}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-3 pt-1">
                    {section.content}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
