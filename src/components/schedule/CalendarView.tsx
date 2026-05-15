import { useRef, useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { trpc } from "@/providers/trpc";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarEmpty } from "./CalendarEmpty";
import { ScheduleCard } from "./ScheduleCard";

export function CalendarView() {
  const { colors } = useThemeStore();
  const { viewMode, currentDate, selectedCategoryId, searchQuery, dayStartHour, dayEndHour, weekCount } = useScheduleStore();

  let startDate: Date;
  let endDate: Date;

  if (viewMode === "day") {
    startDate = new Date(currentDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(currentDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === "week") {
    startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    endDate = addDays(startDate, 7 * (weekCount || 1) - 1);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = startOfMonth(currentDate);
    endDate = endOfMonth(currentDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const { data: schedules, isLoading } = trpc.schedule.list.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    categoryId: selectedCategoryId ?? undefined,
    search: searchQuery || undefined,
    view: viewMode,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-sm" style={{ color: colors.textMuted }}>일정을 불러오는 중...</div>
      </div>
    );
  }

  if (viewMode === "day") return <DayView schedules={schedules || []} />;
  if (viewMode === "week") return <WeekView schedules={schedules || []} />;
  return <MonthView schedules={schedules || []} />;
}

// ─── Day View (시간 범위 적용) ───
function DayView({ schedules }: { schedules: any[] }) {
  const { colors } = useThemeStore();
  const { currentDate, dayStartHour, dayEndHour } = useScheduleStore();

  const start = dayStartHour ?? 0;
  const end = dayEndHour ?? 23;
  const hours = Array.from({ length: end - start + 1 }, (_, i) => i + start);

  const getSchedulesForHour = (hour: number) =>
    schedules.filter((s) => new Date(s.startTime).getHours() === hour);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
        {format(currentDate, "M월 d일 EEEE", { locale: ko })}
      </div>
      <div className="space-y-1">
        {hours.map((hour) => {
          const hourSchedules = getSchedulesForHour(hour);
          return (
            <div key={hour} className="flex gap-3 min-h-[60px]">
              <div className="w-14 text-xs text-right pt-2 flex-shrink-0" style={{ color: colors.textMuted }}>
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div className="flex-1 rounded-lg border p-2 transition-colors" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                {hourSchedules.length > 0 && (
                  <div className="space-y-1">
                    {hourSchedules.map((s) => <ScheduleCard key={s.id} schedule={s} compact />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View (Ctrl+클릭으로 여러 날 선택, 다중 주 지원) ───
function WeekView({ schedules }: { schedules: any[] }) {
  const { colors } = useThemeStore();
  const { currentDate, setCurrentDate, weekCount } = useScheduleStore();
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  const count = weekCount || 1;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const allDays = Array.from({ length: 7 * count }, (_, i) => addDays(weekStart, i));

  // Group days by week for display
  const weeks: Date[][] = [];
  for (let w = 0; w < count; w++) {
    weeks.push(allDays.slice(w * 7, w * 7 + 7));
  }

  const getSchedulesForDay = (day: Date) =>
    schedules.filter((s) => isSameDay(new Date(s.startTime), day));

  const today = new Date();

  const handleDayClick = (day: Date, e: React.MouseEvent) => {
    const key = day.toDateString();
    if (e.ctrlKey || e.metaKey) {
      setSelectedDays((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    } else {
      setCurrentDate(day);
      setSelectedDays(new Set([key]));
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      {weeks.map((weekDays, wi) => (
        <div key={wi} className={wi > 0 ? "mt-4" : ""}>
          {count > 1 && (
            <div className="text-xs font-semibold mb-2" style={{ color: colors.textMuted }}>
              {wi + 1}주차
            </div>
          )}
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, currentDate) || selectedDays.has(day.toDateString());
              return (
                <button
                  key={day.toISOString()}
                  className="flex flex-col items-center py-2 rounded-xl transition-all select-none"
                  onClick={(e) => handleDayClick(day, e)}
                  title="Ctrl+클릭으로 여러 날 선택"
                  style={{
                    backgroundColor: isToday ? colors.primary : isSelected ? colors.hover : "transparent",
                    color: isToday ? colors.cardBg : colors.text,
                    outline: selectedDays.has(day.toDateString()) && !isToday ? `2px solid ${colors.primary}` : "none",
                  }}
                >
                  <span className="text-[10px] font-medium opacity-70">{format(day, "EEE", { locale: ko })}</span>
                  <span className="text-lg font-semibold">{format(day, "d")}</span>
                </button>
              );
            })}
          </div>
          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const daySchedules = getSchedulesForDay(day);
              const isHighlighted = selectedDays.has(day.toDateString());
              return (
                <div
                  key={day.toISOString()}
                  className="min-h-[200px] rounded-xl border p-2 overflow-y-auto"
                  style={{
                    borderColor: isHighlighted ? colors.primary : colors.border,
                    backgroundColor: colors.cardBg,
                    boxShadow: isHighlighted ? `0 0 0 1px ${colors.primary}` : "none",
                  }}
                >
                  {daySchedules.length === 0 ? (
                    <CalendarEmpty />
                  ) : (
                    <div className="space-y-1.5">
                      {daySchedules.map((s) => <ScheduleCard key={s.id} schedule={s} compact />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {count > 1 && (
        <p className="text-[10px] text-center mt-2" style={{ color: colors.textMuted }}>
          Ctrl+클릭으로 여러 날을 선택할 수 있습니다
        </p>
      )}
    </div>
  );
}

// ─── Month View (드래그로 날짜 범위 선택) ───
function MonthView({ schedules }: { schedules: any[] }) {
  const { colors } = useThemeStore();
  const { currentDate, setCurrentDate } = useScheduleStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDay = getDay(monthStart);
  const daysInMonth = monthEnd.getDate();

  const days: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth(), -i), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth(), d), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i), isCurrentMonth: false });
  }

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();

  const getSchedulesForDay = (day: Date) =>
    schedules.filter((s) => isSameDay(new Date(s.startTime), day));

  // Drag state
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isInDragRange = (date: Date) => {
    if (!dragStart || !dragEnd) return false;
    const a = dragStart < dragEnd ? dragStart : dragEnd;
    const b = dragStart < dragEnd ? dragEnd : dragStart;
    return date >= a && date <= b;
  };

  const handleMouseDown = (date: Date | null) => {
    if (!date) return;
    setDragStart(date);
    setDragEnd(date);
    setIsDragging(true);
  };

  const handleMouseEnter = (date: Date | null) => {
    if (!isDragging || !date) return;
    setDragEnd(date);
  };

  const handleMouseUp = (date: Date | null) => {
    if (!date) return;
    setIsDragging(false);
    if (dragStart && !isSameDay(dragStart, date)) {
      // Range selected - go to start date
      setCurrentDate(dragStart);
    } else {
      setCurrentDate(date);
      setDragStart(null);
      setDragEnd(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4" onMouseLeave={() => { if (isDragging) setIsDragging(false); }}>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-xs font-semibold py-2" style={{ color: colors.textMuted }}>{wd}</div>
        ))}
        {days.map((dayItem, idx) => {
          const dayDate = dayItem.date;
          if (!dayDate) return <div key={idx} />;
          const isToday = isSameDay(dayDate, today);
          const isSelected = dragStart && dragEnd ? isInDragRange(dayDate) : isSameDay(dayDate, currentDate);
          const daySchedules = getSchedulesForDay(dayDate);

          return (
            <div
              key={idx}
              className="min-h-[80px] rounded-lg border p-1.5 text-left transition-all cursor-pointer select-none"
              onMouseDown={() => handleMouseDown(dayDate)}
              onMouseEnter={() => handleMouseEnter(dayDate)}
              onMouseUp={() => handleMouseUp(dayDate)}
              style={{
                borderColor: isToday ? colors.primary : isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected
                  ? `${colors.primary}18`
                  : dayItem.isCurrentMonth ? colors.cardBg : colors.background,
                opacity: dayItem.isCurrentMonth ? 1 : 0.5,
              }}
            >
              <div
                className="text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1"
                style={{ backgroundColor: isToday ? colors.primary : "transparent", color: isToday ? colors.cardBg : colors.text }}
              >
                {dayDate.getDate()}
              </div>
              <div className="space-y-0.5">
                {daySchedules.slice(0, 3).map((s) => (
                  <div key={s.id} className="text-[9px] truncate px-1 py-0.5 rounded" style={{ backgroundColor: s.color || colors.accent, color: "#1a1a1a" }}>
                    {s.title}
                  </div>
                ))}
                {daySchedules.length > 3 && (
                  <div className="text-[9px] px-1" style={{ color: colors.textMuted }}>+{daySchedules.length - 3} 더보기</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-center mt-2" style={{ color: colors.textMuted }}>
        드래그하면 날짜 범위를 선택할 수 있습니다
      </p>
    </div>
  );
}
