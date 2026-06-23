"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  Upload,
  GitBranch,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Github,
  Server,
  Settings,
  HelpCircle,
} from "lucide-react";
import { HelpDialog } from "@/components/help-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiPost, useFetch, authHeaders } from "@/hooks/use-data";

interface GitConfig {
  provider: "github" | "gitea";
  repoUrl: string;
  branch: string;
  userName: string;
  userEmail: string;
  authToken: string;
}

interface SyncStatus {
  config: GitConfig | null;
  lastSync: string | null;
  isInitialized: boolean;
}

interface SyncSettings {
  autoSyncEnabled: boolean;
  autoSyncInterval: number; // minutes
}

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSyncEnabled: false,
  autoSyncInterval: 30,
};

const DEFAULT_GIT_CONFIG: GitConfig = {
  provider: "github",
  repoUrl: "",
  branch: "main",
  userName: "Ledger App",
  userEmail: "ledger@local",
  authToken: "",
};

export function SyncSettingsView() {
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS);
  const [gitConfig, setGitConfig] = useState<GitConfig>(DEFAULT_GIT_CONFIG);
  const [gitStatus, setGitStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 获取 Git 状态
  const { data: statusData, refetch: refetchStatus } = useFetch<SyncStatus>("/api/sync/git");

  useEffect(() => {
    if (statusData) {
      setGitStatus(statusData);
      if (statusData.config) {
        setGitConfig({
          ...DEFAULT_GIT_CONFIG,
          ...statusData.config,
          // 保留显示的 masked token
          authToken: statusData.config.authToken || "",
        });
      }
    }
  }, [statusData]);

  // 从 localStorage 加载同步设置
  useEffect(() => {
    const saved = localStorage.getItem("ledger-sync-settings");
    if (saved) {
      try {
        setSyncSettings(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // 自动同步定时器
  useEffect(() => {
    if (!syncSettings.autoSyncEnabled) return;

    const interval = setInterval(() => {
      handlePush();
    }, syncSettings.autoSyncInterval * 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncSettings.autoSyncEnabled, syncSettings.autoSyncInterval]);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // 导出数据
  const handleExport = async () => {
    setLoading("export");
    try {
      const res = await fetch("/api/sync", { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "导出失败");

      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage("success", "数据导出成功");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "导出失败");
    } finally {
      setLoading(null);
    }
  };

  // 导入数据
  const handleImport = async (mode: "merge" | "replace") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading("import");
      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        if (mode === "replace" && !confirm("替换模式将清除现有数据，确定继续吗？")) {
          return;
        }

        const res = await apiPost<{ ledgers: number; categories: number; tags: number; transactions: number }>(
          "/api/sync",
          { data: importData.data || importData, mode }
        );

        if (res.success) {
          showMessage("success", `导入成功：${JSON.stringify(res.data)}`);
        } else {
          throw new Error(res.error || "导入失败");
        }
      } catch (err) {
        showMessage("error", err instanceof Error ? err.message : "导入失败，请检查文件格式");
      } finally {
        setLoading(null);
      }
    };
    input.click();
  };

  // Git 设置
  const handleGitSetup = async () => {
    if (!gitConfig.repoUrl || !gitConfig.authToken) {
      showMessage("error", "请填写仓库地址和访问令牌");
      return;
    }

    setLoading("git-setup");
    try {
      const res = await apiPost<{ message: string }>("/api/sync/git", {
        action: "setup",
        config: gitConfig,
      });
      if (res.success) {
        showMessage("success", res.data?.message || "Git 仓库配置成功");
        await refetchStatus();
      } else {
        throw new Error(res.error || "配置失败");
      }
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Git 配置失败");
    } finally {
      setLoading(null);
    }
  };

  // Git 推送
  const handlePush = async () => {
    setLoading("push");
    try {
      const res = await apiPost<{ message: string; pushed: boolean }>("/api/sync/git", {
        action: "push",
      });
      if (res.success) {
        showMessage("success", res.data?.message || "推送成功");
        await refetchStatus();
      } else {
        throw new Error(res.error || "推送失败");
      }
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "推送失败");
    } finally {
      setLoading(null);
    }
  };

  // Git 拉取
  const handlePull = async () => {
    if (!confirm("拉取将合并远程数据到本地，确定继续吗？")) return;
    setLoading("pull");
    try {
      const res = await apiPost<{ message: string }>("/api/sync/git", {
        action: "pull",
      });
      if (res.success) {
        showMessage("success", res.data?.message || "拉取成功");
        await refetchStatus();
      } else {
        throw new Error(res.error || "拉取失败");
      }
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "拉取失败");
    } finally {
      setLoading(null);
    }
  };

  // 保存同步设置
  const saveSyncSettings = (settings: SyncSettings) => {
    setSyncSettings(settings);
    localStorage.setItem("ledger-sync-settings", JSON.stringify(settings));
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return "从未同步";
    const date = new Date(iso);
    return date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">同步与备份</h2>
          <p className="text-muted-foreground mt-1">管理数据导出/导入，配置 Git 远程备份</p>
        </div>
        <HelpDialog triggerVariant="outline" className="gap-2 shrink-0" />
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* 本地导出/导入 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            本地备份
          </CardTitle>
          <CardDescription>将数据导出为 JSON 文件，或从文件导入恢复</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExport}
              disabled={loading === "export"}
              className="gap-2"
            >
              {loading === "export" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              导出数据
            </Button>
            <Button
              variant="outline"
              onClick={() => handleImport("merge")}
              disabled={loading === "import"}
              className="gap-2"
            >
              {loading === "import" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              合并导入
            </Button>
            <Button
              variant="outline"
              onClick={() => handleImport("replace")}
              disabled={loading === "import"}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Upload className="h-4 w-4" />
              替换导入
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            合并导入：保留现有数据并添加新数据 | 替换导入：清空现有数据后导入（谨慎操作）
          </p>
        </CardContent>
      </Card>

      {/* Git 备份配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Git 远程备份
          </CardTitle>
          <CardDescription>
            通过 Git 将数据自动推送到 GitHub 或 Gitea 仓库
            {gitStatus?.lastSync && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Clock className="h-3 w-3" />
                {formatLastSync(gitStatus.lastSync)}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Provider 选择 */}
          <div className="space-y-2">
            <Label>Git 服务商</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={gitConfig.provider === "github" ? "default" : "outline"}
                className="gap-2 flex-1"
                onClick={() => setGitConfig({ ...gitConfig, provider: "github" })}
              >
                <Github className="h-4 w-4" />
                GitHub
              </Button>
              <Button
                type="button"
                variant={gitConfig.provider === "gitea" ? "default" : "outline"}
                className="gap-2 flex-1"
                onClick={() => setGitConfig({ ...gitConfig, provider: "gitea" })}
              >
                <Server className="h-4 w-4" />
                Gitea
              </Button>
            </div>
          </div>

          {/* 仓库地址 */}
          <div className="space-y-2">
            <Label htmlFor="repoUrl">仓库地址</Label>
            <Input
              id="repoUrl"
              placeholder={gitConfig.provider === "github" ? "https://github.com/username/repo.git" : "https://gitea.example.com/username/repo.git"}
              value={gitConfig.repoUrl}
              onChange={(e) => setGitConfig({ ...gitConfig, repoUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              请提前创建好仓库，推荐使用私有仓库
            </p>
          </div>

          {/* 分支 */}
          <div className="space-y-2">
            <Label htmlFor="branch">分支</Label>
            <Input
              id="branch"
              placeholder="main"
              value={gitConfig.branch}
              onChange={(e) => setGitConfig({ ...gitConfig, branch: e.target.value })}
            />
          </div>

          {/* 访问令牌 */}
          <div className="space-y-2">
            <Label htmlFor="authToken">
              {gitConfig.provider === "github" ? "Personal Access Token" : "Access Token"}
            </Label>
            <Input
              id="authToken"
              type="password"
              placeholder={gitConfig.provider === "github" ? "ghp_xxxxxxxxxxxx" : "请输入 Gitea Token"}
              value={gitConfig.authToken}
              onChange={(e) => setGitConfig({ ...gitConfig, authToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {gitConfig.provider === "github"
                ? "在 GitHub Settings > Developer settings > Personal access tokens 中生成，需要 repo 权限"
                : "在 Gitea 设置 > 应用 > 管理 Access Token 中生成，需要仓库读写权限"}
            </p>
          </div>

          {/* 用户信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Git 用户名</Label>
              <Input
                id="userName"
                value={gitConfig.userName}
                onChange={(e) => setGitConfig({ ...gitConfig, userName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Git 邮箱</Label>
              <Input
                id="userEmail"
                type="email"
                value={gitConfig.userEmail}
                onChange={(e) => setGitConfig({ ...gitConfig, userEmail: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleGitSetup}
              disabled={loading === "git-setup"}
              className="gap-2"
            >
              {loading === "git-setup" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              保存配置
            </Button>

            {gitStatus?.isInitialized && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePush}
                  disabled={loading === "push"}
                  className="gap-2"
                >
                  {loading === "push" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  推送备份
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePull}
                  disabled={loading === "pull"}
                  className="gap-2"
                >
                  {loading === "pull" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  拉取恢复
                </Button>
              </>
            )}
          </div>

          {/* 状态指示 */}
          {gitStatus?.isInitialized && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              Git 仓库已初始化
              {gitStatus.lastSync && (
                <span className="ml-2">| 上次同步：{formatLastSync(gitStatus.lastSync)}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自动同步设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            自动同步
          </CardTitle>
          <CardDescription>定时自动将数据推送到 Git 远程仓库</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用自动同步</Label>
              <p className="text-xs text-muted-foreground">
                开启后将按设定间隔自动推送数据到 Git 仓库
              </p>
            </div>
            <Switch
              checked={syncSettings.autoSyncEnabled}
              onCheckedChange={(checked) =>
                saveSyncSettings({ ...syncSettings, autoSyncEnabled: checked })
              }
            />
          </div>

          {syncSettings.autoSyncEnabled && (
            <div className="space-y-2">
              <Label htmlFor="syncInterval">同步间隔</Label>
              <Select
                value={String(syncSettings.autoSyncInterval)}
                onValueChange={(val) =>
                  saveSyncSettings({ ...syncSettings, autoSyncInterval: Number(val) })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">每 5 分钟</SelectItem>
                  <SelectItem value="15">每 15 分钟</SelectItem>
                  <SelectItem value="30">每 30 分钟</SelectItem>
                  <SelectItem value="60">每 1 小时</SelectItem>
                  <SelectItem value="360">每 6 小时</SelectItem>
                  <SelectItem value="720">每 12 小时</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {syncSettings.autoSyncEnabled && !gitStatus?.isInitialized && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              自动同步需要先配置 Git 远程仓库
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
