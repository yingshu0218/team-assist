"use client";

import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/types";
import type { TodoTeamFilterValue } from "./todo-types";

interface TodoTeamFilterProps {
  teams: Team[];
  selected: TodoTeamFilterValue;
  onChange: (value: TodoTeamFilterValue) => void;
}

export function TodoTeamFilter({ teams, selected, onChange }: TodoTeamFilterProps) {
  const items: { label: string; value: TodoTeamFilterValue; count?: number }[] = [
    { label: "全部", value: "all" },
    { label: "未归属", value: "none" },
    ...teams.map((team) => ({ label: team.name, value: team.id, count: team.todoCount })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={String(item.value)}
          type="button"
          variant={selected === item.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {typeof item.count === "number" && (
            <span className="text-xs text-current/70">{item.count}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
