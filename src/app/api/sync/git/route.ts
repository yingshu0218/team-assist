import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { authenticateRequest, authFailResponse } from "@/lib/auth";

// Git 备份配置与操作
interface GitConfig {
  provider: "github" | "gitea";
  repoUrl: string;
  branch: string;
  userName: string;
  userEmail: string;
  authToken: string;
  lastSync?: string;
}

const SYNC_DIR = join(tmpdir(), "ledger-sync");

function getAuthUrl(config: GitConfig): string {
  const url = new URL(config.repoUrl);
  url.username = config.authToken;
  // 对于 GitHub，token 作为密码放在 URL 中
  if (config.provider === "github") {
    url.password = "x-oauth-basic";
  }
  return url.toString();
}

function ensureSyncDir(): string {
  if (!existsSync(SYNC_DIR)) {
    mkdirSync(SYNC_DIR, { recursive: true });
  }
  return SYNC_DIR;
}

// GET: 获取 Git 同步状态
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();
  try {
    const configPath = join(SYNC_DIR, ".git-config.json");
    let config: GitConfig | null = null;
    let lastSync: string | null = null;
    let isInitialized = false;

    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as GitConfig & { lastSync?: string };
      config = {
        provider: parsed.provider,
        repoUrl: parsed.repoUrl,
        branch: parsed.branch,
        userName: parsed.userName,
        userEmail: parsed.userEmail,
        authToken: "****" + (parsed.authToken?.slice(-4) || ""),
      };
      lastSync = parsed.lastSync || null;
    }

    const repoPath = join(SYNC_DIR, "repo");
    isInitialized = existsSync(join(repoPath, ".git"));

    return NextResponse.json({
      success: true,
      data: { config, lastSync, isInitialized },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取状态失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: 执行 Git 同步操作
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();
  try {
    const body = await request.json() as {
      action: "setup" | "push" | "pull";
      config?: GitConfig;
    };

    ensureSyncDir();
    const repoPath = join(SYNC_DIR, "repo");

    if (body.action === "setup" && body.config) {
      const config = body.config;
      // 保存配置（含 token）
      const configPath = join(SYNC_DIR, ".git-config.json");
      writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

      // 初始化或更新仓库
      if (!existsSync(join(repoPath, ".git"))) {
        const authUrl = getAuthUrl(config);
        execSync(`git clone -b ${config.branch} --single-branch ${authUrl} ${repoPath} 2>&1 || true`, {
          timeout: 30000,
        });
        if (!existsSync(join(repoPath, ".git"))) {
          // clone 失败则 init 新仓库
          mkdirSync(repoPath, { recursive: true });
          execSync(`git init -b ${config.branch}`, { cwd: repoPath });
          execSync(`git remote add origin ${getAuthUrl(config)}`, { cwd: repoPath });
        }
      }

      // 设置 git 用户
      execSync(`git config user.name "${config.userName}"`, { cwd: repoPath });
      execSync(`git config user.email "${config.userEmail}"`, { cwd: repoPath });

      return NextResponse.json({ success: true, data: { message: "Git 仓库初始化成功" } });
    }

    if (body.action === "push") {
      if (!existsSync(join(repoPath, ".git"))) {
        return NextResponse.json(
          { success: false, error: "请先配置 Git 仓库" },
          { status: 400 }
        );
      }

      // 读取配置
      const configPath = join(SYNC_DIR, ".git-config.json");
      if (!existsSync(configPath)) {
        return NextResponse.json(
          { success: false, error: "请先配置 Git 仓库" },
          { status: 400 }
        );
      }
      const config = JSON.parse(readFileSync(configPath, "utf-8")) as GitConfig;

      // 1. 从 API 导出最新数据
      const dataDir = join(repoPath, "data");
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

      // 通过内部 fetch 获取导出数据
      const port = process.env.DEPLOY_RUN_PORT || "5000";
      const exportRes = await fetch(`http://localhost:${port}/api/sync`);
      const exportJson = await exportRes.json();
      if (exportJson.success) {
        writeFileSync(
          join(dataDir, "ledger-backup.json"),
          JSON.stringify(exportJson.data, null, 2),
          "utf-8"
        );
      }

      // 2. Git add + commit + push
      execSync("git add -A", { cwd: repoPath });
      const hasChanges = execSync("git status --porcelain", { cwd: repoPath })
        .toString()
        .trim();

      if (hasChanges) {
        const timestamp = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
        execSync(`git commit -m "backup: ${timestamp}"`, { cwd: repoPath });

        // 更新 remote URL（token 可能变更）
        execSync(`git remote set-url origin ${getAuthUrl(config)}`, { cwd: repoPath });
        execSync(`git push -u origin ${config.branch} 2>&1`, {
          cwd: repoPath,
          timeout: 30000,
        });

        // 更新最后同步时间
        config.lastSync = new Date().toISOString();
        writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      }

      return NextResponse.json({
        success: true,
        data: {
          message: hasChanges ? "数据已推送到远程仓库" : "没有新的变更需要推送",
          pushed: !!hasChanges,
        },
      });
    }

    if (body.action === "pull") {
      if (!existsSync(join(repoPath, ".git"))) {
        return NextResponse.json(
          { success: false, error: "请先配置 Git 仓库" },
          { status: 400 }
        );
      }

      const configPath = join(SYNC_DIR, ".git-config.json");
      if (!existsSync(configPath)) {
        return NextResponse.json(
          { success: false, error: "请先配置 Git 仓库" },
          { status: 400 }
        );
      }
      const config = JSON.parse(readFileSync(configPath, "utf-8")) as GitConfig;

      // pull 远程数据
      execSync(`git remote set-url origin ${getAuthUrl(config)}`, { cwd: repoPath });
      execSync(`git pull origin ${config.branch} 2>&1`, {
        cwd: repoPath,
        timeout: 30000,
      });

      // 读取备份数据并导入
      const backupFile = join(repoPath, "data", "ledger-backup.json");
      if (existsSync(backupFile)) {
        const backupData = JSON.parse(readFileSync(backupFile, "utf-8"));
        // 调用内部 import API
        const port = process.env.DEPLOY_RUN_PORT || "5000";
        await fetch(`http://localhost:${port}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: backupData.data, mode: "merge" }),
        });
      }

      // 更新同步时间
      config.lastSync = new Date().toISOString();
      writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

      return NextResponse.json({
        success: true,
        data: { message: "已从远程仓库拉取并合并数据" },
      });
    }

    return NextResponse.json(
      { success: false, error: "未知的操作类型" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Git 操作失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
