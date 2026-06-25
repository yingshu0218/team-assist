"use client";

import { CheckCircle2, Circle, CircleDashed, MinusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getTodoDateBucket } from "@/lib/todos";
import type { Todo, TodoDateBucket, TodoStatus } from "@/lib/types";
import { TODO_PRIORITY_LABELS, TODO_STATUS_LABELS } from "./todo-types";

interface TodoListProps {
  todos: Todo[];
  selectedTodoId: number | null;
  today: string;
  loading?: boolean;
  onSelect: (todo: Todo) => void;
  onToggleDone: (todo: Todo) => void;
}

const BUCKET_ORDER: TodoDateBucket[] = ["overdue", "today", "future", "no_date", "done"];

const BUCKET_LABELS: Record<TodoDateBucket, string> = {
  overdue: "已逾期",
  today: "今天",
  future: "未来",
  no_date: "无日期",
  done: "已完成",
};

function statusIcon(status: TodoStatus) {
  if (status === "done") return CheckCircle2;
  if (status === "doing") return CircleDashed;
  if (status === "canceled") return MinusCircle;
  return Circle;
}

export function TodoList({
  todos,
  selectedTodoId,
  today,
  loading = false,
  onSelect,
  onToggleDone,
}: TodoListProps) {
  const grouped = new Map<TodoDateBucket, Todo[]>();
  for (const bucket of BUCKET_ORDER) grouped.set(bucket, []);
  for (const todo of todos) {
    const bucket = getTodoDateBucket(todo, today);
    grouped.get(bucket)?.push(todo);
  }

  return (
    <Card className="min-h-[520px]">
      <CardHeader>
        <CardTitle className="text-base">任务清单</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : todos.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-sm font-medium">暂无待办</p>
              <p className="mt-1 text-xs text-muted-foreground">新建任务后会显示在这里</p>
            </div>
          </div>
        ) : (
          BUCKET_ORDER.map((bucket) => {
            const bucketTodos = grouped.get(bucket) ?? [];
            if (bucketTodos.length === 0) return null;

            return (
              <section key={bucket} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {BUCKET_LABELS[bucket]}
                  </h3>
                  <Badge variant="secondary">{bucketTodos.length}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {bucketTodos.map((todo) => {
                    const StatusIcon = statusIcon(todo.status);
                    const isSelected = todo.id === selectedTodoId;
                    const progress = todo.checklistProgress ?? (todo.status === "done" ? 100 : 0);

                    return (
                      <button
                        key={todo.id}
                        type="button"
                        onClick={() => onSelect(todo)}
                        className={cn(
                          "w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50",
                          isSelected && "border-primary bg-accent",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={todo.status === "done"}
                            onClick={(event) => event.stopPropagation()}
                            onCheckedChange={() => onToggleDone(todo)}
                            aria-label={`切换 ${todo.title} 完成状态`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "font-medium text-foreground",
                                  todo.status === "done" && "text-muted-foreground line-through",
                                )}
                              >
                                {todo.title}
                              </span>
                              <Badge variant="outline">{todo.team?.name ?? "未归属"}</Badge>
                              {todo.ledger && <Badge variant="secondary">{todo.ledger.name}</Badge>}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <StatusIcon />
                                {TODO_STATUS_LABELS[todo.status]}
                              </span>
                              <Separator orientation="vertical" className="h-3" />
                              <span>优先级：{TODO_PRIORITY_LABELS[todo.priority]}</span>
                              <Separator orientation="vertical" className="h-3" />
                              <span>到期：{todo.due_date ?? "无"}</span>
                            </div>
                            {progress > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <Progress value={progress} className="h-1.5" />
                                <span className="shrink-0 text-xs text-muted-foreground">{progress}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
