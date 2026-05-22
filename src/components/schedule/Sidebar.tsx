import { useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays, Briefcase, BookOpen, Users, Dumbbell, User, Heart, Stethoscope,
  Layers, Plus, Calendar, CalendarRange, LayoutGrid, ChevronDown, ChevronRight,
  Edit2, Trash2, Check, X, ListChecks, CheckSquare, Square, Pin, Pencil,
} from "lucide-react";
import { format, isToday } from "date-fns";
import { ko } from "date-fns/locale";

const iconMap: Record<string, React.ReactNode> = {
  "briefcase": <Briefcase size={14} />,
  "book-open": <BookOpen size={14} />,
  "users": <Users size={14} />,
  "calendar-days": <CalendarDays size={14} />,
  "dumbbell": <Dumbbell size={14} />,
  "user": <User size={14} />,
  "heart": <Heart size={14} />,
  "stethoscope": <Stethoscope size={14} />,
};

const ICON_OPTIONS = [
  { value: "briefcase", label: "업무" },
  { value: "book-open", label: "학습" },
  { value: "users", label: "사람" },
  { value: "dumbbell", label: "운동" },
  { value: "heart", label: "건강" },
  { value: "stethoscope", label: "의료" },
  { value: "calendar-days", label: "일정" },
  { value: "user", label: "개인" },
];

const COLOR_OPTIONS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#06b6d4",
];

export function DayHourRangePicker() {
  const { colors } = useThemeStore();
  const { dayStartHour, dayEndHour, setDayStartHour, setDayEndHour } = useScheduleStore();
  const start = dayStartHour ?? 0;
  const end = dayEndHour ?? 23;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const fmt = (h: number) => `${h.toString().padStart(2, "0")}:00`;

  return (
    <div className="pb-2">
      <p className="text-[10px] font-semibold mb-1.5" style={{ color: colors.textMuted }}>시간 범위</p>
      <div className="flex items-center gap-1.5">
        <select
          value={start}
          onChange={(e) => setDayStartHour(Number(e.target.value))}
          className="flex-1 text-[10px] rounded px-1 py-0.5 border"
          style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
        >
          {hours.filter((h) => h < end).map((h) => (
            <option key={h} value={h}>{fmt(h)}</option>
          ))}
        </select>
        <span className="text-[10px]" style={{ color: colors.textMuted }}>~</span>
        <select
          value={end}
          onChange={(e) => setDayEndHour(Number(e.target.value))}
          className="flex-1 text-[10px] rounded px-1 py-0.5 border"
          style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
        >
          {hours.filter((h) => h > start).map((h) => (
            <option key={h} value={h}>{fmt(h)}</option>
          ))}
        </select>
      </div>
      <p className="text-[9px] mt-0.5 text-center" style={{ color: colors.textMuted }}>{fmt(start)} ~ {fmt(end)}</p>
    </div>
  );
}

export function WeekRangePicker() {
  const { colors } = useThemeStore();
  const { weekCount, setWeekCount } = useScheduleStore();
  const count = weekCount ?? 1;

  return (
    <div className="pb-2">
      <p className="text-[10px] font-semibold mb-1.5" style={{ color: colors.textMuted }}>주 범위</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((w) => (
          <button
            key={w}
            className="flex-1 text-[10px] rounded py-1 border transition-colors"
            onClick={() => setWeekCount(w)}
            style={{
              backgroundColor: count === w ? colors.primary : colors.background,
              color: count === w ? colors.cardBg : colors.text,
              borderColor: count === w ? colors.primary : colors.border,
            }}
          >{w}주</button>
        ))}
      </div>
    </div>
  );
}

function CategoryEditModal({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: any[] }) {
  const { colors } = useThemeStore();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("calendar-days");
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0]);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("calendar-days");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);

  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => { utils.invalidate(); setNewLabel(""); },
    onError: (e) => { alert("추가 실패: " + e.message); },
  });
  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => { utils.invalidate(); setEditingId(null); },
  });
  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => { utils.invalidate(); },
  });

  const startEdit = (cat: any) => { setEditingId(cat.id); setEditLabel(cat.label); setEditIcon(cat.icon || "calendar-days"); setEditColor(cat.color || COLOR_OPTIONS[0]); };
  const saveEdit = () => { if (!editLabel.trim() || editingId === null) return; updateMutation.mutate({ id: editingId, label: editLabel, icon: editIcon, color: editColor }); };
  const handleCreate = () => { if (!newLabel.trim()) return; createMutation.mutate({ label: newLabel, name: newLabel.toLowerCase().replace(/\s+/g, "_"), icon: newIcon, color: newColor }); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm overflow-y-auto max-h-[90vh]" style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}>
        <DialogHeader><DialogTitle style={{ color: colors.text }}>카테고리 관리</DialogTitle></DialogHeader>
        <div className="space-y-2 mb-4">
          {categories.map((cat) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <div className="border rounded-lg p-2 space-y-2" style={{ borderColor: colors.border }}>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-xs" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                  <div className="flex gap-1 flex-wrap">
                    {ICON_OPTIONS.map((ic) => (
                      <button key={ic.value} className="p-1.5 rounded border" onClick={() => setEditIcon(ic.value)} style={{ borderColor: editIcon === ic.value ? colors.primary : colors.border, backgroundColor: editIcon === ic.value ? `${colors.primary}15` : "transparent" }} title={ic.label}>{iconMap[ic.value]}</button>
                    ))}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {COLOR_OPTIONS.map((c) => (
                      <button key={c} className="w-5 h-5 rounded-full border-2" onClick={() => setEditColor(c)} style={{ backgroundColor: c, borderColor: editColor === c ? "#000" : "transparent" }} />
                    ))}
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" className="h-7 text-xs" onClick={saveEdit} style={{ backgroundColor: colors.primary, color: colors.cardBg }}><Check size={12} className="mr-1" />저장</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}><X size={12} /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: colors.background }}>
                  <span style={{ color: cat.color }}>{iconMap[cat.icon || ""] || <CalendarDays size={14} />}</span>
                  <span className="flex-1 text-xs">{cat.label}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <button onClick={() => startEdit(cat)} className="p-1 hover:opacity-70"><Edit2 size={12} style={{ color: colors.textMuted }} /></button>
                  <button onClick={() => deleteMutation.mutate({ id: cat.id })} className="p-1 hover:opacity-70"><Trash2 size={12} style={{ color: "#ef4444" }} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="border-t pt-3" style={{ borderColor: colors.border }}>
          <Label className="text-xs font-semibold" style={{ color: colors.textMuted }}>새 카테고리 추가</Label>
          <div className="mt-2 space-y-2">
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="카테고리 이름" className="h-8 text-xs" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
            <div className="flex gap-1 flex-wrap">
              {ICON_OPTIONS.map((ic) => (
                <button key={ic.value} className="p-1.5 rounded border" onClick={() => setNewIcon(ic.value)} style={{ borderColor: newIcon === ic.value ? colors.primary : colors.border, backgroundColor: newIcon === ic.value ? `${colors.primary}15` : "transparent" }} title={ic.label}>{iconMap[ic.value]}</button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} className="w-5 h-5 rounded-full border-2" onClick={() => setNewColor(c)} style={{ backgroundColor: c, borderColor: newColor === c ? "#000" : "transparent" }} />
              ))}
            </div>
            <Button className="w-full h-8 text-xs" onClick={handleCreate} disabled={!newLabel.trim() || createMutation.isPending} style={{ backgroundColor: colors.primary, color: colors.cardBg }}><Plus size={12} className="mr-1" />추가</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Sidebar() {
  const { colors } = useThemeStore();
  const { viewMode, setViewMode, selectedCategoryId, setSelectedCategoryId, setCreateModalOpen } = useScheduleStore();
  const { data: categories } = trpc.category.list.useQuery();
  const utils = trpc.useUtils();

  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [checkedAll, setCheckedAll] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);

  const today = new Date();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일, ${weekdays[today.getDay()]}`;

  const handleCategoryClick = (catId: number | null) => {
    setSelectedCategoryId(catId === selectedCategoryId ? null : catId);
    utils.schedule.list.invalidate();
  };

  const toggleCheckedAll = () => {
    const next = !checkedAll;
    setCheckedAll(next);
    setCheckedIds(next ? new Set(categories?.map((c) => c.id) || []) : new Set());
  };

  const toggleChecked = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <aside className="w-56 border-r flex flex-col flex-shrink-0 overflow-hidden" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
      {/* View Mode */}
      <div className="p-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.background }}>
          {(["day", "week", "month"] as const).map((mode) => {
            const icons = { day: <Calendar size={13} />, week: <CalendarRange size={13} />, month: <LayoutGrid size={13} /> };
            const labels = { day: "일", week: "주", month: "월" };
            return (
              <Button key={mode} variant="ghost" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => setViewMode(mode)}
                style={{ backgroundColor: viewMode === mode ? colors.cardBg : "transparent", color: viewMode === mode ? colors.primary : colors.textMuted, boxShadow: viewMode === mode ? `0 1px 3px ${colors.shadow}` : "none" }}>
                {icons[mode]}{labels[mode]}
              </Button>
            );
          })}
        </div>
        {viewMode === "day" && <div className="mt-2"><DayHourRangePicker /></div>}
        {viewMode === "week" && <div className="mt-2"><WeekRangePicker /></div>}
      </div>

      {/* Today Display */}
      <div className="px-3 py-2 border-b" style={{ borderColor: colors.border }}>
        <div className="rounded-xl px-3 py-2 text-center" style={{ background: `linear-gradient(135deg, ${colors.primary}18, ${colors.primary}08)`, border: `1px solid ${colors.primary}25` }}>
          <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: colors.textMuted }}>오늘</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: colors.primary, fontFamily: "Cormorant Garamond, serif", letterSpacing: "0.03em" }}>
            ({todayLabel})
          </p>
        </div>
      </div>

      {/* Quick Add */}
      <div className="p-3">
        <Button className="w-full h-9 gap-2 text-xs" onClick={() => setCreateModalOpen(true)} style={{ backgroundColor: colors.primary, color: colors.cardBg }}>
          <Plus size={14} />빠른 일정 추가
        </Button>
      </div>

      {/* Categories header */}
      <div className="px-3 pb-1">
        <div className="flex items-center gap-1">
          <Layers size={13} style={{ color: colors.textMuted }} />
          <span className="text-xs font-semibold flex-1" style={{ color: colors.textMuted }}>카테고리</span>
          <button className="p-1 rounded hover:opacity-70 transition-opacity" onClick={() => setEditModalOpen(true)} title="카테고리 수정">
            <Edit2 size={12} style={{ color: colors.textMuted }} />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3" style={{ touchAction: "pan-y" }}>
        <div className="space-y-1 pb-3">
          {/* All + expand + checkbox */}
          <div className="w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-all"
            style={{ backgroundColor: selectedCategoryId === null ? colors.hover : "transparent", color: selectedCategoryId === null ? colors.primary : colors.text }}>
            <button className="flex items-center gap-1.5 flex-1 text-left" onClick={() => { handleCategoryClick(null); setCategoryExpanded(!categoryExpanded); }}>
              <LayoutGrid size={14} />
              <span className="flex-1">전체 보기</span>
              {categoryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            <button className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
              onClick={(e) => { e.stopPropagation(); toggleCheckedAll(); }}
              style={{ backgroundColor: checkedAll ? colors.primary : "transparent", borderColor: checkedAll ? colors.primary : colors.border }}>
              {checkedAll && <Check size={10} style={{ color: colors.cardBg }} />}
            </button>
          </div>

          {/* Sub categories */}
          {categoryExpanded && categories?.map((cat) => (
            <div key={cat.id} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all pl-5"
              style={{ backgroundColor: selectedCategoryId === cat.id ? colors.hover : "transparent", color: selectedCategoryId === cat.id ? colors.primary : colors.text }}>
              <button className="flex items-center gap-2 flex-1 text-left" onClick={() => handleCategoryClick(cat.id)}>
                <span style={{ color: cat.color || colors.secondary }}>{iconMap[cat.icon || ""] || <CalendarDays size={14} />}</span>
                <span className="flex-1">{cat.label}</span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || colors.secondary }} />
              </button>
              <button className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                onClick={(e) => { e.stopPropagation(); toggleChecked(cat.id); }}
                style={{ backgroundColor: checkedIds.has(cat.id) ? colors.primary : "transparent", borderColor: checkedIds.has(cat.id) ? colors.primary : colors.border }}>
                {checkedIds.has(cat.id) && <Check size={10} style={{ color: colors.cardBg }} />}
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <UpcomingSchedules />
      <MiniCalendar />
      <CategoryEditModal open={editModalOpen} onClose={() => setEditModalOpen(false)} categories={categories || []} />
    </aside>
  );
}

function MiniCalendar() {
  const { colors } = useThemeStore();
  const { currentDate, setCurrentDate } = useScheduleStore();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const days: Array<{ day: number; isCurrent: boolean; isToday: boolean }> = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push({ day: 0, isCurrent: false, isToday: false });
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, isCurrent: d === currentDate.getDate(), isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear() });
  }
  const weekDays = ["일","월","화","수","목","금","토"];
  return (
    <div className="p-3 border-t" style={{ borderColor: colors.border }}>
      <div className="text-center text-xs font-medium mb-2">{year}년 {month + 1}월</div>
      <div className="grid grid-cols-7 gap-0">
        {weekDays.map((wd) => <div key={wd} className="text-center text-[10px] py-1" style={{ color: colors.textMuted }}>{wd}</div>)}
        {days.map((d, i) => (
          <button key={i} className="text-center text-[10px] py-1 rounded transition-colors"
            onClick={() => d.day > 0 && setCurrentDate(new Date(year, month, d.day))}
            style={{ backgroundColor: d.isCurrent ? colors.primary : d.isToday ? `${colors.primary}20` : "transparent", color: d.isCurrent ? colors.cardBg : d.isToday ? colors.primary : colors.text, fontWeight: d.isToday || d.isCurrent ? 600 : 400 }}>
            {d.day > 0 ? d.day : ""}
          </button>
        ))}
      </div>
    </div>
  );
}


// ─── 일정모음 컴포넌트 ───────────────────────────────────
function UpcomingSchedules() {
  const { colors } = useThemeStore();
  const { setSelectedScheduleId, setEditModalOpen } = useScheduleStore();
  const utils = trpc.useUtils();

  const [expanded, setExpanded] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: upcoming, isLoading } = trpc.schedule.upcoming.useQuery();

  const completeMutation = trpc.schedule.complete.useMutation({
    onSuccess: () => utils.invalidate(),
  });

  const toggleComplete = (id: number, current: boolean | number | null) => {
    completeMutation.mutate({ id, isCompleted: !current });
  };

  const togglePin = (id: number) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 고정 일정 먼저, 나머지는 날짜순
  const sorted = [...(upcoming || [])].sort((a, b) => {
    const aPin = pinnedIds.has(a.id) ? 0 : 1;
    const bPin = pinnedIds.has(b.id) ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const fmtDate = (d: Date) => {
    const today = new Date();
    const diff = Math.floor((d.getTime() - today.setHours(0,0,0,0)) / 86400000);
    if (diff === 0) return `오늘 ${format(d, "HH:mm")}`;
    if (diff === 1) return `내일 ${format(d, "HH:mm")}`;
    if (diff < 0) return `${format(d, "M.d")} (지남)`;
    return format(d, "M.d(EEE) HH:mm", { locale: ko });
  };

  return (
    <div className="border-t flex flex-col" style={{ borderColor: colors.border, minHeight: 0 }}>
      {/* 헤더 */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left flex-shrink-0"
        onClick={() => setExpanded(v => !v)}
      >
        <ListChecks size={13} style={{ color: colors.primary }} />
        <span className="text-xs font-semibold flex-1" style={{ color: colors.text }}>
          일정모음
        </span>
        {isLoading
          ? <span className="text-[9px]" style={{ color: colors.textMuted }}>로딩중...</span>
          : <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
              {sorted.length}
            </span>
        }
        {expanded
          ? <ChevronDown size={11} style={{ color: colors.textMuted }} />
          : <ChevronRight size={11} style={{ color: colors.textMuted }} />}
      </button>

      {expanded && (
        <div className="overflow-y-auto px-2 pb-2 space-y-1"
          style={{ maxHeight: "280px", touchAction: "pan-y" }}>
          {sorted.length === 0 && !isLoading && (
            <p className="text-[10px] text-center py-4" style={{ color: colors.textMuted }}>
              미완료 일정이 없습니다
            </p>
          )}
          {sorted.map(s => {
            const isPin = pinnedIds.has(s.id);
            const isDetail = detailId === s.id;
            const completed = !!s.isCompleted;
            const startDt = new Date(s.startTime);

            return (
              <div key={s.id}
                className="rounded-lg overflow-hidden transition-all"
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${isPin ? colors.primary : colors.border}`,
                  opacity: completed ? 0.5 : 1,
                }}
              >
                {/* 일정 행 */}
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  {/* 완료 체크박스 */}
                  <button
                    className="flex-shrink-0 transition-transform active:scale-90"
                    onClick={() => toggleComplete(s.id, completed)}
                    title="완료 토글"
                  >
                    {completed
                      ? <CheckSquare size={14} style={{ color: colors.primary }} />
                      : <Square size={14} style={{ color: colors.border }} />}
                  </button>

                  {/* 제목 — 클릭하면 세부내용 토글 */}
                  <button
                    className="flex-1 text-left text-[11px] truncate"
                    style={{
                      color: completed ? colors.textMuted : colors.text,
                      textDecoration: completed ? "line-through" : "none",
                    }}
                    onClick={() => setDetailId(isDetail ? null : s.id)}
                  >
                    {isPin && <span className="mr-1" style={{ color: colors.primary }}>📌</span>}
                    {s.title}
                  </button>

                  {/* 날짜 */}
                  <span className="text-[9px] flex-shrink-0" style={{
                    color: new Date(s.startTime) < new Date() && !completed
                      ? "#ef4444" : colors.textMuted
                  }}>
                    {fmtDate(startDt)}
                  </span>
                </div>

                {/* 세부 내용 */}
                {isDetail && (
                  <div className="px-3 pb-2 pt-1 border-t space-y-1.5"
                    style={{ borderColor: colors.border }}>
                    {s.description && (
                      <p className="text-[10px]" style={{ color: colors.textMuted }}>
                        {s.description}
                      </p>
                    )}
                    <p className="text-[10px]" style={{ color: colors.textMuted }}>
                      {format(new Date(s.startTime), "yyyy.M.d HH:mm", { locale: ko })}
                      {" ~ "}
                      {format(new Date(s.endTime), "M.d HH:mm", { locale: ko })}
                    </p>
                    <div className="flex gap-1 pt-0.5">
                      <button
                        className="flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 transition-colors"
                        style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}
                        onClick={() => togglePin(s.id)}
                      >
                        <Pin size={9} />
                        {isPin ? "고정 해제" : "상단 고정"}
                      </button>
                      <button
                        className="flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 transition-colors"
                        style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}
                        onClick={() => {
                          setSelectedScheduleId(s.id);
                          setEditModalOpen(true);
                          setDetailId(null);
                        }}
                      >
                        <Pencil size={9} />수정
                      </button>
                      <button
                        className="flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 transition-colors"
                        style={{ backgroundColor: "#dcfce7", color: "#166534" }}
                        onClick={() => { toggleComplete(s.id, false); setDetailId(null); }}
                      >
                        <Check size={9} />완료
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
