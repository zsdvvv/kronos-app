import { useState, useRef } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { trpc } from "@/providers/trpc";
import {
  format, startOfWeek, addDays, startOfMonth, endOfMonth,
  isSameDay, getDay, isAfter, isBefore,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ScheduleCard } from "./ScheduleCard";
import { Plus, CalendarPlus } from "lucide-react";

// ─── 루트 뷰 분기 ────────────────────────────────────────────
export function CalendarView() {
  const { colors } = useThemeStore();
  const {
    viewMode, currentDate, selectedCategoryId, searchQuery,
    dayStartHour, dayEndHour, weekCount,
  } = useScheduleStore();

  let startDate: Date, endDate: Date;
  if (viewMode === "day") {
    startDate = new Date(currentDate); startDate.setHours(0, 0, 0, 0);
    endDate   = new Date(currentDate); endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === "week") {
    startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    endDate   = addDays(startDate, 7 * (weekCount || 1) - 1);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = startOfMonth(currentDate);
    endDate   = endOfMonth(currentDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const { data: schedules, isLoading } = trpc.schedule.list.useQuery({
    startDate: startDate.toISOString(),
    endDate:   endDate.toISOString(),
    categoryId: selectedCategoryId ?? undefined,
    search: searchQuery || undefined,
    view: viewMode,
  }, {
    // 날짜가 바뀌면 항상 새로 fetch
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="animate-pulse text-sm" style={{ color: colors.textMuted }}>일정을 불러오는 중...</div>
      </div>
    );
  }

  const list = schedules || [];
  if (viewMode === "day")   return <DayView   schedules={list} />;
  if (viewMode === "week")  return <WeekView  schedules={list} />;
  return <MonthView schedules={list} />;
}

// ─── DAY VIEW ────────────────────────────────────────────────
function DayView({ schedules }: { schedules: any[] }) {
  const { colors } = useThemeStore();
  const { currentDate, dayStartHour, dayEndHour, setCreateModalOpen, setSelectedScheduleId, setEditModalOpen } = useScheduleStore();

  const start = dayStartHour ?? 0;
  const end   = dayEndHour   ?? 23;
  const hours = Array.from({ length: end - start + 1 }, (_, i) => i + start);

  const fmtHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const getSchedulesForHour = (h: number) =>
    schedules.filter((s) => new Date(s.startTime).getHours() === h);

  // 드래그 상태 (시간 범위 드래그)
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd,   setDragEnd]   = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isInDrag = (h: number) => {
    if (dragStart === null || dragEnd === null) return false;
    const lo = Math.min(dragStart, dragEnd);
    const hi = Math.max(dragStart, dragEnd);
    return h >= lo && h <= hi;
  };

  const openCreate = (hour: number) => {
    setCreateModalOpen(true, {
      date: dateStr,
      startTime: fmtHour(hour),
      endTime: fmtHour(Math.min(hour + 1, 23)),
    });
  };

  const openCreateRange = () => {
    if (dragStart === null || dragEnd === null) return;
    const lo = Math.min(dragStart, dragEnd);
    const hi = Math.max(dragStart, dragEnd);
    setCreateModalOpen(true, {
      date: dateStr,
      startTime: fmtHour(lo),
      endTime: fmtHour(Math.min(hi + 1, 23)),
    });
    setDragStart(null); setDragEnd(null); setIsDragging(false);
  };

  return (
    <div className="flex-1 overflow-auto p-4 select-none" style={{ touchAction: "pan-y" }}>
      <div className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
        {format(currentDate, "M월 d일 EEEE", { locale: ko })}
      </div>
      <p className="text-[10px] mb-3" style={{ color: colors.textMuted }}>
        빈 영역 클릭 또는 드래그로 일정 추가 | 기존 일정 클릭으로 수정
      </p>
      <div className="space-y-0.5">
        {hours.map((hour) => {
          const hourSchedules = getSchedulesForHour(hour);
          const inDrag = isInDrag(hour);
          return (
            <div key={hour} className="flex gap-3 min-h-[56px] group">
              {/* 시간 라벨 */}
              <div className="w-14 text-xs text-right pt-2 flex-shrink-0 select-none"
                style={{ color: colors.textMuted }}>
                {fmtHour(hour)}
              </div>
              {/* 시간 블록 */}
              <div
                className="flex-1 rounded-lg border p-1.5 transition-colors relative"
                style={{
                  borderColor: inDrag ? colors.primary : colors.border,
                  backgroundColor: inDrag
                    ? `${colors.primary}15`
                    : hourSchedules.length === 0
                      ? colors.background
                      : colors.cardBg,
                  cursor: "pointer",
                }}
                onMouseDown={() => { setDragStart(hour); setDragEnd(hour); setIsDragging(true); }}
                onMouseEnter={() => { if (isDragging) setDragEnd(hour); }}
                onMouseUp={() => {
                  setIsDragging(false);
                  if (dragStart !== null && dragStart !== hour) {
                    openCreateRange();
                  } else if (hourSchedules.length === 0) {
                    openCreate(hour);
                    setDragStart(null); setDragEnd(null);
                  }
                }}
              >
                {hourSchedules.length > 0 ? (
                  <div className="space-y-1" onMouseDown={(e) => e.stopPropagation()}>
                    {hourSchedules.map((s) => (
                      <div key={s.id} onClick={(e) => {
                        e.stopPropagation();
                        setSelectedScheduleId(s.id);
                        setEditModalOpen(true);
                      }}>
                        <ScheduleCard schedule={s} compact />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    style={{ color: colors.textMuted }}>
                    <Plus size={11} /><span className="text-[10px]">일정 추가</span>
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

// ─── WEEK VIEW ───────────────────────────────────────────────
function WeekView({ schedules }: { schedules: any[] }) {
  const { colors } = useThemeStore();
  const {
    currentDate, setCurrentDate, weekCount,
    setCreateModalOpen, setSelectedScheduleId, setEditModalOpen,
  } = useScheduleStore();

  const count = weekCount || 1;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const allDays = Array.from({ length: 7 * count }, (_, i) => addDays(weekStart, i));
  const weeks: Date[][] = Array.from({ length: count }, (_, w) => allDays.slice(w * 7, w * 7 + 7));

  const today = new Date();

  // 선택된 날짜 Set
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  // 드래그 상태
  const [dragStartDay, setDragStartDay] = useState<string | null>(null);
  const [dragEndDay,   setDragEndDay]   = useState<string | null>(null);
  const [isDragging,   setIsDragging]   = useState(false);

  const getSchedulesForDay = (day: Date) =>
    schedules.filter((s) => isSameDay(new Date(s.startTime), day));

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

  // 드래그 범위 계산
  const getDragRange = (): Set<string> => {
    if (!dragStartDay || !dragEndDay) return new Set();
    const startIdx = allDays.findIndex((d) => dayKey(d) === dragStartDay);
    const endIdx   = allDays.findIndex((d) => dayKey(d) === dragEndDay);
    if (startIdx === -1 || endIdx === -1) return new Set();
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    return new Set(allDays.slice(lo, hi + 1).map(dayKey));
  };

  const dragRange = isDragging ? getDragRange() : selectedDays;

  // 선택 완료 후 일정 추가
  const openAddForSelected = (days: Set<string>) => {
    const sorted = Array.from(days).sort();
    if (sorted.length === 0) return;
    setCreateModalOpen(true, {
      date: sorted[0],
      endDate: sorted[sorted.length - 1],
      allDay: true,
    });
  };

  const handleDayHeaderMouseDown = (day: Date, e: React.MouseEvent) => {
    e.preventDefault();
    const k = dayKey(day);
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+클릭: 개별 토글
      setSelectedDays((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k); else next.add(k);
        return next;
      });
    } else {
      // 드래그 시작
      setDragStartDay(k); setDragEndDay(k); setIsDragging(true);
      setSelectedDays(new Set());
    }
    setCurrentDate(day);
  };

  const handleDayHeaderMouseEnter = (day: Date) => {
    if (isDragging) setDragEndDay(dayKey(day));
  };

  const handleDayHeaderMouseUp = (day: Date) => {
    if (isDragging) {
      const range = getDragRange();
      setSelectedDays(range);
      setIsDragging(false);
      setDragStartDay(null); setDragEndDay(null);
      if (range.size > 1) openAddForSelected(range);
    }
  };

  // 주 전체 선택 (4주 이상일 때 좌측 주 선택 버튼)
  const selectWholeWeek = (weekDays: Date[]) => {
    const keys = new Set(weekDays.map(dayKey));
    setSelectedDays(keys);
    openAddForSelected(keys);
  };

  return (
    <div
      className="flex-1 overflow-auto p-4 select-none"
      onMouseUp={() => { if (isDragging) { const range = getDragRange(); setSelectedDays(range); setIsDragging(false); setDragStartDay(null); setDragEndDay(null); if (range.size > 1) openAddForSelected(range); } }}
      onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragStartDay(null); setDragEndDay(null); } }}
    >
      <p className="text-[10px] mb-2" style={{ color: colors.textMuted }}>
        헤더 드래그 또는 Ctrl+클릭으로 여러 날 선택 후 일정 추가 | 셀 클릭으로 일정 추가
      </p>

      {weeks.map((weekDays, wi) => {
        const allWeekSelected = weekDays.every((d) => dragRange.has(dayKey(d)));
        return (
          <div key={wi} className={wi > 0 ? "mt-5" : ""}>
            {/* 주차 레이블 + 주 전체 선택 버튼 */}
            <div className="flex items-center gap-2 mb-1.5">
              {count > 1 && (
                <button
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors"
                  onClick={() => selectWholeWeek(weekDays)}
                  style={{
                    borderColor: allWeekSelected ? colors.primary : colors.border,
                    backgroundColor: allWeekSelected ? `${colors.primary}18` : "transparent",
                    color: allWeekSelected ? colors.primary : colors.textMuted,
                  }}
                  title="주 전체 선택"
                >
                  {wi + 1}주차 ▣
                </button>
              )}
              {selectedDays.size > 0 && (
                <button
                  className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: colors.primary, color: "#fff" }}
                  onClick={() => openAddForSelected(selectedDays)}
                >
                  <Plus size={10} /> {selectedDays.size}일 일정 추가
                </button>
              )}
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => {
                const k = dayKey(day);
                const isToday = isSameDay(day, today);
                const isInRange = dragRange.has(k);
                return (
                  <div
                    key={k}
                    className="flex flex-col items-center py-2 rounded-xl transition-all cursor-pointer relative"
                    onMouseDown={(e) => handleDayHeaderMouseDown(day, e)}
                    onMouseEnter={() => handleDayHeaderMouseEnter(day)}
                    onMouseUp={() => handleDayHeaderMouseUp(day)}
                    style={{
                      backgroundColor: isToday ? colors.primary : isInRange ? `${colors.primary}20` : "transparent",
                      color: isToday ? colors.cardBg : colors.text,
                      outline: isInRange && !isToday ? `2px solid ${colors.primary}` : "none",
                      borderRadius: "10px",
                    }}
                  >
                    <span className="text-[10px] font-medium opacity-70">{format(day, "EEE", { locale: ko })}</span>
                    <span className="text-lg font-semibold">{format(day, "d")}</span>
                  </div>
                );
              })}
            </div>

            {/* 일정 그리드 */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const k = dayKey(day);
                const daySchedules = getSchedulesForDay(day);
                const isInRange = dragRange.has(k);
                return (
                  <div
                    key={k}
                    className="min-h-[180px] rounded-xl border p-2 overflow-y-auto cursor-pointer group"
                    style={{
                      borderColor: isInRange ? colors.primary : colors.border,
                      backgroundColor: colors.cardBg,
                      boxShadow: isInRange ? `0 0 0 1px ${colors.primary}` : "none",
                    }}
                    onClick={() => {
                      // 셀 클릭 → 해당 날 일정 추가
                      setCreateModalOpen(true, { date: k, allDay: true });
                    }}
                  >
                    {daySchedules.length === 0 ? (
                      <div className="h-full flex items-start pt-2 opacity-0 group-hover:opacity-60 transition-opacity">
                        <span className="text-[10px] flex items-center gap-1" style={{ color: colors.textMuted }}>
                          <Plus size={9} /> 추가
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        {daySchedules.map((s) => (
                          <div key={s.id} onClick={(e) => {
                            e.stopPropagation();
                            setSelectedScheduleId(s.id);
                            setEditModalOpen(true);
                          }}>
                            <ScheduleCard schedule={s} compact />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MONTH VIEW ──────────────────────────────────────────────
function MonthView({ schedules }: { schedules: any[] }) {
  const { colors } = useThemeStore();
  const {
    currentDate, setCurrentDate,
    setCreateModalOpen, setSelectedScheduleId, setEditModalOpen,
  } = useScheduleStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const startDay   = getDay(monthStart);

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  // 이전 달 여백
  for (let i = startDay - 1; i >= 0; i--)
    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth(), -i), isCurrentMonth: false });
  // 이번 달
  for (let d = 1; d <= monthEnd.getDate(); d++)
    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth(), d), isCurrentMonth: true });
  // 다음 달 여백
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++)
    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i), isCurrentMonth: false });

  const today = new Date();
  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const getSchedulesForDay = (day: Date) =>
    schedules.filter((s) => isSameDay(new Date(s.startTime), day));

  // 드래그 상태
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd,   setDragEnd]   = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 드래그 범위 추가 버튼 팝업 위치
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInRange = (date: Date) => {
    if (!dragStart || !dragEnd) return false;
    const a = isBefore(dragStart, dragEnd) ? dragStart : dragEnd;
    const b = isBefore(dragStart, dragEnd) ? dragEnd   : dragStart;
    return !isBefore(date, a) && !isAfter(date, b);
  };

  const handleMouseDown = (date: Date, e: React.MouseEvent) => {
    setDragStart(date); setDragEnd(date); setIsDragging(true);
    setPopupPos(null);
  };

  const handleMouseEnter = (date: Date) => {
    if (isDragging) setDragEnd(date);
  };

  const handleMouseUp = (date: Date, e: React.MouseEvent) => {
    setIsDragging(false);
    if (dragStart && !isSameDay(dragStart, date)) {
      // 범위 드래그 완료 → 팝업 표시
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setPopupPos({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top  - containerRect.top  + rect.height + 4,
        });
      }
    } else {
      // 단순 클릭 → 바로 일정 추가
      setCurrentDate(date);
      setDragStart(null); setDragEnd(null);
      setPopupPos(null);
      setCreateModalOpen(true, {
        date: format(date, "yyyy-MM-dd"),
        allDay: true,
      });
    }
  };

  const openRangeAdd = () => {
    if (!dragStart || !dragEnd) return;
    const a = isBefore(dragStart, dragEnd) ? dragStart : dragEnd;
    const b = isBefore(dragStart, dragEnd) ? dragEnd   : dragStart;
    setCreateModalOpen(true, {
      date: dayKey(a),
      endDate: dayKey(b),
      allDay: true,
    });
    setDragStart(null); setDragEnd(null); setPopupPos(null);
  };

  const closePopup = () => {
    setDragStart(null); setDragEnd(null); setPopupPos(null);
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto p-4 select-none relative"
      onMouseLeave={() => { if (isDragging) setIsDragging(false); }}
    >
      {/* 월 표시 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: colors.text, fontFamily: "Cormorant Garamond, serif" }}>
          {format(currentDate, "yyyy년 M월", { locale: ko })}
        </h2>
        <p className="text-[10px]" style={{ color: colors.textMuted }}>
          클릭: 일정 추가 | 드래그: 기간 선택
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-xs font-semibold py-2" style={{ color: colors.textMuted }}>{wd}</div>
        ))}
        {days.map((item, idx) => {
          const isToday    = isSameDay(item.date, today);
          const isSelected = isSameDay(item.date, currentDate) && !dragStart;
          const inRange    = dragStart ? isInRange(item.date) : false;
          const daySchedules = getSchedulesForDay(item.date);

          return (
            <div
              key={idx}
              className="min-h-[80px] rounded-lg border p-1.5 text-left transition-all cursor-pointer"
              onMouseDown={(e) => handleMouseDown(item.date, e)}
              onMouseEnter={() => handleMouseEnter(item.date)}
              onMouseUp={(e) => handleMouseUp(item.date, e)}
              style={{
                borderColor: isToday ? colors.primary : inRange ? colors.primary : isSelected ? `${colors.primary}60` : colors.border,
                backgroundColor: inRange
                  ? `${colors.primary}18`
                  : item.isCurrentMonth ? colors.cardBg : colors.background,
                opacity: item.isCurrentMonth ? 1 : 0.45,
              }}
            >
              <div
                className="text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1"
                style={{ backgroundColor: isToday ? colors.primary : "transparent", color: isToday ? colors.cardBg : colors.text }}
              >
                {item.date.getDate()}
              </div>
              <div className="space-y-0.5" onMouseDown={(e) => e.stopPropagation()}>
                {daySchedules.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="text-[9px] truncate px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: s.color || colors.accent, color: "#1a1a1a" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScheduleId(s.id);
                      setEditModalOpen(true);
                    }}
                  >
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

      {/* 드래그 후 추가 팝업 */}
      {popupPos && (
        <div
          className="absolute z-50 flex gap-1.5 shadow-lg rounded-xl px-3 py-2 text-xs items-center"
          style={{
            left: popupPos.x - 70,
            top:  popupPos.y,
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.border}`,
          }}
        >
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: colors.primary, color: "#fff" }}
            onClick={openRangeAdd}
          >
            <CalendarPlus size={12} /> 일정 추가
          </button>
          <button
            className="px-2 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: colors.background, color: colors.textMuted }}
            onClick={closePopup}
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
