"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLedger } from "@/hooks/use-ledger";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "ledger" | "crm";
}

export function ExportDialog({ open, onOpenChange, type }: ExportDialogProps) {
  const { activeLedgerId } = useLedger();
  const [period, setPeriod] = useState<string>("all");
  const [format, setFormat] = useState<string>("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!activeLedgerId) return;
    setExporting(true);

    try {
      let url: string;
      if (type === "ledger") {
        const params = new URLSearchParams();
        params.set("format", format);
        params.set("period", period);
        if (period === "custom") {
          params.set("start_date", startDate);
          params.set("end_date", endDate);
        }
        url = `/api/ledgers/${activeLedgerId}/export?${params.toString()}`;
      } else {
        const params = new URLSearchParams();
        params.set("ledger_id", String(activeLedgerId));
        params.set("format", format);
        url = `/api/crm/contacts/export?${params.toString()}`;
      }

      // 获取 auth token
      const token = localStorage.getItem("auth_token");
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "导出失败" }));
        throw new Error(err.error || "导出失败");
      }

      // 下载文件
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;

      // 从 Content-Disposition 提取文件名
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename\*=UTF-8''(.+)/);
      const fallbackExt = format === "csv" ? ".csv" : ".json";
      link.download = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : type === "ledger"
          ? `账本导出${fallbackExt}`
          : `CRM联系人导出${fallbackExt}`;

      link.click();
      window.URL.revokeObjectURL(blobUrl);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "导出失败";
      console.error("Export error:", message);
    } finally {
      setExporting(false);
    }
  };

  const isCustomInvalid = period === "custom" && (!startDate || !endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {type === "ledger" ? "导出账本" : "导出联系人"}
          </DialogTitle>
          <DialogDescription>
            {type === "ledger"
              ? "选择导出范围和格式，将账本数据下载到本地"
              : "将当前账本的 CRM 联系人数据导出到本地"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 导出格式 */}
          <div className="space-y-2">
            <Label>导出格式</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV（表格格式，适合 Excel）</SelectItem>
                <SelectItem value="json">JSON（数据格式，适合备份恢复）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 账本导出才显示时间段选择 */}
          {type === "ledger" && (
            <div className="space-y-2">
              <Label>导出范围</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">整本导出</SelectItem>
                  <SelectItem value="month">本月</SelectItem>
                  <SelectItem value="year">全年</SelectItem>
                  <SelectItem value="custom">自定义时间段</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 自定义时间段 */}
          {type === "ledger" && period === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || isCustomInvalid}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? "导出中..." : "导出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
