"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Key, Plus, Trash2, Copy, Check, Bot, ExternalLink,
  Terminal, Wrench, ChevronDown, ChevronUp,
} from "lucide-react";

interface AgentToken {
  id: number;
  name: string;
  token_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface DeployPlatform {
  name: string;
  description: string;
  commands?: { label: string; command: string; description: string }[];
  systemPrompt: string;
  apiTools?: {
    name: string;
    description: string;
    method: string;
    path: string;
    parameters?: Record<string, unknown>;
  }[];
  curlExamples: string[];
}

interface DeployData {
  baseUrl: string;
  platforms: Record<string, DeployPlatform>;
}

export function AuthSettingsView() {
  const { token, logout } = useAuth();
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Agent 一键部署
  const [deployData, setDeployData] = useState<DeployData | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [selectedTokenValue, setSelectedTokenValue] = useState<string>("");
  const [expandedCurl, setExpandedCurl] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/agent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTokens(data.data);
      }
    } catch (err) {
      console.error("获取 Agent Token 列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchDeployData = useCallback(async () => {
    if (!token) return;
    setDeployLoading(true);
    try {
      const res = await fetch("/api/auth/agent/deploy", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDeployData(data.data);
      }
    } catch (err) {
      console.error("获取部署配置失败", err);
    } finally {
      setDeployLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTokens();
    fetchDeployData();
  }, [fetchTokens, fetchDeployData]);

  const handleCreate = async () => {
    if (!token || !createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/auth/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: createName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const newToken = data.data.token as string;
        setCreatedToken(newToken);
        setCreateName("");
        // 自动填入部署区
        setSelectedTokenValue(newToken);
        setSelectedTokenId(data.data.id);
        await fetchTokens();
      }
    } catch (err) {
      console.error("创建 Agent Token 失败", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!token || !revokeId) return;
    setRevoking(true);
    try {
      await fetch(`/api/auth/agent/${revokeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      // 如果撤销的是当前选中的 token，清空部署区
      if (revokeId === selectedTokenId) {
        setSelectedTokenValue("");
        setSelectedTokenId(null);
      }
      await fetchTokens();
    } catch (err) {
      console.error("撤销 Agent Token 失败", err);
    } finally {
      setRevoking(false);
      setRevokeId(null);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const guideUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/guide`
    : "/api/auth/guide";

  // 替换 token 占位符为实际值
  const fillToken = (text: string) =>
    selectedTokenValue
      ? text.replace(/<YOUR_TOKEN>/g, selectedTokenValue)
      : text;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground mt-1">管理管理员账号与 Agent 调用凭证</p>
      </div>

      {/* 管理员账号 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">管理员账号</CardTitle>
          <CardDescription>当前已登录的管理员账号</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">管理员</p>
                <p className="text-sm text-muted-foreground">已登录</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              退出登录
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent 调用凭证 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Agent 调用凭证</CardTitle>
              <CardDescription>
                为 AI Agent 创建访问凭证，Agent 可通过 CLI 或 API 操作系统数据
              </CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) setCreatedToken(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  创建凭证
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建 Agent 凭证</DialogTitle>
                  <DialogDescription>
                    创建后，Token 仅显示一次，请妥善保存。
                  </DialogDescription>
                </DialogHeader>

                {!createdToken ? (
                  <>
                    <div className="space-y-2">
                      <Label>凭证名称</Label>
                      <Input
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="如：My Agent、Claude Bot"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreate}
                        disabled={!createName.trim() || creating}
                      >
                        {creating ? "创建中..." : "创建"}
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                        凭证创建成功！请立即复制保存，关闭后无法再次查看。
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border font-mono break-all">
                          {createdToken}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyText(createdToken, "new-token")}
                        >
                          {copied === "new-token" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md bg-muted p-4 text-sm space-y-2">
                      <p className="font-medium">使用方式：</p>
                      <p>1. CLI 命令行：</p>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 bg-background px-2 py-1 rounded text-xs font-mono break-all">
                          npx tsx scripts/cli.ts --token {createdToken} --api-base {deployData?.baseUrl || guideUrl.replace("/api/auth/guide", "")} guide
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                          onClick={() => copyText(
                            `npx tsx scripts/cli.ts --token ${createdToken} --api-base ${deployData?.baseUrl || guideUrl.replace("/api/auth/guide", "")} guide`,
                            "new-cli"
                          )}
                        >
                          {copied === "new-cli" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p>2. HTTP API：</p>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 bg-background px-2 py-1 rounded text-xs font-mono break-all">
                          Authorization: Bearer {createdToken}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                          onClick={() => copyText(createdToken, "new-bearer")}
                        >
                          {copied === "new-bearer" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p>3. 查看完整引导：</p>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 bg-background px-2 py-1 rounded text-xs font-mono break-all">
                          curl -H &quot;Authorization: Bearer {createdToken}&quot; {guideUrl}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                          onClick={() => copyText(
                            `curl -H "Authorization: Bearer ${createdToken}" ${guideUrl}`,
                            "new-curl"
                          )}
                        >
                          {copied === "new-curl" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button onClick={() => {
                        setCreateOpen(false);
                        setCreatedToken(null);
                      }}>
                        已保存
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">暂无 Agent 凭证</p>
              <p className="text-sm text-muted-foreground">创建凭证后，AI Agent 即可通过 CLI 或 API 操作系统数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                          {t.is_active ? "活跃" : "已撤销"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        前缀: {t.token_prefix}...
                        {t.last_used_at && ` · 最后使用: ${new Date(t.last_used_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          // 提示用户此 token 已不可见
                          setSelectedTokenId(t.id);
                          setSelectedTokenValue(""); // 清空，用户需要输入 token
                        }}
                      >
                        用于部署
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`${guideUrl}`, "_blank")}
                      title="查看 Agent 引导"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    {t.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRevokeId(t.id)}
                        title="撤销凭证"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent 一键部署 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Agent 一键部署
          </CardTitle>
          <CardDescription>
            选择或粘贴 Token，复制完整命令到 Agent 平台即可接入
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token 输入 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Agent Token</Label>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                placeholder="粘贴你生成的 Agent Token（创建凭证时显示的完整 Token）"
                value={selectedTokenValue}
                onChange={(e) => {
                  setSelectedTokenValue(e.target.value);
                  setSelectedTokenId(null);
                }}
                className="font-mono text-xs"
              />
              {selectedTokenValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTokenValue("");
                    setSelectedTokenId(null);
                  }}
                  className="shrink-0 text-xs"
                >
                  清除
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              填入 Token 后，下方命令将自动包含实际 Token 值，可直接复制给 Agent 使用。
            </p>
          </div>

          {/* 平台部署选项 */}
          {deployLoading ? (
            <p className="text-sm text-muted-foreground">加载部署配置...</p>
          ) : deployData ? (
            <Tabs defaultValue="hermes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hermes" className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  Hermes
                </TabsTrigger>
                <TabsTrigger value="openclaw" className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  OpenClaw
                </TabsTrigger>
              </TabsList>

              {/* Hermes */}
              <TabsContent value="hermes" className="space-y-4 mt-4">
                {(() => {
                  const platform = deployData.platforms.hermes;
                  return (
                    <>
                      <div className="rounded-md bg-muted/50 p-4">
                        <p className="text-sm font-medium mb-1">Hermes CLI Agent</p>
                        <p className="text-xs text-muted-foreground">{platform.description}</p>
                      </div>

                      {/* 一键命令 */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium">部署命令（直接复制给 Agent）</p>
                        {platform.commands?.map((cmd, i) => (
                          <div key={i} className="rounded-md border bg-background">
                            <div className="flex items-center justify-between px-3 py-2 border-b">
                              <span className="text-xs font-medium text-muted-foreground">{cmd.label}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => copyText(fillToken(cmd.command), `hermes-${i}`)}
                              >
                                {copied === `hermes-${i}` ? (
                                  <><Check className="w-3 h-3 mr-1" />已复制</>
                                ) : (
                                  <><Copy className="w-3 h-3 mr-1" />复制</>
                                )}
                              </Button>
                            </div>
                            <div className="px-3 py-2">
                              <code className="text-xs font-mono break-all">
                                {fillToken(cmd.command)}
                              </code>
                            </div>
                            <div className="px-3 pb-2">
                              <p className="text-xs text-muted-foreground">{cmd.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 系统提示 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">System Prompt</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => copyText(fillToken(platform.systemPrompt), "hermes-prompt")}
                          >
                            {copied === "hermes-prompt" ? (
                              <><Check className="w-3 h-3 mr-1" />已复制</>
                            ) : (
                              <><Copy className="w-3 h-3 mr-1" />复制</>
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs bg-muted/50 rounded-md p-3 max-h-48 overflow-auto whitespace-pre-wrap break-all">
                          {fillToken(platform.systemPrompt)}
                        </pre>
                      </div>

                      {/* curl 示例 */}
                      <div className="space-y-2">
                        <button
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedCurl(
                            expandedCurl === "hermes-curl" ? null : "hermes-curl"
                          )}
                        >
                          {expandedCurl === "hermes-curl" ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          curl 示例
                        </button>
                        {expandedCurl === "hermes-curl" && (
                          <div className="space-y-2">
                            {platform.curlExamples.map((ex, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <code className="flex-1 text-xs bg-muted/50 rounded px-2 py-1.5 font-mono whitespace-pre-wrap break-all">
                                  {fillToken(ex)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => copyText(fillToken(ex), `hermes-curl-${i}`)}
                                >
                                  {copied === `hermes-curl-${i}` ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              {/* OpenClaw */}
              <TabsContent value="openclaw" className="space-y-4 mt-4">
                {(() => {
                  const platform = deployData.platforms.openclaw;
                  return (
                    <>
                      <div className="rounded-md bg-muted/50 p-4">
                        <p className="text-sm font-medium mb-1">OpenClaw Agent 平台</p>
                        <p className="text-xs text-muted-foreground">{platform.description}</p>
                      </div>

                      {/* API 工具配置 */}
                      {platform.apiTools && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">API 工具配置</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => copyText(
                                JSON.stringify(platform.apiTools, null, 2),
                                "openclaw-tools"
                              )}
                            >
                              {copied === "openclaw-tools" ? (
                                <><Check className="w-3 h-3 mr-1" />已复制</>
                              ) : (
                                <><Copy className="w-3 h-3 mr-1" />复制全部</>
                              )}
                            </Button>
                          </div>
                          {platform.apiTools.map((tool, i) => (
                            <div key={i} className="rounded-md border bg-background p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs font-mono font-semibold text-primary">{tool.name}</code>
                                <Badge variant="outline" className="text-xs">{tool.method}</Badge>
                                <code className="text-xs text-muted-foreground">{tool.path}</code>
                              </div>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                              {tool.parameters && (
                                <div className="mt-2">
                                  <code className="text-xs bg-muted/50 rounded px-2 py-1 font-mono break-all">
                                    {JSON.stringify(tool.parameters)}
                                  </code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 系统提示 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">System Prompt</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => copyText(fillToken(platform.systemPrompt), "openclaw-prompt")}
                          >
                            {copied === "openclaw-prompt" ? (
                              <><Check className="w-3 h-3 mr-1" />已复制</>
                            ) : (
                              <><Copy className="w-3 h-3 mr-1" />复制</>
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs bg-muted/50 rounded-md p-3 max-h-48 overflow-auto whitespace-pre-wrap break-all">
                          {fillToken(platform.systemPrompt)}
                        </pre>
                      </div>

                      {/* curl 示例 */}
                      <div className="space-y-2">
                        <button
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedCurl(
                            expandedCurl === "openclaw-curl" ? null : "openclaw-curl"
                          )}
                        >
                          {expandedCurl === "openclaw-curl" ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          curl 示例
                        </button>
                        {expandedCurl === "openclaw-curl" && (
                          <div className="space-y-2">
                            {platform.curlExamples.map((ex, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <code className="flex-1 text-xs bg-muted/50 rounded px-2 py-1.5 font-mono whitespace-pre-wrap break-all">
                                  {fillToken(ex)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => copyText(fillToken(ex), `openclaw-curl-${i}`)}
                                >
                                  {copied === `openclaw-curl-${i}` ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          ) : null}

        </CardContent>
      </Card>

      {/* 撤销确认 */}
      <AlertDialog open={revokeId !== null} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认撤销凭证？</AlertDialogTitle>
            <AlertDialogDescription>
              撤销后，使用该凭证的 Agent 将无法继续访问系统。此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={revoking}>
              {revoking ? "撤销中..." : "确认撤销"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
