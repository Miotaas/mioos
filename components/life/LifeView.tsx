"use client";

import { useEffect, useState } from "react";
import { MioGoal } from "@/types";
import { cn, formatDate, GOAL_STATUS_COLORS } from "@/lib/utils";
import { normalizeGoal, isOverdue, daysUntil } from "@/lib/normalize";
import { useAppStore } from "@/store/appStore";
import { Calendar, Target, Repeat, Plug } from "lucide-react";

type TabType = "calendar" | "goals" | "habits";

export function LifeView() {
  const { setActiveView } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>("calendar");
  const [goals, setGoals] = useState<MioGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .catch(() => [])
      .then((data) => {
        const allGoals = Array.isArray(data) ? data : [];
        const normalizedGoals = allGoals.map(normalizeGoal);
        setGoals(normalizedGoals);
        setLoading(false);
      });
  }, []);

  const personalGoals = goals.filter((g) => g.goalType === "personal");

  // Sort: overdue first (past targetDate + not completed), then by progress desc
  const sortedPersonalGoals = [...personalGoals].sort((a, b) => {
    const aOverdue = a.targetDate && isOverdue(a.targetDate) && a.status !== "achieved";
    const bOverdue = b.targetDate && isOverdue(b.targetDate) && b.status !== "achieved";

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by progress descending
    return (b.progress ?? 0) - (a.progress ?? 0);
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-5 md:px-10 py-8 md:py-12 pb-28 md:pb-12">
        {/* Page Header */}
        <div className="px-6 md:px-8 pt-8 pb-5 border-b border-white/[0.05] flex-shrink-0 -mx-5 md:-mx-10 mb-8">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
            Personal
          </p>
          <h1 className="text-[32px] md:text-[38px] font-semibold text-text-primary tracking-tight leading-tight">
            Life
          </h1>
          <p className="text-[12px] text-text-muted mt-1">
            Your personal goals and commitments
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 border-b border-white/[0.05] pb-5">
          <TabButton
            label="Calendar"
            isActive={activeTab === "calendar"}
            onClick={() => setActiveTab("calendar")}
          />
          <TabButton
            label="Goals"
            isActive={activeTab === "goals"}
            onClick={() => setActiveTab("goals")}
          />
          <TabButton
            label="Habits"
            isActive={activeTab === "habits"}
            onClick={() => setActiveTab("habits")}
          />
        </div>

        {/* Tab Content */}
        {activeTab === "calendar" && (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
            <Calendar className="w-6 h-6 text-text-ghost mx-auto mb-3 opacity-30" />
            <p className="text-[14px] text-text-secondary font-medium mb-1">
              Connect your calendar
            </p>
            <p className="text-[12px] text-text-muted mb-4 max-w-sm mx-auto">
              Meetings and personal events will appear here once your calendar is connected.
            </p>
            <button
              onClick={() => setActiveView("settings")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-[12px] font-medium hover:bg-accent-purple/15 transition-all"
            >
              <Plug className="w-3.5 h-3.5" />
              Connect in Settings
            </button>
          </div>
        )}
        {activeTab === "goals" && (
          <GoalsTab goals={sortedPersonalGoals} loading={loading} />
        )}
        {activeTab === "habits" && <HabitsPlaceholder />}
      </div>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 text-sm font-medium rounded-full transition-all border",
        isActive
          ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/25"
          : "text-text-muted border border-transparent hover:text-text-secondary hover:bg-white/[0.04]"
      )}
    >
      {label}
    </button>
  );
}

function GoalsTab({
  goals,
  loading,
}: {
  goals: MioGoal[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-[13px] text-text-muted">Loading goals...</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="py-16 text-center">
        <Target className="w-7 h-7 text-text-ghost mx-auto mb-3 opacity-20" />
        <p className="text-[13px] text-text-muted">No personal goals yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}

function GoalCard({ goal }: { goal: MioGoal }) {
  const statusColor = GOAL_STATUS_COLORS[goal.status];
  const isOverdueGoal = goal.targetDate && isOverdue(goal.targetDate) && goal.status !== "achieved";
  const daysLeft = daysUntil(goal.targetDate);

  // Format the due date label
  let dueDateLabel = "";
  if (isOverdueGoal) {
    dueDateLabel = "Overdue";
  } else if (goal.targetDate) {
    dueDateLabel = `Due ${formatDate(goal.targetDate)}`;
  }

  // Map status to display label and color
  const statusLabel = goal.status === "achieved" ? "Completed" : goal.status;
  const statusDotColor =
    goal.status === "active"
      ? "bg-accent-green"
      : goal.status === "paused"
      ? "bg-accent-amber"
      : goal.status === "achieved"
      ? "bg-indigo-500"
      : "bg-accent-red"; // blocked

  return (
    <div className="p-5 rounded-xl border border-white/[0.05] bg-[#0d1220] hover:border-white/[0.08] transition-all">
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-[14px] text-text-primary font-medium flex-1">
          {goal.title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={cn("w-2 h-2 rounded-full", statusDotColor)} />
          <span className="text-[11px] text-text-muted uppercase tracking-wide">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-purple transition-all"
            style={{ width: `${goal.progress ?? 0}%` }}
          />
        </div>
        <p className="text-[11px] text-text-muted mt-1.5">
          {goal.progress ?? 0}% complete
        </p>
      </div>

      {/* Description (if present) */}
      {goal.description && (
        <p className="text-[12px] text-text-secondary mb-3 line-clamp-2">
          {goal.description}
        </p>
      )}

      {/* Target Date */}
      {goal.targetDate && (
        <p
          className={cn(
            "text-[11px] uppercase tracking-wide font-medium",
            isOverdueGoal ? "text-accent-red" : "text-text-muted"
          )}
        >
          {dueDateLabel}
        </p>
      )}
    </div>
  );
}

function HabitsPlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
      <Repeat className="w-6 h-6 text-text-ghost mx-auto mb-3 opacity-30" />
      <p className="text-[14px] text-text-secondary font-medium mb-1">
        Habit tracking coming soon
      </p>
      <p className="text-[12px] text-text-muted max-w-sm mx-auto">
        Track daily habits and routines here.
      </p>
    </div>
  );
}
