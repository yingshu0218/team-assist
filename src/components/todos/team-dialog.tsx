"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Team } from "@/lib/types";
import type { TeamMutationPayload } from "./todo-types";

interface TeamDialogProps {
  open: boolean;
  team: Team | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: TeamMutationPayload, teamId?: number) => Promise<void>;
}

export function TeamDialog({ open, team, onOpenChange, onSave }: TeamDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(team?.name ?? "");
    setColor(team?.color ?? "");
    setDescription(team?.description ?? "");
  }, [open, team]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(
      {
        name: name.trim(),
        color: color.trim() || null,
        description: description.trim() || null,
      },
      team?.id,
    );
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "编辑分组" : "新建分组"}</DialogTitle>
          <DialogDescription>分组用于按团队、项目或工作流组织待办</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="team-name">名称</FieldLabel>
            <Input
              id="team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：销售团队"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="team-color">颜色</FieldLabel>
            <Input
              id="team-color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="可选，例如 #6366f1"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="team-description">描述</FieldLabel>
            <Textarea
              id="team-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="可选"
              rows={3}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
