# Trae Agent — Code Wiki

> 本文档基于 [`bytedance/trae-agent`](https://github.com/bytedance/trae-agent) 源码（截至阅读时的 `main` 分支）系统整理而成，用于说明项目的整体架构、模块职责、关键类与函数、依赖关系以及运行方式。

---

## 目录

1. [项目概览](#1-项目概览)
2. [整体架构](#2-整体架构)
3. [目录结构](#3-目录结构)
4. [核心模块职责](#4-核心模块职责)
5. [关键类与函数说明](#5-关键类与函数说明)
6. [运行时调用流程](#6-运行时调用流程)
7. [依赖关系](#7-依赖关系)
8. [安装、配置与运行](#8-安装配置与运行)
9. [Docker 沙箱模式](#9-docker-沙箱模式)
10. [MCP 集成](#10-mcp-集成)
11. [Lakeview 步骤摘要子系统](#11-lakeview-步骤摘要子系统)
12. [CKG 代码知识图谱子系统](#12-ckg-代码知识图谱子系统)
13. [轨迹记录与评估](#13-轨迹记录与评估)
14. [测试与开发](#14-测试与开发)
15. [路线图](#15-路线图)

---

## 1. 项目概览

**Trae Agent** 是字节跳动开源的 LLM-based 软件工程 Agent，定位为「面向研究友好的通用工程 Agent」。它通过一个透明、模块化的架构，使研究者能够方便地修改、扩展、消融分析 Agent 行为。

| 属性 | 值 |
|------|----|
| 项目名 | `trae-agent` |
| 版本 | `0.1.0` |
| 许可 | MIT |
| 语言 | Python ≥ 3.12 |
| 包管理 | [uv](https://docs.astral.sh/uv/) (推荐) / pip |
| 构建系统 | hatchling |
| CLI 入口 | `trae-cli` (= `trae_agent.cli:main`) |
| 技术报告 | [arXiv:2507.23370](https://arxiv.org/abs/2507.23370) |

### 核心能力

- **多 LLM Provider 支持**：OpenAI、Anthropic、Google Gemini、Doubao（豆包）、Azure、OpenRouter、Ollama
- **丰富工具生态**：文件编辑、bash 执行、结构化思考、JSON 编辑、代码图谱查询、Task Done
- **MCP 集成**：通过 stdio 协议接入 MCP server，自动发现其工具
- **Docker 沙箱模式**：将工具调用路由到 Docker 容器中隔离执行
- **Lakeview 步骤摘要**：用一个独立的小模型在后台为每一步生成简短摘要与标签
- **轨迹记录**：完整保存 LLM 调用、工具调用、步骤、token 使用等元数据为 JSON
- **可交互模式**：Simple / Rich (Textual TUI) 两种控制台
- **SWE-bench 评估**：内置对 SWE-bench / SWE-bench-Live / Multi-SWE-bench 的评估流水线

---

## 2. 整体架构

Trae Agent 采用「分层 + 策略」的清晰架构，自上而下分为五层：

```
┌──────────────────────────────────────────────────────────┐
│  CLI 层        trae_agent/cli.py (Click)                  │  ← trae-cli 命令
├──────────────────────────────────────────────────────────┤
│  控制台层      utils/cli/* (Simple / Rich TUI)            │  ← 用户交互与展示
├──────────────────────────────────────────────────────────┤
│  Agent 层      agent/* (Agent → BaseAgent → TraeAgent)    │  ← 任务编排
├──────────────────────────────────────────────────────────┤
│  工具层        tools/* (Tool 抽象 + ToolExecutor)         │  ← 与外界交互
│  LLM 层        utils/llm_clients/* (LLMClient + 各 provider)│  ← 模型推理
├──────────────────────────────────────────────────────────┤
│  基础设施      config / trajectory / mcp_client / docker  │  ← 配置、记录、扩展
└──────────────────────────────────────────────────────────┘
```

### 关键设计原则

1. **配置优先级**：`CLI 参数 > 环境变量 > 配置文件 > 默认值`（由 `resolve_config_value` 统一处理）
2. **统一抽象**：所有 LLM 调用都通过 `LLMClient` 派发；所有工具都继承 `Tool` 抽象基类
3. **可观测性**：`TrajectoryRecorder` 注入到 Agent 和 LLM Client，全程记录；`LakeView` 用第二个 LLM 后台摘要每一步
4. **可扩展性**：通过 MCP 协议接入外部工具；通过 `OpenAICompatibleClient` 基类轻松新增 OpenAI 兼容 provider
5. **可插拔执行后端**：`ToolExecutor` 与 `DockerToolExecutor` 实现同一接口，可在「本地执行」与「容器内执行」间无缝切换

---

## 3. 目录结构

```
trae-agent/
├── README.md                       # 项目主文档
├── CONTRIBUTING.md                 # 贡献指南
├── LICENSE                         # MIT
├── pyproject.toml                  # Python 项目元数据、依赖、ruff/pytest 配置
├── uv.lock                         # uv 锁文件
├── Makefile                        # 常用开发命令
├── .pre-commit-config.yaml         # 预提交钩子（ruff + mypy + codespell）
├── .python-version                  # Python 版本固定
├── trae_config.yaml.example        # YAML 配置模板（推荐）
├── trae_config.json.example        # JSON 配置模板（legacy）
│
├── trae_agent/                     # 主源码包
│   ├── __init__.py                 # 顶层导出：BaseAgent / TraeAgent / LLMClient / Tool / ToolExecutor
│   ├── cli.py                      # CLI 入口（Click 命令组）
│   │
│   ├── agent/                      # Agent 层
│   │   ├── __init__.py
│   │   ├── agent.py                # Agent 门面（封装 TraeAgent + TrajectoryRecorder）
│   │   ├── base_agent.py           # BaseAgent 抽象基类（核心执行循环）
│   │   ├── trae_agent.py           # TraeAgent 具体实现
│   │   ├── agent_basics.py         # 数据类：AgentStep / AgentExecution / AgentState / AgentError
│   │   └── docker_manager.py       # DockerManager：容器生命周期 + 持久 shell
│   │
│   ├── prompt/
│   │   ├── __init__.py
│   │   └── agent_prompt.py         # TRAE_AGENT_SYSTEM_PROMPT
│   │
│   ├── tools/                      # 工具层
│   │   ├── __init__.py             # tools_registry：tool name → Tool class
│   │   ├── base.py                 # Tool / ToolExecutor / ToolCall / ToolResult / ToolParameter
│   │   ├── bash_tool.py            # BashTool ("bash")
│   │   ├── edit_tool.py            # TextEditorTool ("str_replace_based_edit_tool")
│   │   ├── edit_tool_cli.py        # TextEditorTool 的独立 CLI 版本（PyInstaller 打包用）
│   │   ├── json_edit_tool.py       # JSONEditTool ("json_edit_tool")
│   │   ├── json_edit_tool_cli.py   # JSONEditTool 的独立 CLI 版本
│   │   ├── sequential_thinking_tool.py  # SequentialThinkingTool ("sequentialthinking")
│   │   ├── task_done_tool.py       # TaskDoneTool ("task_done")
│   │   ├── mcp_tool.py             # MCPTool（动态包裹 MCP server 提供的工具）
│   │   ├── ckg_tool.py             # CKGTool ("ckg")
│   │   ├── docker_tool_executor.py # DockerToolExecutor（路由工具调用到容器）
│   │   ├── run.py                  # 通用工具函数 maybe_truncate / run
│   │   ├── ckg/                     # 代码知识图谱子模块
│   │   │   ├── base.py              # FunctionEntry / ClassEntry / 语言映射
│   │   │   └── ckg_database.py      # CKGDatabase（tree-sitter 解析 + SQLite 索引）
│   │   └── dist/dist_tools/        # 已编译好的 ELF 工具二进制（用于 Docker 内调用）
│   │       ├── edit_tool
│   │       └── json_edit_tool
│   │
│   └── utils/                      # 基础设施
│       ├── __init__.py (implicit)
│       ├── config.py               # Config / TraeAgentConfig / ModelConfig 等数据类
│       ├── constants.py            # LOCAL_STORAGE_PATH = ~/.trae-agent
│       ├── legacy_config.py        # 旧 JSON 配置兼容层
│       ├── lake_view.py            # LakeView 摘要生成器
│       ├── mcp_client.py           # MCPClient（stdio 传输）
│       ├── trajectory_recorder.py  # TrajectoryRecorder（JSON 轨迹文件）
│       ├── cli/
│       │   ├── __init__.py         # 导出 CLIConsole / ConsoleMode / ConsoleType / 工厂
│       │   ├── cli_console.py      # CLIConsole 抽象基类 + generate_agent_step_table
│       │   ├── console_factory.py  # ConsoleFactory 静态工厂
│       │   ├── simple_console.py   # SimpleCLIConsole（基于 rich.Console）
│       │   ├── rich_console.py     # RichCLIConsole（基于 Textual TUI）
│       │   └── rich_console.tcss    # Textual 应用的 CSS
│       └── llm_clients/
│           ├── __init__.py (implicit)
│           ├── llm_basics.py       # LLMMessage / LLMResponse / LLMUsage
│           ├── base_client.py     # BaseLLMClient 抽象基类
│           ├── llm_client.py      # LLMClient 门面 + LLMProvider 枚举
│           ├── openai_compatible_base.py # OpenAICompatibleClient + ProviderConfig 策略
│           ├── retry_utils.py     # retry_with 装饰器
│           ├── anthropic_client.py
│           ├── openai_client.py
│           ├── google_client.py
│           ├── doubao_client.py
│           ├── azure_client.py
│           ├── openrouter_client.py
│           └── ollama_client.py
│
├── evaluation/                     # SWE-bench / SWE-bench-Live / Multi-SWE-bench 评估
│   ├── README.md
│   ├── __init__.py
│   ├── run_evaluation.py           # BenchmarkEvaluation 主类
│   ├── utils.py                    # BENCHMARK_CONFIG / docker_exec
│   ├── setup.sh                    # 一键拉取并安装 benchmark harness
│   └── patch_selection/            # 补丁选择实验（独立子项目）
│
├── tests/                          # pytest 测试
│   ├── test_cli.py
│   ├── agent/test_trae_agent.py
│   ├── tools/test_{bash,edit,json_edit,mcp}_tool.py
│   └── utils/test_{config,google_client,mcp_client,ollama_client,openrouter_client}_utils.py
│
├── server/                         # （仅占位，README.md 无具体服务端实现）
├── docs/
│   ├── tools.md                    # 工具说明（仅覆盖 5 个内置工具）
│   ├── TRAJECTORY_RECORDING.md
│   ├── legacy_config.md
│   └── roadmap.md                  # 路线图
└── .github/
    ├── workflows/{pre-commit,unit-test}.yml
    └── ISSUE_TEMPLATE/  pull_request_template.md
```

---

## 4. 核心模块职责

### 4.1 CLI 层 — `trae_agent/cli.py`

提供 `trae-cli` 命令，基于 **Click** 实现：

| 命令 | 作用 |
|------|------|
| `trae-cli run "task"` | 单次任务执行（默认 `ConsoleMode.RUN`） |
| `trae-cli interactive` | 多轮交互式会话 |
| `trae-cli show-config` | 打印当前配置（YAML 加载 + CLI/env 解析后） |
| `trae-cli tools` | 列出所有已注册工具及描述 |

`cli.py` 还包含两个工具函数：
- `resolve_config_file()` — YAML → JSON 回退兼容
- `check_docker()` — 检查 Docker CLI/daemon 是否可用
- `build_with_pyinstaller()` — 调用 PyInstaller 将 `edit_tool_cli.py` 与 `json_edit_tool_cli.py` 打包为 ELF 二进制（用于 Docker 模式）

### 4.2 Agent 层 — `trae_agent/agent/`

负责 LLM 推理与工具调用的循环编排。

| 文件 | 职责 |
|------|------|
| `agent.py` | `Agent` 门面类：根据 `agent_type` 实例化 `TraeAgent`，绑定 `TrajectoryRecorder` 与 `CLIConsole` |
| `base_agent.py` | `BaseAgent` 抽象基类：实现核心 `execute_task()` 循环、`_run_llm_step`、`_tool_call_handler`、`reflect_on_result` 等模板方法 |
| `trae_agent.py` | `TraeAgent(BaseAgent)`：覆盖系统提示、任务初始化、MCP 工具发现、git diff 提取、任务完成判定 |
| `agent_basics.py` | 数据类：`AgentStep`、`AgentExecution`、`AgentStepState`、`AgentState`、`AgentError` |
| `docker_manager.py` | `DockerManager`：构建/拉取镜像、起容器、挂载工作区、复制工具、维持 pexpect 持久 shell、执行命令 |

### 4.3 工具层 — `trae_agent/tools/`

定义 Agent 的「手」：所有与外界交互的能力都封装为 `Tool` 子类。

| 模块 | 职责 |
|------|------|
| `base.py` | 抽象基类 `Tool`、`ToolExecutor`、数据类 `ToolCall` / `ToolResult` / `ToolExecResult` / `ToolParameter` |
| `bash_tool.py` | `BashTool`：在持久 bash 会话中执行命令（120s 超时） |
| `edit_tool.py` | `TextEditorTool`：view / create / str_replace / insert 文件操作 |
| `json_edit_tool.py` | `JSONEditTool`：基于 JSONPath 的 JSON 文件查看/修改 |
| `sequential_thinking_tool.py` | `SequentialThinkingTool`：结构化分步思考、修订、分支 |
| `task_done_tool.py` | `TaskDoneTool`：声明任务完成（无参数） |
| `ckg_tool.py` | `CKGTool`：查询代码知识图谱（函数/类/方法） |
| `mcp_tool.py` | `MCPTool`：动态包裹 MCP server 暴露的工具 |
| `docker_tool_executor.py` | `DockerToolExecutor`：将指定工具调用转发到 Docker 容器内 |
| `run.py` | 共享工具：`maybe_truncate()` 与 `async run()` |
| `ckg/` | tree-sitter 解析的代码知识图谱构建与查询 |

### 4.4 LLM 客户端层 — `trae_agent/utils/llm_clients/`

| 模块 | 职责 |
|------|------|
| `llm_basics.py` | 统一数据类：`LLMMessage` / `LLMResponse` / `LLMUsage` |
| `base_client.py` | `BaseLLMClient` 抽象基类：定义 `chat()` / `set_chat_history()` / `set_trajectory_recorder()` 接口 |
| `llm_client.py` | `LLMClient` 门面 + `LLMProvider` 枚举（按 provider 懒加载具体 client） |
| `openai_compatible_base.py` | `OpenAICompatibleClient` + `ProviderConfig` 策略模式（被 Azure/Doubao/OpenRouter 复用） |
| `retry_utils.py` | `retry_with` 装饰器：3–30s 随机退避重试 |
| `anthropic_client.py` | Anthropic 官方 SDK，分离 system 消息，支持 prompt cache tokens 统计 |
| `openai_client.py` | OpenAI **Responses API**（非 Chat Completions），支持 reasoning tokens |
| `google_client.py` | Google GenAI SDK，`Content` 消息格式，独立 system_instruction |
| `azure_client.py` | `AzureClient(OpenAICompatibleClient)`：基于 `openai.AzureOpenAI` |
| `doubao_client.py` | `DoubaoClient(OpenAICompatibleClient)`：豆包（火山方舟） |
| `openrouter_client.py` | `OpenRouterClient(OpenAICompatibleClient)`：多模型聚合，按模型名做工具调用能力匹配 |
| `ollama_client.py` | `OllamaClient(BaseLLMClient)`：本地 Ollama SDK，无 usage 统计 |

### 4.5 控制台层 — `trae_agent/utils/cli/`

| 模块 | 职责 |
|------|------|
| `cli_console.py` | `CLIConsole` 抽象基类 + `ConsoleMode` / `ConsoleType` 枚举 + `generate_agent_step_table()` |
| `console_factory.py` | `ConsoleFactory.create_console()` 静态工厂 |
| `simple_console.py` | `SimpleCLIConsole`：纯文本 + `rich.Console`，支持 Lakeview 后台任务 |
| `rich_console.py` | `RichCLIConsole`：基于 **Textual** 的全屏 TUI，含 `TokenDisplay`、`RichConsoleApp` |
| `rich_console.tcss` | Textual 应用 CSS |

### 4.6 基础设施层 — `trae_agent/utils/`

| 模块 | 职责 |
|------|------|
| `config.py` | 数据类 `Config` / `TraeAgentConfig` / `ModelConfig` / `ModelProvider` / `LakeviewConfig` / `MCPServerConfig`；YAML 解析与 CLI/env override 解析 |
| `constants.py` | `LOCAL_STORAGE_PATH = Path.home() / ".trae-agent"` |
| `legacy_config.py` | `LegacyConfig`：兼容旧版 `trae_config.json` 格式 |
| `lake_view.py` | `LakeView`：用一个独立 LLM 为每步生成「任务摘要 + 标签」 |
| `mcp_client.py` | `MCPClient`：连接 MCP server（stdio 传输），发现并包装工具为 `MCPTool` |
| `trajectory_recorder.py` | `TrajectoryRecorder`：把 LLM 调用、工具调用、Agent 步骤保存为 JSON |

---

## 5. 关键类与函数说明

### 5.1 Agent 层

#### `BaseAgent`（抽象基类）— [trae_agent/agent/base_agent.py](file:///tmp/trae-agent/trae_agent/agent/base_agent.py)

```python
class BaseAgent(ABC):
    _tool_caller: Union[ToolExecutor, DockerToolExecutor]

    def __init__(self, agent_config: AgentConfig, docker_config=None, docker_keep=True)
```

**核心字段**：
- `self._llm_client: LLMClient` — 主 LLM 客户端
- `self._model_config: ModelConfig` — 模型参数
- `self._max_steps: int` — 最大步数
- `self._tools: list[Tool]` — 工具列表
- `self._tool_caller` — 工具调用执行器（本地或 Docker）
- `self._trajectory_recorder: TrajectoryRecorder | None`
- `self._cli_console: CLIConsole | None`
- `self.docker_manager: DockerManager | None`

**核心方法**：

| 方法 | 说明 |
|------|------|
| `execute_task() -> AgentExecution` | **主循环**：循环 `≤ max_steps` 次，每次先 `_run_llm_step` 后 `_finalize_step`，遇 `COMPLETED` 或异常即停 |
| `_run_llm_step(step, messages, execution)` | 调用 LLM、更新 usage；若 LLM 表示完成则校验是否真完成，否则进入 `_tool_call_handler` |
| `_tool_call_handler(tool_calls, step)` | 根据 `parallel_tool_calls` 走并行或顺序执行；将 `ToolResult` 包成 `LLMMessage` 追加到消息列表；调用 `reflect_on_result` |
| `_finalize_step(step, messages, execution)` | 标记步骤完成、记录轨迹、推送控制台、追加到 `execution.steps` |
| `llm_indicates_task_completed(llm_response)` | 默认按文本关键词判断（"task completed"/"done"/...），子类可覆盖 |
| `_is_task_completed(llm_response)` | 子类覆盖：例如 TraeAgent 在 `must_patch=true` 时校验 git diff 非空 |
| `reflect_on_result(tool_results)` | 失败工具的反思信息（默认实现） |
| `cleanup_mcp_clients()` | 抽象方法，子类负责清理 MCP 资源 |

#### `TraeAgent(BaseAgent)` — [trae_agent/agent/trae_agent.py](file:///tmp/trae-agent/trae_agent/agent/trae_agent.py)

```python
class TraeAgent(BaseAgent):
    def __init__(self, trae_agent_config: TraeAgentConfig, docker_config=None, docker_keep=True)
```

**关键覆盖点**：
- `new_task(task, extra_args, tool_names)` — 设置默认工具列表 `["str_replace_based_edit_tool", "sequentialthinking", "json_edit_tool", "task_done", "bash"]`；构建初始消息（system + user）；启动 trajectory recording
- `execute_task()` — 调用父类后 `finalize_recording`；若指定 `patch_path` 则写入 git diff
- `llm_indicates_task_completed()` — 仅当 LLM 调用了 `task_done` 工具时返回 True
- `_is_task_completed()` — `must_patch=true` 时要求 `git diff` 非空（且过滤测试目录的修改）
- `get_git_diff()` — 获取项目当前 git diff（可选 `base_commit`）
- `remove_patches_to_tests(model_patch)` — 借鉴 aider-swe-bench，从 patch 中剔除对测试目录的修改
- `discover_mcp_tools()` / `initialise_mcp()` / `cleanup_mcp_clients()` — MCP 工具发现与清理

#### `Agent`（门面）— [trae_agent/agent/agent.py](file:///tmp/trae-agent/trae_agent/agent/agent.py)

```python
class Agent:
    def __init__(self, agent_type, config, trajectory_file=None, cli_console=None,
                 docker_config=None, docker_keep=True)
    async def run(self, task, extra_args=None, tool_names=None)
```

- 根据 `AgentType` 枚举（目前仅 `TraeAgent`）实例化具体子类
- 自动生成或绑定 `TrajectoryRecorder`，将 recorder 注入 Agent 与 LLM Client
- 注入 `CLIConsole` 并绑定 Lakeview 配置
- `run()` 调用 `new_task` → 可选 `initialise_mcp` → 打印任务详情 → 启动 console task → `execute_task()`

#### 数据类 — [trae_agent/agent/agent_basics.py](file:///tmp/trae-agent/trae_agent/agent/agent_basics.py)

```python
class AgentStepState(Enum):
    THINKING = "thinking"
    CALLING_TOOL = "calling_tool"
    REFLECTING = "reflecting"
    COMPLETED = "completed"
    ERROR = "error"

class AgentState(Enum):
    IDLE = "idle"; RUNNING = "running"; COMPLETED = "completed"; ERROR = "error"

@dataclass
class AgentStep:
    step_number: int
    state: AgentStepState
    thought: str | None = None
    tool_calls: list[ToolCall] | None = None
    tool_results: list[ToolResult] | None = None
    llm_response: LLMResponse | None = None
    reflection: str | None = None
    error: str | None = None

@dataclass
class AgentExecution:
    task: str
    steps: list[AgentStep]
    final_result: str | None = None
    success: bool = False
    total_tokens: LLMUsage | None = None
    execution_time: float = 0.0
    agent_state: AgentState = AgentState.IDLE

class AgentError(Exception):
    def __init__(self, message: str): self.message = message
```

### 5.2 工具层

#### `Tool`（抽象基类）— [trae_agent/tools/base.py](file:///tmp/trae-agent/trae_agent/tools/base.py)

```python
class Tool(ABC):
    def __init__(self, model_provider: str | None = None)
    # 子类必须实现的 4 个方法：
    @abstractmethod
    def get_name(self) -> str
    @abstractmethod
    def get_description(self) -> str
    @abstractmethod
    def get_parameters(self) -> list[ToolParameter]
    @abstractmethod
    async def execute(self, arguments: ToolCallArguments) -> ToolExecResult
    # 缓存属性
    @property
    def name(self) -> str           # 调用 get_name()
    @property
    def description(self) -> str
    @property
    def parameters(self) -> list[ToolParameter]
    # 其他
    def json_definition(self) -> dict          # {name, description, parameters}
    def get_input_schema(self) -> dict         # JSON Schema，OpenAI strict 模式特殊处理
    async def close(self)                      # 资源释放（默认 no-op）
```

#### `ToolExecutor`

```python
class ToolExecutor:
    def __init__(self, tools: list[Tool])
    @property
    def tools(self) -> dict[str, Tool]   # 名称归一化后映射（去下划线、小写）
    async def execute_tool_call(self, tool_call: ToolCall) -> ToolResult
    async def parallel_tool_call(self, tool_calls) -> list[ToolResult]   # asyncio.gather
    async def sequential_tool_call(self, tool_calls) -> list[ToolResult]
    async def close_tools(self)   # 并发调用所有 tool.close()
```

#### 工具注册表 — [trae_agent/tools/__init__.py](file:///tmp/trae-agent/trae_agent/tools/__init__.py)

```python
tools_registry: dict[str, type[Tool]] = {
    "bash":                       BashTool,
    "str_replace_based_edit_tool":TextEditorTool,
    "json_edit_tool":             JSONEditTool,
    "sequentialthinking":         SequentialThinkingTool,
    "task_done":                  TaskDoneTool,
    "ckg":                        CKGTool,
}
```

> 注意：`MCPTool` 与 `DockerToolExecutor` 不在 registry 中，运行时动态加载。

#### 各工具的关键行为

| 工具（registry key） | 类 | 参数（核心） | 行为要点 |
|----|----|----|----|
| `bash` | `BashTool` | `command: str`、`restart: bool`（仅 openai 必填） | 持久 bash 会话，120s 超时，注入 sentinel `",,,,bash-command-exit-__ERROR_CODE__-banner,,,"` 检测退出码；`close()` 终止 session |
| `str_replace_based_edit_tool` | `TextEditorTool` | `command`(view/create/str_replace/insert)、`path`、`file_text`、`old_str`、`new_str`、`insert_line`、`view_range` | 路径必须绝对；`create` 不能覆盖现有文件；`str_replace` 要求 `old_str` 唯一；目录 `view` 用 `find -maxdepth 2` |
| `json_edit_tool` | `JSONEditTool` | `operation`(view/set/add/remove)、`file_path`、`json_path`、`value`、`pretty_print` | 基于 `jsonpath_ng`，支持 `$`、`.key`、`[index]`、`[*]`、`..key`、`[start:end]`；`add` 区分 Fields/Index |
| `sequentialthinking` | `SequentialThinkingTool` | `thought`、`thought_number`、`total_thoughts`、`next_thought_needed`、可选 `is_revision`/`revises_thought`/`branch_from_thought`/`branch_id` | 维护 `thought_history` 与 `branches`；可修订可分支；返回 JSON 状态摘要 |
| `task_done` | `TaskDoneTool` | （无） | 返回 `ToolExecResult(output="Task done.")`；提示需先做验证 |
| `ckg` | `CKGTool` | `command`(search_function/search_class/search_class_method)、`path`、`identifier`、`print_body` | 通过 `CKGDatabase` 查询代码知识图谱；输出 `file_path:start-end`+源码，超过 `MAX_RESPONSE_LEN=16000` 截断 |
| （动态） | `MCPTool` | 透传 MCP server schema | 包裹 MCP 工具为 `Tool` 子类，复用 `client.call_tool` |

#### `DockerToolExecutor`

```python
DockerToolExecutor(
    original_executor: ToolExecutor,
    docker_manager: DockerManager,
    docker_tools: list[str],              # 需在容器内运行的工具名
    host_workspace_dir: str | None,
    container_workspace_dir: str,
)
```

对在 `docker_tools` 列表中的工具调用：
- `_translate_path(host_path)` — 把宿主路径映射到容器路径
- `_execute_in_docker(tool_call)` — 根据工具名构造 shell 命令：
  - `bash` → 直接执行 `command` 参数
  - `str_replace_based_edit_tool` → 调用 `$CONTAINER_TOOLS_PATH/edit_tool <subcommand> --key 'value' ...`
  - `json_edit_tool` → 调用 `$CONTAINER_TOOLS_PATH/json_edit_tool --key 'value' ...`
  - 其他 → `NotImplementedError`
- 通过 `docker_manager.execute()` 获取 `(exit_code, output)`，封装为 `ToolResult`
- 不在 `docker_tools` 中的工具调用仍走 `original_executor`

#### `run.py` 工具函数

```python
MAX_RESPONSE_LEN = 16000
TRUNCATED_MESSAGE  = "<response clipped><NOTE>...</NOTE>"

def maybe_truncate(content: str, truncate_after=MAX_RESPONSE_LEN) -> str
async def run(cmd: str, timeout=120.0, truncate_after=MAX_RESPONSE_LEN) -> tuple[int, str, str]
```

### 5.3 LLM 客户端层

#### 统一数据结构 — [llm_basics.py](file:///tmp/trae-agent/trae_agent/utils/llm_clients/llm_basics.py)

```python
@dataclass
class LLMMessage:
    role: str                  # system/user/assistant/tool
    content: str | None
    tool_call: ToolCall | None = None      # assistant 发起的工具调用
    tool_result: ToolResult | None = None  # 工具执行结果

@dataclass
class LLMUsage:
    input_tokens: int
    output_tokens: int
    cache_creation_input_tokens: int = 0   # Anthropic prompt cache 写入
    cache_read_input_tokens: int = 0       # Anthropic prompt cache 读取
    reasoning_tokens: int = 0              # OpenAI o 系列
    def __add__(self, other) -> "LLMUsage"  # 累加多步 usage

@dataclass
class LLMResponse:
    content: str
    usage: LLMUsage | None
    model: str | None
    finish_reason: str | None
    tool_calls: list[ToolCall] | None
```

#### `BaseLLMClient` — [base_client.py](file:///tmp/trae-agent/trae_agent/utils/llm_clients/base_client.py)

```python
class BaseLLMClient(ABC):
    def __init__(self, model_config: ModelConfig)
    def set_trajectory_recorder(self, recorder)
    @abstractmethod
    def set_chat_history(self, messages: list[LLMMessage])
    @abstractmethod
    def chat(self, messages, model_config, tools=None, reuse_history=True) -> LLMResponse
    def supports_tool_calling(self, model_config) -> bool
```

#### `LLMClient` 门面 — [llm_client.py](file:///tmp/trae-agent/trae_agent/utils/llm_clients/llm_client.py)

```python
class LLMProvider(Enum):
    OPENAI="openai"; ANTHROPIC="anthropic"; AZURE="azure"
    OLLAMA="ollama"; OPENROUTER="openrouter"; DOUBAO="doubao"; GOOGLE="google"

class LLMClient:
    def __init__(self, model_config: ModelConfig):
        # 按 provider 字符串懒加载对应客户端到 self.client: BaseLLMClient
    def chat(self, messages, model_config, tools=None, reuse_history=True) -> LLMResponse
    # 透传 set_trajectory_recorder / set_chat_history / supports_tool_calling
    @property
    def provider(self) -> LLMProvider
```

#### `OpenAICompatibleClient` 策略基类 — [openai_compatible_base.py](file:///tmp/trae-agent/trae_agent/utils/llm_clients/openai_compatible_base.py)

```python
class ProviderConfig(ABC):
    @abstractmethod
    def create_client(self, api_key, base_url, api_version) -> openai.OpenAI
    @abstractmethod
    def get_service_name(self) -> str       # 用于重试日志
    @abstractmethod
    def get_provider_name(self) -> str      # 用于轨迹记录
    def get_extra_headers(self) -> dict[str, str]
    def supports_tool_calling(self, model_name) -> bool

class OpenAICompatibleClient(BaseLLMClient):
    def __init__(self, model_config, provider_config: ProviderConfig)
    def chat(messages, model_config, tools=None, reuse_history=True) -> LLMResponse
    # 内部方法：parse_messages / _create_response / _msg_role_handler / _msg_tool_call_handler / _msg_tool_result_handler
```

**Token 参数选择**：
- 若 `model_config.should_use_max_completion_tokens()` 为 True（Azure + `gpt-5`/`o3`/`o4-mini`）→ 使用 `max_completion_tokens`
- 否则使用 `max_tokens`
- 上述 reasoning 模型同时**抑制 `temperature`**

#### Provider 客户端要点

| 客户端 | SDK | 关键特性 |
|--------|-----|----------|
| `AnthropicClient` | `anthropic` | 分离 system_message；工具 schema 自动识别 `TextEditor20250429` / `ToolBash20250124Param`；记录 cache tokens |
| `OpenAIClient` | `openai` (Responses API) | `FunctionToolParam(strict=True)`；解析 `function_call` 与 `function_call_output`；记录 cached/reasoning tokens |
| `GoogleClient` | `google-genai` | `Content` 消息；`GenerateContentConfig`；为每个 function_call 生成 UUID 作为 `call_id` |
| `AzureClient` | `openai.AzureOpenAI` | 通过 `AzureProvider` 策略；要求 `base_url`（即 `azure_endpoint`）与 `api_version` |
| `DoubaoClient` | `openai.OpenAI` | 走 `https://ark.cn-beijing.volces.com/api/v3/` 等兼容端点 |
| `OpenRouterClient` | `openai.OpenAI` | 默认 `https://openrouter.ai/api/v1`；发送 `HTTP-Referer`/`X-Title` 头；按模型名做能力匹配 |
| `OllamaClient` | `ollama.chat` | 不走 OpenAI 协议；`usage=None`；为 tool_call 生成 UUID |

#### `retry_with` — [retry_utils.py](file:///tmp/trae-agent/trae_agent/utils/llm_clients/retry_utils.py)

```python
def retry_with(func, provider_name="OpenAI", max_retries=3) -> Callable:
    # 异常时打印消息+traceback，sleep random(3, 30) 秒，最多重试 max_retries 次
```

### 5.4 配置层

#### 数据类层级 — [trae_agent/utils/config.py](file:///tmp/trae-agent/trae_agent/utils/config.py)

```python
@dataclass
class ModelProvider:
    api_key: str
    provider: str                       # "openai" / "anthropic" / ...
    base_url: str | None = None
    api_version: str | None = None

@dataclass
class ModelConfig:
    model: str
    model_provider: ModelProvider
    temperature: float
    top_p: float
    top_k: int
    parallel_tool_calls: bool
    max_retries: int
    max_tokens: int | None = None
    supports_tool_calling: bool = True
    candidate_count: int | None = None  # Gemini
    stop_sequences: list[str] | None = None
    max_completion_tokens: int | None = None

    def get_max_tokens_param() -> int           # 优先 max_completion_tokens
    def should_use_max_completion_tokens() -> bool  # Azure + gpt-5/o3/o4-mini
    def resolve_config_values(*, model_providers, provider, model, model_base_url, api_key)

@dataclass
class MCPServerConfig:
    # stdio
    command: str | None
    args: list[str]
    env: dict[str, str] | None
    cwd: str | None
    # SSE / HTTP / WebSocket（部分尚未实现）
    url: str | None
    http_url: str | None
    headers: dict[str, str]
    tcp: str | None
    timeout: int
    trust: bool
    description: str

@dataclass
class AgentConfig:
    allow_mcp_servers: list[str]
    mcp_servers_config: dict[str, MCPServerConfig]
    max_steps: int
    model: ModelConfig
    tools: list[str]

@dataclass
class TraeAgentConfig(AgentConfig):
    enable_lakeview: bool = True
    # 默认 tools: ["bash", "str_replace_based_edit_tool", "sequentialthinking", "task_done"]

@dataclass
class LakeviewConfig:
    model: ModelConfig

@dataclass
class Config:
    lakeview: LakeviewConfig | None
    model_providers: dict[str, ModelProvider] | None
    models: dict[str, ModelConfig] | None
    trae_agent: TraeAgentConfig | None

    @classmethod
    def create(cls, *, config_file=None, config_string=None) -> "Config"
    def resolve_config_values(self, *, provider, model, model_base_url, api_key, max_steps) -> "Config"
    @classmethod
    def create_from_legacy_config(cls, *, legacy_config=None, config_file=None) -> "Config"
```

#### 配置解析优先级

模块函数 `resolve_config_value(*, cli_value, config_value, env_var=None)`：

```
CLI > ENV > Config file > Default
```

`Config.create()` 流程：
1. 若 `config_file` 以 `.json` 结尾 → 委派 `create_from_legacy_config()`（向后兼容）
2. 否则 `yaml.safe_load()` 解析
3. 从 `model_providers:` 段构建 `dict[str, ModelProvider]`（空则报错）
4. 从 `models:` 段构建 `dict[str, ModelConfig]`，引用 provider 名（缺失则报错）
5. 从可选 `lakeview:` 段构建 `LakeviewConfig`（引用模型名）
6. 从 `mcp_servers:` 与 `allow_mcp_servers:` 构建 MCP 配置
7. 遍历 `agents:` 段；目前只识别 `trae_agent`，其他名称报错；若 `enable_lakeview=True` 但缺 lakeview 配置则报错

随后调用 `resolve_config_values()` 将 CLI/env 覆盖应用到 `trae_agent.model`。

### 5.5 控制台层

#### `CLIConsole` 抽象基类 — [cli_console.py](file:///tmp/trae-agent/trae_agent/utils/cli/cli_console.py)

```python
class ConsoleMode(Enum): RUN = "run"; INTERACTIVE = "interactive"
class ConsoleType(Enum): SIMPLE = "simple"; RICH = "rich"

AGENT_STATE_INFO = {
    AgentStepState.THINKING:    ("blue",    "🤔"),
    AgentStepState.CALLING_TOOL:("yellow",  "🔧"),
    AgentStepState.REFLECTING:  ("magenta", "💭"),
    AgentStepState.COMPLETED:   ("green",   "✅"),
    AgentStepState.ERROR:       ("red",     "❌"),
}

class CLIConsole(ABC):
    def __init__(self, mode, lakeview_config=None)
    # 抽象方法
    async def start(self)
    def update_status(self, agent_step, agent_execution)
    def print_task_details(self, details)
    def print(self, message, color=None, bold=False)
    def get_task_input(self) -> str | None
    def get_working_dir_input(self) -> str
    def stop(self)
    # 公共
    def set_lakeview(self, lakeview_config)   # 构造 LakeView 实例

def generate_agent_step_table(agent_step) -> rich.Table   # 模块函数，渲染步骤表格
```

#### `ConsoleFactory`

```python
class ConsoleFactory:
    @staticmethod
    def create_console(console_type, mode=ConsoleMode.RUN, lakeview_config=None) -> CLIConsole
    @staticmethod
    def get_recommended_console_type(mode) -> ConsoleType   # INTERACTIVE→RICH, RUN→SIMPLE
```

#### `SimpleCLIConsole`

- 基于 `rich.Console` 输出，无 TUI
- `update_status()` 跟踪步骤历史，仅当步骤到达 `COMPLETED`/`ERROR` 时打印
- 若开启 Lakeview，则用 `asyncio.create_task()` 后台调用 `_create_lakeview_step_display()`
- `start()` 异步轮询直到执行结束，然后打印 lakeview summary + execution summary
- 交互模式：`get_task_input()` 通过 `input()` 接收；识别 `exit`/`quit`/`help`/`status`/`clear`

#### `RichCLIConsole` (Textual TUI)

- `RichConsoleApp(App[None])` — Textual 应用
  - `CSS_PATH = "rich_console.tcss"`
  - `BINDINGS = [("ctrl+c","quit","Quit"), ("ctrl+q","quit","Quit")]`
  - `compose()` 生成：`Header`、`execution_container` (含 `RichLog#execution_log`)、`input_container` (含 `Input#task_input` + `Static#task_display`)、`footer_container` (含 `TokenDisplay`)、`Footer`
- `TokenDisplay(Static)` — reactive token 计数显示
- 支持 `set_agent_context()` 用于交互模式托管任务执行

### 5.6 基础设施

#### `TrajectoryRecorder` — [trajectory_recorder.py](file:///tmp/trae-agent/trae_agent/utils/trajectory_recorder.py)

```python
class TrajectoryRecorder:
    def __init__(self, trajectory_path: str | None = None)
    # 默认路径：trajectories/trajectory_<YYYYMMDD_HHMMSS>.json
    def start_recording(self, task, provider, model, max_steps)
    def record_llm_interaction(self, messages, response, provider, model, tools=None)
    def record_agent_step(self, step_number, state, llm_messages=None,
                          llm_response=None, tool_calls=None, tool_results=None,
                          reflection=None, error=None)
    def update_lakeview(self, step_number, lakeview_summary)
    def finalize_recording(self, success, final_result=None)
    def save_trajectory()                # 每次记录后立即落盘
    def get_trajectory_path() -> str
```

记录结构（JSON）：
```json
{
  "task": "...",
  "start_time": "...", "end_time": "...",
  "provider": "...", "model": "...", "max_steps": N,
  "llm_interactions": [...],
  "agent_steps": [...],
  "success": bool, "final_result": "...", "execution_time": 0.0
}
```

#### `MCPClient` — [mcp_client.py](file:///tmp/trae-agent/trae_agent/utils/mcp_client.py)

```python
class MCPServerStatus(Enum): DISCONNECTED; CONNECTING; CONNECTED
class MCPDiscoveryState(Enum): NOT_STARTED; IN_PROGRESS; COMPLETED

class MCPClient:
    def __init__(self)   # session: ClientSession | None, exit_stack = AsyncExitStack()
    async def connect_and_discover(mcp_server_name, mcp_server_config,
                                   mcp_tools_container, model_provider)
    async def connect_to_server(mcp_server_name, transport)
    async def call_tool(self, name, args)
    async def list_tools(self)
    async def cleanup(self, mcp_server_name)
```

> 仅实现 **stdio** 传输（基于 `StdioServerParameters` + `stdio_client`）；HTTP/SSE/WebSocket 会抛 `NotImplementedError`。

#### `DockerManager` — [docker_manager.py](file:///tmp/trae-agent/trae_agent/agent/docker_manager.py)

```python
class DockerManager:
    CONTAINER_TOOLS_PATH = "/agent_tools"
    CONTAINER_WORKSPACE = "/workspace"

    def __init__(self, image=None, container_id=None, dockerfile_path=None,
                 docker_image_file=None, workspace_dir=None, tools_dir=None, interactive=False)
    def start(self)        # 构建/加载镜像 → 起容器/attach → 复制工具 → 启动持久 shell
    def execute(self, command: str, timeout: int = 300) -> tuple[int, str]
    def stop(self)         # 关闭 shell + 清理 managed 容器
```

- **持久 shell**：使用 `pexpect.spawn("docker exec -it <id> /bin/bash")` 维持会话
- **命令完成检测**：发送 `echo ---CMD_DONE---$?` 作为 marker，正则 `---CMD_DONE---(\d+)` 提取退出码
- 镜像来源四选一：`image` / `container_id`（attach 已有容器）/ `dockerfile_path`（构建）/ `docker_image_file`（tar 加载）
- 工具目录通过 `docker cp` 复制到容器内 `/agent_tools`

### 5.7 Lakeview — [lake_view.py](file:///tmp/trae-agent/trae_agent/utils/lake_view.py)

```python
@dataclass
class LakeViewStep:
    desc_task: str       # ≤10 词，简短任务描述
    desc_details: str    # ≤30 词，更详细说明
    tags_emoji: str      # 由 KNOWN_TAGS 中的 emoji 拼接

KNOWN_TAGS = {
    "WRITE_TEST":   "☑️",  "VERIFY_TEST": "✅",
    "EXAMINE_CODE": "👁️",  "WRITE_FIX":   "📝",
    "VERIFY_FIX":   "🔥",  "REPORT":      "📣",
    "THINK":        "🧠",  "OUTLIER":     "⁉️",
}

class LakeView:
    def __init__(self, lake_view_config: LakeviewConfig)
    async def extract_task_in_step(prev_step, this_step) -> tuple[str, str]   # few-shot, T=0.1, 重试10次
    async def extract_tag_in_step(step) -> list[str]                          # 跳过 >300K 字符
    async def create_lakeview_step(agent_step) -> LakeViewStep | None
```

**作用**：用一个独立的 Lakeview LLM 对每一步生成「(1) 简短任务描述 + (2) 详细说明」与「(3) 标签集合」三类摘要，再以 emoji 形式呈现给用户。

### 5.8 CKG 子系统

#### `CKGTool`（已注册） — [ckg_tool.py](file:///tmp/trae-agent/trae_agent/tools/ckg_tool.py)

参数：`command`（search_function/search_class/search_class_method）、`path`、`identifier`、`print_body`。

内部 `self._ckg_databases: dict[Path, CKGDatabase]` 按 codebase 路径懒加载缓存。

#### `CKGDatabase` — [ckg_database.py](file:///tmp/trae-agent/trae_agent/tools/ckg/ckg_database.py)

- 存储位置：`~/.trae-agent/ckg/<snapshot_hash>.db`（SQLite），过期清理周期 1 周（`CKG_DATABASE_EXPIRY_TIME`）
- **快照哈希**：`get_folder_snapshot_hash(path)` 优先 git-aware（`git-clean-<commit>` 或 `git-dirty-<commit>-<md5[:8]>`），失败回退到文件元数据哈希
- 表结构：
  - `functions(id, name, file_path, body, start_line, end_line, parent_function, parent_class)`
  - `classes(id, name, file_path, body, fields, methods, start_line, end_line)`
- **构建流程**：`_construct_ckg()` 遍历文件，按扩展名映射语言（Python/Java/Cpp/C/TypeScript/JavaScript），用 `tree-sitter` 解析 AST，分语言 visitor 提取函数/类/方法
- **查询 API**：
  - `query_function(identifier, entry_type="function" | "class_method") -> list[FunctionEntry]`
  - `query_class(identifier) -> list[ClassEntry]`

> 已知问题：索引子目录会重建；只整库重建未做增量；JS/TS 匿名/箭头函数解析不完整。

---

## 6. 运行时调用流程

### 6.1 单次 `trae-cli run` 主流程

```
trae-cli run "task" --provider X --model Y --working-dir D
        │
        ▼
cli.run()                                     [trae_agent/cli.py]
  ├── resolve_config_file()                  YAML→JSON 回退
  ├── (可选) check_docker() + build_with_pyinstaller()
  ├── 读取 task（参数 or --file）
  ├── Config.create(config_file=...)
  │     .resolve_config_values(provider, model, ...)
  ├── ConsoleFactory.create_console(SIMPLE/RICH, RUN)
  ├── Path(working_dir).mkdir(...) + abspath 校验
  ├── Agent(agent_type, config, trajectory_file, cli_console,
  │         docker_config=docker_config, docker_keep=docker_keep)
  │     ├── 选择 TraeAgent
  │     │     └── BaseAgent.__init__:
  │     │           - LLMClient(model_config)             创建 provider 客户端
  │     │           - 实例化 tools_registry[tool_name]    工具列表
  │     │           - ToolExecutor(self._tools)
  │     │           - 若 docker_config：DockerManager + DockerToolExecutor
  │     │           - clear_older_ckg()                    清理过期 CKG DB
  │     ├── set_cli_console(cli_console)
  │     ├── if enable_lakeview: cli_console.set_lakeview(config.lakeview)
  │     └── set_trajectory_recorder(recorder)             注入 LLM Client
  │
  └── asyncio.run(agent.run(task, task_args))
        │
        ▼
Agent.run()                                   [trae_agent/agent/agent.py]
  ├── TraeAgent.new_task(task, extra_args, tool_names)
  │     ├── 设置默认 TraeAgentToolNames
  │     ├── _initial_messages = [system_prompt, user_msg]
  │     │     user_msg: [Project root path] + [Problem statement]
  │     └── trajectory_recorder.start_recording(...)
  ├── if allow_mcp_servers: await initialise_mcp()
  │     └── discover_mcp_tools()：循环 mcp_servers_config
  │           ├── MCPClient().connect_and_discover(...)
  │           └── mcp_tools 追加到 self._tools
  ├── cli_console.print_task_details(...)
  ├── asyncio.create_task(cli_console.start())
  └── await TraeAgent.execute_task()
        │
        ▼
BaseAgent.execute_task()                      [trae_agent/agent/base_agent.py]
  ├── (docker) docker_manager.start()
  ├── execution = AgentExecution(task, steps=[])
  ├── while step_number <= max_steps:
  │     ├── step = AgentStep(step_number, THINKING)
  │     ├── messages = await _run_llm_step(step, messages, execution)
  │     │     ├── llm_response = self._llm_client.chat(messages, model_config, tools)
  │     │     │     └── 内部：retry_with(_create_*_response)
  │     │     │           → provider SDK → parse tool_calls → 记录 trajectory
  │     │     ├── step.llm_response = llm_response
  │     │     ├── _update_llm_usage()
  │     │     ├── if llm_indicates_task_completed():
  │     │     │     ├── if _is_task_completed(): COMPLETED, return
  │     │     │     │     (TraeAgent: must_patch=true 时校验 git diff 非空)
  │     │     │     └── else: 返回 task_incomplete_message() 让 LLM 继续
  │     │     └── else: messages = await _tool_call_handler(tool_calls, step)
  │     │           ├── step.state = CALLING_TOOL
  │     │           ├── tool_results = await _tool_caller.parallel/sequential_tool_call(...)
  │     │           │     (Docker 模式：DockerToolExecutor._execute_in_docker)
  │     │           ├── messages += [LLMMessage(role=user, tool_result=r) for r in results]
  │     │           └── reflection = reflect_on_result(results)  # TraeAgent 返回 None
  │     ├── await _finalize_step(step, messages, execution)
  │     │     ├── step.state = COMPLETED
  │     │     ├── _record_handler(): trajectory_recorder.record_agent_step(...)
  │     │     ├── _update_cli_console()
  │     │     └── execution.steps.append(step)
  │     └── step_number++
  ├── if step_number > max_steps: execution.ERROR
  ├── (docker, not keep) docker_manager.stop()
  ├── await _close_tools()
  ├── await cleanup_mcp_clients()
  ├── TraeAgent.execute_task() 收尾：
  │     ├── trajectory_recorder.finalize_recording(success, final_result)
  │     └── if patch_path: write get_git_diff()
  └── return execution
```

### 6.2 工具调用流程（含 Docker）

```
LLM 返回 tool_calls=[ToolCall(name, call_id, arguments), ...]
        │
        ▼
ToolExecutor.execute_tool_call(tool_call)
  ├── _normalize_name(name) → 查找 tool
  ├── tool.execute(arguments) → ToolExecResult(output/error/error_code)
  └── 包成 ToolResult(call_id, name, success, result, error, id)

DockerToolExecutor.sequential_tool_call(tool_calls)
  ├── 对每个 call：
  │     ├── 若 name in docker_tools_set:
  │     │     ├── _translate_path(arguments['path'])
  │     │     ├── _execute_in_docker(call):
  │     │     │     ├── bash: cmd = arguments['command']
  │     │     │     ├── str_replace_based_edit_tool: cmd = "$CONTAINER_TOOLS_PATH/edit_tool <sub> --key 'value' ..."
  │     │     │     ├── json_edit_tool: cmd = "$CONTAINER_TOOLS_PATH/json_edit_tool --key 'value' ..."
  │     │     │     │     (其中 --value 用 json.dumps 序列化)
  │     │     │     └── exit_code, output = docker_manager.execute(cmd)
  │     │     └── → ToolResult(success=(exit_code==0), result=output, error=...)
  │     └── else: 走 original_executor.sequential_tool_call([call])[0]
```

---

## 7. 依赖关系

### 7.1 模块间依赖图

```
cli.py
 ├─→ Agent (agent/agent.py)
 │    ├─→ TraeAgent (agent/trae_agent.py)
 │    │    ├─→ BaseAgent (agent/base_agent.py)
 │    │    │    ├─→ LLMClient (utils/llm_clients/llm_client.py)
 │    │    │    │    └─→ {Anthropic,OpenAI,Google,Azure,Doubao,OpenRouter,Ollama}Client
 │    │    │    ├─→ ToolExecutor / DockerToolExecutor (tools/)
 │    │    │    │    └─→ tools_registry → {BashTool, TextEditorTool, JSONEditTool,
 │    │    │    │                                    SequentialThinkingTool, TaskDoneTool, CKGTool}
 │    │    │    ├─→ DockerManager (agent/docker_manager.py)
 │    │    │    ├─→ TrajectoryRecorder (utils/trajectory_recorder.py)
 │    │    │    └─→ clear_older_ckg() (tools/ckg/ckg_database.py)
 │    │    ├─→ MCPClient (utils/mcp_client.py) → MCPTool (tools/mcp_tool.py)
 │    │    └─→ TRAE_AGENT_SYSTEM_PROMPT (prompt/agent_prompt.py)
 │    ├─→ TrajectoryRecorder
 │    └─→ CLIConsole (utils/cli/cli_console.py)
 │         ├─→ SimpleCLIConsole / RichCLIConsole
 │         └─→ LakeView (utils/lake_view.py)
 └─→ Config (utils/config.py)
      └─→ (legacy) LegacyConfig (utils/legacy_config.py)
```

### 7.2 第三方依赖（`pyproject.toml`）

| 依赖 | 用途 |
|------|------|
| `openai>=1.86.0` | OpenAI Responses API + Azure + Doubao + OpenRouter 客户端 |
| `anthropic>=0.54.0,<=0.60.0` | Anthropic Claude 客户端 |
| `click>=8.0.0` | CLI 框架 |
| `google-genai>=1.24.0` | Google Gemini 客户端 |
| `jsonpath-ng>=1.7.0` | JSONEditTool 的 JSONPath 解析 |
| `pydantic>=2.0.0` | 数据校验 |
| `python-dotenv>=1.0.0` | `.env` 加载 |
| `rich>=13.0.0` | Simple 控制台美化输出 |
| `typing-extensions>=4.0.0` | 类型增强（`@override` 等） |
| `ollama>=0.5.1` | Ollama 客户端 |
| `socksio>=1.0.0` | SOCKS 代理支持 |
| `tree-sitter==0.21.3` + `tree-sitter-languages==1.10.2` | CKG 代码解析 |
| `ruff>=0.12.4` | Lint + format |
| `mcp==1.12.2` | MCP 协议客户端 |
| `asyncclick>=8.0.0` | 异步 Click（部分场景） |
| `pyyaml>=6.0.2` | YAML 配置解析 |
| `textual>=0.50.0` | Rich TUI 框架 |
| `pyinstaller==6.15.0` | 打包 edit_tool / json_edit_tool 为二进制 |

可选依赖：
- `test`：pytest、pytest-asyncio、pytest-mock、pytest-cov、pre-commit
- `evaluation`：datasets、docker、pexpect、unidiff

### 7.3 工具调用路径依赖

| 调用路径 | 涉及模块 |
|----------|----------|
| 本地工具调用 | `BaseAgent._tool_caller (ToolExecutor)` → `Tool.execute()` |
| Docker 内工具调用 | `DockerToolExecutor._execute_in_docker()` → `DockerManager.execute()` → 容器内 `edit_tool`/`json_edit_tool` ELF |
| MCP 工具调用 | `MCPTool.execute()` → `MCPClient.call_tool()` → MCP server (stdio) |

---

## 8. 安装、配置与运行

### 8.1 安装

```bash
git clone https://github.com/bytedance/trae-agent.git
cd trae-agent
uv sync --all-extras          # 安装全部依赖（含 test/evaluation）
source .venv/bin/activate
```

`pyproject.toml` 注册的入口：
```toml
[project.scripts]
trae-cli = "trae_agent.cli:main"
```

### 8.2 配置

**YAML（推荐）**：复制 `trae_config.yaml.example` 为 `trae_config.yaml`，按需修改。

完整字段示例（来自 `trae_config.yaml.example`）：

```yaml
agents:
  trae_agent:
    enable_lakeview: true
    model: trae_agent_model      # 引用 models: 段中的模型名
    max_steps: 200
    tools:
      - bash
      - str_replace_based_edit_tool
      - sequentialthinking
      - task_done
allow_mcp_servers:
  - playwright                   # 仅启用此 MCP server
mcp_servers:
  playwright:
    command: npx
    args: ["@playwright/mcp@0.0.27"]
lakeview:
  model: lakeview_model          # Lakeview 用的独立模型
model_providers:
  anthropic:
    api_key: your_anthropic_api_key
    provider: anthropic
  openai:
    api_key: your_openai_api_key
    provider: openai
    base_url: https://api.example.com/v1   # 可选自定义端点
models:
  trae_agent_model:
    model_provider: anthropic
    model: claude-4-sonnet
    max_tokens: 4096
    temperature: 0.5
    top_p: 1
    top_k: 0
    max_retries: 10
    parallel_tool_calls: true
  lakeview_model:
    model_provider: anthropic
    model: claude-3.5-sonnet
    ...
```

**环境变量（可选覆盖）**：

```bash
export OPENAI_API_KEY="..."        OPENAI_BASE_URL="..."
export ANTHROPIC_API_KEY="..."     ANTHROPIC_BASE_URL="..."
export GOOGLE_API_KEY="..."        GOOGLE_BASE_URL="..."
export OPENROUTER_API_KEY="..."    OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
export DOUBAO_API_KEY="..."        DOUBAO_BASE_URL="https://ark.cn-beijing.volces.com/api/v3/"
```

也可写入 `.env` 文件（`cli.py` 顶部 `load_dotenv()` 会自动加载）。

**Legacy JSON**：仍兼容 `trae_config.json`，会通过 `create_from_legacy_config()` 自动迁移，详见 [docs/legacy_config.md](file:///tmp/trae-agent/docs/legacy_config.md)。

**配置优先级**：CLI 参数 > 环境变量 > 配置文件 > 默认值。

### 8.3 基本命令

```bash
# 单次任务
trae-cli run "Create a hello world Python script"
trae-cli run "Fix the bug in main.py" --provider openai --model gpt-4o
trae-cli run "Add unit tests" --provider anthropic --model claude-sonnet-4-20250514
trae-cli run "Optimize this algorithm" --provider google --model gemini-2.5-flash
trae-cli run "Review this code" --provider openrouter --model "anthropic/claude-3-5-sonnet"
trae-cli run "Refactor the database module" --provider doubao --model doubao-seed-1.6
trae-cli run "Comment this code" --provider ollama --model qwen3

# 查看配置
trae-cli show-config

# 交互模式
trae-cli interactive --provider openai --model gpt-4o --max-steps 30

# 高级选项
trae-cli run "Add tests for utils module" --working-dir /path/to/project
trae-cli run "Debug authentication" --trajectory-file debug_session.json
trae-cli run "Update API endpoints" --must-patch           # 强制要求生成 patch
trae-cli run "Update API endpoints" --console-type rich     # 切换 TUI
trae-cli run "Update API endpoints" --agent-type trae_agent # 切换 agent（目前仅此一种）

# 从文件读取任务
trae-cli run --file task_description.txt

# 列出所有可用工具
trae-cli tools
```

**交互模式内置命令**：`status` / `help` / `clear` / `exit` / `quit`，或直接输入任务描述执行。

### 8.4 轨迹记录

```bash
# 默认保存到 trajectories/trajectory_<时间戳>.json
trae-cli run "Debug the authentication module"

# 自定义路径
trae-cli run "Optimize database queries" --trajectory-file optimization_debug.json
```

轨迹文件结构详见 §13。

---

## 9. Docker 沙箱模式

通过 `--docker-*` 系列参数将工具调用路由到容器内执行（与 §5.2 中的 `DockerToolExecutor` 对应）：

```bash
# 使用现有镜像
trae-cli run "Add tests for utils module" --docker-image python:3.11

# 使用现有镜像并挂载工作目录
trae-cli run "write a script to print helloworld" \
    --docker-image python:3.12 --working-dir test_workdir/

# attach 到已存在的容器（--working-dir 此时无效）
trae-cli run "Update API endpoints" --docker-container-id 91998a56056c

# 用 Dockerfile 构建环境
trae-cli run "Debug authentication" --dockerfile-path test_workspace/Dockerfile

# 从 tar 归档加载镜像
trae-cli run "Fix the bug in main.py" --docker-image-file test_workspace/trae_agent_custom.tar

# 任务结束后删除容器（默认保留）
trae-cli run "Add tests for utils module" --docker-image python:3.11 --docker-keep false
```

**关键行为**：
- `--docker-image` / `--docker-container-id` / `--dockerfile-path` / `--docker-image-file` **互斥**
- 首次使用 Docker 模式时会调用 `build_with_pyinstaller()` 把 `edit_tool_cli.py` 与 `json_edit_tool_cli.py` 编译为 ELF 二进制（产出在 `trae_agent/dist/`），随后 `docker cp` 到容器 `/agent_tools` 路径
- 容器工作目录固定为 `/workspace`，宿主 `working-dir` 会以读写模式挂载到该路径
- 持久 shell 通过 `pexpect.spawn("docker exec -it <id> /bin/bash")` 维持
- 在容器内执行的工具：`bash`、`str_replace_based_edit_tool`、`json_edit_tool`；其他工具仍在宿主执行

---

## 10. MCP 集成

### 10.1 配置

在 `trae_config.yaml` 中加入：

```yaml
mcp_servers:
  playwright:
    command: npx
    args: ["@playwright/mcp@0.0.27"]

allow_mcp_servers:
  - playwright        # 仅启用该 server
```

`MCPServerConfig` 支持的传输：
- **stdio**（已实现）：`command` / `args` / `env` / `cwd`
- SSE（`url`）/ HTTP（`http_url`）/ WebSocket（`tcp`）：当前抛 `NotImplementedError`

### 10.2 运行时流程

1. `Agent.run()` 检测 `agent.allow_mcp_servers` 非空 → 调用 `TraeAgent.initialise_mcp()`
2. `discover_mcp_tools()` 遍历 `mcp_servers_config`，跳过未在 `allow_mcp_servers` 中的
3. 对每个 server 创建 `MCPClient()`：
   - `connect_and_discover()` → `connect_to_server()` → `session.initialize()` → `list_tools()`
   - 把每个 server 工具包装为 `MCPTool(client, tool, model_provider)` 加入 `self.mcp_tools`
4. `mcp_tools` 被追加到 `self._tools`，与内置工具一起进入 LLM 的工具 schema
5. LLM 调用 MCP 工具时，`MCPTool.execute()` → `client.call_tool(name, args)`
6. 任务结束或异常时 `cleanup_mcp_clients()` 关闭所有 `AsyncExitStack`

---

## 11. Lakeview 步骤摘要子系统

**目的**：用第二个 LLM（Lakeview 模型）对 Agent 的每一步生成「简短任务描述 + 详细说明 + 标签」，让人类观察者一眼理解 Agent 在做什么。

**配置**：
```yaml
agents:
  trae_agent:
    enable_lakeview: true       # 总开关
lakeview:
  model: lakeview_model         # 引用独立模型
```

**工作流程**（`LakeView.create_lakeview_step(agent_step)`）：
1. `extract_task_in_step(prev_step, this_step)`：
   - 构造 few-shot 对话（`<previous_step>` + `<this_step>`）
   - 强制 `temperature=0.1`，`reuse_history=False`（无状态）
   - 期望响应包含 `<task>...</task>` 与 `<details>...</details>` 标签
   - 最多重试 10 次直到格式正确
2. `extract_tag_in_step(step)`：
   - 若累计轨迹 > 300K 字符则跳过
   - 期望响应包含 `<tags>tag1, tag2</tags>`，标签必须取自 `KNOWN_TAGS`
3. 组装为 `LakeViewStep(desc_task, desc_details, tags_emoji)`

**集成点**：
- `CLIConsole.set_lakeview(config.lakeview)` 构造 `LakeView` 实例
- `SimpleCLIConsole.update_status()` 在步骤完成时通过 `asyncio.create_task(self._create_lakeview_step_display(agent_step))` 后台启动摘要生成（不阻塞主流程）
- 摘要结果可通过 `TrajectoryRecorder.update_lakeview(step_number, summary)` 持久化

**已知标签**：`WRITE_TEST` ☑️ / `VERIFY_TEST` ✅ / `EXAMINE_CODE` 👁️ / `WRITE_FIX` 📝 / `VERIFY_FIX` 🔥 / `REPORT` 📣 / `THINK` 🧠 / `OUTLIER` ⁉️

---

## 12. CKG 代码知识图谱子系统

**目的**：让 Agent 通过 `ckg` 工具按函数/类/方法名快速定位源码，而无需 `grep` 整库扫描。

### 12.1 数据结构

```python
@dataclass
class FunctionEntry:
    name, file_path, body, start_line, end_line
    parent_function: str | None    # 嵌套函数
    parent_class: str | None      # 类方法

@dataclass
class ClassEntry:
    name, file_path, body, start_line, end_line
    fields: str | None             # 字段签名
    methods: str | None            # 方法签名列表
```

支持语言（`extension_to_language`）：`.py` / `.java` / `.cpp/.hpp/.c++/.cxx/.cc` / `.c/.h` / `.ts/.tsx` / `.js/.jsx`。

### 12.2 `CKGDatabase`

- 存储路径：`~/.trae-agent/ckg/<snapshot_hash>.db`（SQLite）
- 过期清理：`clear_older_ckg()` 在 `BaseAgent.__init__()` 调用，删除超过 1 周的 `.db` 文件
- **快照哈希策略**：
  - 是 git 仓库 + 工作区干净：`git-clean-<commit>`
  - 是 git 仓库 + 有改动：`git-dirty-<commit>-<md5(porcelain)[:8]>`
  - 否则：`metadata-<md5(file_name+mtime+size)>`
- 命中缓存：复用已有 `.db`；未命中：删旧库、建新库、`_construct_ckg()`
- 构建过程：`glob("**/*")` 跳过隐藏文件 → 按扩展名选 tree-sitter parser → 分语言 visitor 提取 AST 节点 → `INSERT` 入库

### 12.3 查询接口

| 命令 | SQL | 用途 |
|------|-----|------|
| `search_function` | `SELECT ... FROM functions WHERE name=? AND parent_class IS NULL` | 查找顶层函数 |
| `search_class_method` | `SELECT ... FROM functions WHERE name=? AND parent_class IS NOT NULL` | 查找类方法 |
| `search_class` | `SELECT ... FROM classes WHERE name=?` | 查找类 |

返回结果以 `file_path:start-end` + 源码 body 形式输出，超过 `MAX_RESPONSE_LEN=16000` 字符时截断并附加 `<response clipped>` 标记。

---

## 13. 轨迹记录与评估

### 13.1 轨迹文件结构

`TrajectoryRecorder` 会在以下时机写入 JSON：
- `start_recording()` — 任务开始时
- 每次 `record_llm_interaction()` 之后 — 记录 LLM 调用细节（含 input_messages、response、usage、tools_available）
- 每次 `record_agent_step()` 之后 — 记录步骤状态、工具调用、工具结果、reflection、error
- `finalize_recording()` — 设置 end_time、success、final_result、execution_time

最终 JSON 形如：
```json
{
  "task": "...",
  "start_time": "2025-...",
  "end_time": "2025-...",
  "provider": "anthropic",
  "model": "claude-...",
  "max_steps": 200,
  "llm_interactions": [
    {"timestamp": "...", "provider": "...", "model": "...",
     "input_messages": [...], "response": {"content": "...", "usage": {...}, "tool_calls": [...],
     "tools_available": ["bash", "str_replace_based_edit_tool", ...]}
  ],
  "agent_steps": [
    {"step_number": 1, "state": "completed",
     "llm_messages": [...], "llm_response": {...},
     "tool_calls": [...], "tool_results": [...], "reflection": null, "error": null,
     "lakeview_summary": {...}}
  ],
  "success": true,
  "final_result": "...",
  "execution_time": 12.34
}
```

### 13.2 SWE-bench 评估

入口：`evaluation/run_evaluation.py` 中的 `BenchmarkEvaluation` 类。

**支持的 benchmark**：
- **SWE-bench**：`SWE-bench_Verified` / `SWE-bench_Lite` / `SWE-bench`
- **SWE-bench-Live**：`lite` / `verified` / `full`
- **Multi-SWE-bench**：`flash` / `mini`（需手动下载 jsonl 到 `evaluation/`）

**三种模式**：
- `expr` — 仅生成 patch（不评估）
- `eval` — 仅评估已有 patch
- `e2e` — 端到端（默认）

**使用示例**：
```bash
cd evaluation
./setup.sh swe_bench                 # 一键拉取并安装 harness
python run_evaluation.py \
  --benchmark SWE-bench \
  --dataset SWE-bench_Verified \
  --config-file ./trae_config.yaml \
  --run-id experiment-1 \
  --benchmark-harness-path ./SWE-bench \
  --mode e2e \
  --max_workers 4 \
  --instance_ids astropy__astropy-13453
```

**输出**（位于 `results/{benchmark}_{dataset}_{run_id}/`）：
```
predictions.json              # 供评估的 patch 集合
results.json                  # 评估结果（pass/fail）
{instance_id}/
  ├── problem_statement.txt
  ├── {instance_id}.patch     # Trae Agent 生成的补丁
  └── {instance_id}.json      # 轨迹文件
trae-workspace/
  ├── trae_config.yaml
  ├── trae-agent.tar          # Trae Agent 构建产物
  ├── uv.tar / uv_shared.tar  # uv 二进制
```

`evaluation/patch_selection/` 是一个独立的子项目，用于评估多个候选 patch 并选择最优。

---

## 14. 测试与开发

### 14.1 测试

```bash
# 跳过外部服务测试，快速跑全部
make uv-test

# 同上但不通过 uv
make test

# 单独跑某个文件
uv run pytest tests/tools/test_bash_tool.py -v
```

环境变量 `SKIP_OLLAMA_TEST=true` / `SKIP_OPENROUTER_TEST=true` / `SKIP_GOOGLE_TEST=true` 用于跳过需要真实 API Key 的集成测试。

测试覆盖：
- `tests/test_cli.py` — CLI 入口
- `tests/agent/test_trae_agent.py` — Agent 主流程
- `tests/tools/test_{bash,edit,json_edit,mcp}_tool.py` — 各工具
- `tests/utils/test_{config,google_client,mcp_client,ollama_client,openrouter_client}_utils.py` — 基础设施

pytest 配置（`pyproject.toml`）：
- `asyncio_mode = "auto"` — 自动处理 async 测试
- 标记：`slow` / `integration` / `unit`
- 覆盖率：`source = ["trae_agent"]`，omit `tests/*`

### 14.2 代码质量

```bash
make install-dev              # 创建 venv + 安装全部依赖
make pre-commit               # 安装并运行 pre-commit
make pre-commit-run           # 仅运行
make fix-format               # ruff format + check --fix
```

`.pre-commit-config.yaml` 包含：
- `pre-commit-hooks`：trailing-whitespace / end-of-file-fixer / check-yaml / check-toml / check-added-large-files / detect-private-key
- `ruff`（`--fix`）+ `ruff-format`
- `codespell`（排除 `.jsonl`）
- `mypy`（排除 `evaluation/patch_selection`，附 `types-PyYAML`）

ruff 配置（`pyproject.toml`）：
- `line-length = 100`
- 启用规则集：`B`（bugbear）、`SIM`（simplify）、`C4`（comprehensions）、`E4/E7/E9`、`F`（pyflakes）、`I`（isort）

### 14.3 GitHub Actions

- `.github/workflows/pre-commit.yml` — 预提交检查
- `.github/workflows/unit-test.yml` — 单元测试

---

## 15. 路线图

摘自 [docs/roadmap.md](file:///tmp/trae-agent/docs/roadmap.md)，未来重点方向：

1. **SDK 开发** — 提供 Headless 程序化接口，支持流式轨迹记录，便于集成到 CI/CD 与研究工作流
2. **沙箱环境** — 隔离 + 并行的任务执行容器（当前已有 Docker 模式雏形）
3. **轨迹分析** — 与 Weights & Biases Weave、MLFlow 等 MLOps 平台集成
4. **工具与 MCP 扩展** — 增强 Jupyter Notebook、配置文件等结构化文件支持；继续推进 MCP 标准化
5. **多 Agent 协作** — 多个专业化 Agent 协同处理复杂任务，支持高级 workflow 模式

社区可通过 GitHub issue 提交 feature request、参与 RFC 讨论或直接贡献代码。

---

## 附录 A：内置工具速查表

| Registry Key | 文件 | 类 | 用途 |
|---|---|---|---|
| `bash` | `bash_tool.py` | `BashTool` | 持久 bash 会话执行命令（120s 超时，可 restart） |
| `str_replace_based_edit_tool` | `edit_tool.py` | `TextEditorTool` | view / create / str_replace / insert 文件操作 |
| `json_edit_tool` | `json_edit_tool.py` | `JSONEditTool` | 基于 JSONPath 的 JSON 文件 view / set / add / remove |
| `sequentialthinking` | `sequential_thinking_tool.py` | `SequentialThinkingTool` | 结构化分步思考，支持修订与分支 |
| `task_done` | `task_done_tool.py` | `TaskDoneTool` | 声明任务完成（无参数） |
| `ckg` | `ckg_tool.py` | `CKGTool` | 查询代码知识图谱（函数/类/方法） |
| (动态) | `mcp_tool.py` | `MCPTool` | 动态包裹 MCP server 工具 |
| (executor) | `docker_tool_executor.py` | `DockerToolExecutor` | 路由工具调用到 Docker 容器 |

## 附录 B：LLM Provider 速查表

| Provider | 客户端类 | 基类 | SDK | 备注 |
|---|---|---|---|---|
| `openai` | `OpenAIClient` | `BaseLLMClient` | `openai` (Responses API) | 支持 reasoning tokens |
| `anthropic` | `AnthropicClient` | `BaseLLMClient` | `anthropic` | 分离 system；prompt cache tokens |
| `google` | `GoogleClient` | `BaseLLMClient` | `google-genai` | `Content` 格式；UUID call_id |
| `azure` | `AzureClient` | `OpenAICompatibleClient` | `openai.AzureOpenAI` | 要求 base_url + api_version |
| `doubao` | `DoubaoClient` | `OpenAICompatibleClient` | `openai.OpenAI` | 火山方舟兼容端点 |
| `openrouter` | `OpenRouterClient` | `OpenAICompatibleClient` | `openai.OpenAI` | 多模型聚合，发送 Referer/Title |
| `ollama` | `OllamaClient` | `BaseLLMClient` | `ollama.chat` | 本地模型，无 usage 统计 |

## 附录 C：关键数据类速查

| 数据类 | 位置 | 字段摘要 |
|---|---|---|
| `LLMMessage` | `utils/llm_clients/llm_basics.py` | role, content, tool_call, tool_result |
| `LLMResponse` | 同上 | content, usage, model, finish_reason, tool_calls |
| `LLMUsage` | 同上 | input/output/cache_creation/cache_read/reasoning tokens；支持 `__add__` |
| `ToolCall` | `tools/base.py` | name, call_id, arguments, id |
| `ToolResult` | 同上 | call_id, name, success, result, error, id |
| `ToolExecResult` | 同上 | output, error, error_code |
| `ToolParameter` | 同上 | name, type, description, enum, items, required |
| `AgentStep` | `agent/agent_basics.py` | step_number, state, thought, tool_calls, tool_results, llm_response, reflection, error |
| `AgentExecution` | 同上 | task, steps, final_result, success, total_tokens, execution_time, agent_state |
| `ModelConfig` | `utils/config.py` | model, model_provider, temperature, top_p, top_k, parallel_tool_calls, max_retries, max_tokens, ... |
| `ModelProvider` | 同上 | api_key, provider, base_url, api_version |
| `TraeAgentConfig` | 同上 | enable_lakeview + 继承自 AgentConfig |
| `LakeviewConfig` | 同上 | model: ModelConfig |
| `MCPServerConfig` | 同上 | command, args, env, cwd, url, http_url, headers, tcp, timeout, trust, description |

---

*本文档由源码静态分析整理，覆盖 `trae_agent/`、`evaluation/`、`tests/`、`docs/` 全部模块。如需查看具体实现细节，请通过文中提供的源码链接跳转到对应文件。*
