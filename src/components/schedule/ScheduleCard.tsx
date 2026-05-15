import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { trpc } from "@/providers/trpc";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  Bell,
  Repeat,
} from "lucide-react";

interface ScheduleCardProps {
  schedule: any;
  compact?: boolean;
}

export function ScheduleCard({ schedule, compact = false }: ScheduleCardProps) {
  const { colors } = useThemeStore();
  const { setSelectedScheduleId, setEditModalOpen } = useScheduleStore();
  const utils = trpc.useUtils();

  const completeMutation = trpc.schedule.complete.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });

  const deleteMutation = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });

  const startTime = new Date(schedule.startTime);
  const endTime = new Date(schedule.endTime);

  const handleEdit = () => {
    setSelectedScheduleId(schedule.id);
    setEditModalOpen(true);
  };

  const handleDelete = () => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate({ id: schedule.id });
    }
  };

  const handleToggleComplete = () => {
    completeMutation.mutate({
      id: schedule.id,
      isCompleted: !schedule.isCompleted,
    });
  };

  if (compact) {
    return (
      <div
        className="group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer"
        style={{
          backgroundColor: schedule.color || colors.cardBg,
          borderLeft: `3px solid ${schedule.categoryColor || colors.primary}`,
        }}
        onClick={handleEdit}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleComplete();
          }}
          className="flex-shrink-0"
        >
          {schedule.isCompleted ? (
            <CheckCircle2 size={14} style={{ color: colors.success }} />
          ) : (
            <Circle size={14} style={{ color: colors.textMuted }} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] font-medium truncate"
            style={{
              textDecoration: schedule.isCompleted ? "line-through" : "none",
              opacity: schedule.isCompleted ? 0.6 : 1,
            }}
          >
            {schedule.title}
          </div>
          <div className="text-[10px] flex items-center gap-1" style={{ color: colors.textMuted }}>
            <Clock size={9} />
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil size={12} className="mr-2" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-500">
              <Trash2 size={12} className="mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div
      className="group rounded-xl border p-4 transition-all cursor-pointer hover:-translate-y-1"
      style={{
        backgroundColor: schedule.color || colors.cardBg,
        borderColor: colors.border,
        boxShadow: `0 2px 8px ${colors.shadow}`,
      }}
      onClick={handleEdit}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleComplete();
            }}
          >
            {schedule.isCompleted ? (
              <CheckCircle2 size={18} style={{ color: colors.success }} />
            ) : (
              <Circle size={18} style={{ color: colors.textMuted }} />
            )}
          </button>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{
                textDecoration: schedule.isCompleted ? "line-through" : "none",
                opacity: schedule.isCompleted ? 0.6 : 1,
              }}
            >
              {schedule.title}
            </h3>
            {schedule.description && (
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: colors.textMuted }}>
                {schedule.description}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil size={12} className="mr-2" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-500">
              <Trash2 size={12} className="mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: colors.textMuted }}>
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {format(startTime, "M/d HH:mm")} - {format(endTime, "HH:mm")}
        </span>

        {schedule.alarmMinutes > 0 && (
          <span className="flex items-center gap-1">
            <Bell size={11} />
            {schedule.alarmMinutes}분 전
          </span>
        )}

        {schedule.isRepeating && (
          <span className="flex items-center gap-1">
            <Repeat size={11} />
            반복
          </span>
        )}

        {schedule.categoryName && (
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: `${schedule.categoryColor}20`,
              color: schedule.categoryColor,
            }}
          >
            {schedule.categoryName}
          </span>
        )}
      </div>
    </div>
  );
}
