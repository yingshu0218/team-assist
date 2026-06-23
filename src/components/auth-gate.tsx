"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, UserPlus, LogIn } from "lucide-react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { authenticated, initialized, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!initialized) {
    return <InitWizard />;
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

import { ReactNode } from "react";

function InitWizard() {
  const { initAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      setError("密码长度不能少于 6 位");
      return;
    }

    setLoading(true);
    const result = await initAdmin(username, password);
    if (!result.success) {
      setError(result.error || "初始化失败");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">初始化管理员账号</CardTitle>
          <CardDescription>
            首次使用，请设置管理员用户名和密码
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="init-username">用户名</Label>
              <Input
                id="init-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入管理员用户名（3-50字符）"
                required
                minLength={3}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="init-password">密码</Label>
              <Input
                id="init-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="init-confirm-password">确认密码</Label>
              <Input
                id="init-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? "创建中..." : "创建管理员账号"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(username, password);
    if (!result.success) {
      setError(result.error || "登录失败");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">管理员登录</CardTitle>
          <CardDescription>
            请输入管理员账号密码登录系统
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">用户名</Label>
              <Input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
