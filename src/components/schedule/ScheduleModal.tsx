import { useState, useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

// ─── 저장 성공 토스트 ───
function SaveToast({ visible }: { visible: boolean }) {
  const { colors } = useThemeStore();
  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-none transition-all duration-500"
      style={{
        backgroundColor: colors.primary,
        color: "#fff",
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? "0" : "-12px"})`,
      }}
    >
      ✓ 일정 저장 완료
    </div>
  );
}

export function ScheduleModal() {
  const { colors } = useThemeStore();
  const {
    isCreateModalOpen,
    setCreateModalOpen,
    isEditModalOpen,
    setEditModalOpen,
    selectedScheduleId,
    currentDate,
    createInitData,
  } = useScheduleStore();
  const utils = trpc.useUtils();

  const isOpen = isCreateModalOpen || isEditModalOpen;
  const isEdit = isEditModalOpen;

  const { data: existingSchedule } = trpc.schedule.getById.useQuery(
    { id: selectedScheduleId! },
    { enabled: isEdit && !!selectedScheduleId }
  );
  const { data: categories } = trpc.category.list.useQuery();

  // Toast 상태
  const [showToast, setShowToast] = useState(false);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1200);
  };

  const createMutation = trpc.schedule.create.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      utils.dashboard.stats.invalidate();
      triggerToast();
      setTimeout(() => closeModal(), 200); // 토스트 살짝 보인 후 닫기
    },
    onError: (err) => {
      alert("일정 추가 실패: " + err.message);
    },
  });

  const updateMutation = trpc.schedule.update.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      utils.dashboard.stats.invalidate();
      triggerToast();
      setTimeout(() => closeModal(), 200);
    },
    onError: (err) => {
      alert("일정 수정 실패: " + err.message);
    },
  });

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(currentDate, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(currentDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [color, setColor] = useState("#fffefa");
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatType, setRepeatType] = useState("weekly");
  const [alarmMinutes, setAlarmMinutes] = useState([15]);

  // 초기화: 편집모드 or 새 일정(initData 반영)
  useEffect(() => {
    if (isEdit && existingSchedule) {
      const s = existingSchedule.schedules;
      setTitle(s.title);
      setDescription(s.description || "");
      setDate(format(new Date(s.startTime), "yyyy-MM-dd"));
      setEndDate(format(new Date(s.endTime), "yyyy-MM-dd"));
      setStartTime(format(new Date(s.startTime), "HH:mm"));
      setEndTime(format(new Date(s.endTime), "HH:mm"));
      setAllDay(false);
      setCategoryId(s.categoryId?.toString() || "");
      setColor(s.color || "#fffefa");
      setIsRepeating(s.isRepeating || false);
      setRepeatType(s.repeatPattern?.type || "weekly");
      setAlarmMinutes([s.alarmMinutes || 15]);
    } else if (isCreateModalOpen) {
      const init = createInitData;
      const baseDate = init?.date ?? format(currentDate, "yyyy-MM-dd");
      setTitle("");
      setDescription("");
      setDate(baseDate);
      setEndDate(init?.endDate ?? baseDate);
      setStartTime(init?.startTime ?? "09:00");
      setEndTime(init?.endTime ?? "10:00");
      setAllDay(init?.allDay ?? false);
      setCategoryId("");
      setColor("#fffefa");
      setIsRepeating(false);
      setRepeatType("weekly");
      setAlarmMinutes([15]);
    }
  }, [isEdit, existingSchedule, isCreateModalOpen, currentDate, createInitData]);

  const closeModal = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let startDateTime: Date;
    let endDateTime: Date;

    if (allDay) {
      startDateTime = new Date(`${date}T00:00:00`);
      endDateTime = new Date(`${endDate}T23:59:59`);
    } else {
      startDateTime = new Date(`${date}T${startTime}`);
      endDateTime = new Date(`${endDate}T${endTime}`);
    }

    // endDateTime이 startDateTime보다 앞이면 자동 보정
    if (endDateTime < startDateTime) endDateTime = new Date(startDateTime.getTime() + 3600000);

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      color,
      isRepeating,
      repeatPattern: isRepeating
        ? { type: repeatType as "daily" | "weekly" | "monthly" | "hourly" | "custom" }
        : undefined,
      alarmMinutes: alarmMinutes[0],
    };

    if (isEdit && selectedScheduleId) {
      updateMutation.mutate({ id: selectedScheduleId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const presetColors = [
    "#fffefa", "#fef3c7", "#dbeafe", "#fce7f3",
    "#d1fae5", "#e0e7ff", "#ffedd5", "#f3e8ff",
    "#e8a95e", "#7d8a74", "#bc6c25", "#3a4f41",
  ];

  return (
    <>
      <SaveToast visible={showToast} />

      <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>
              {isEdit ? "일정 수정" : "새 일정"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Title */}
            <div>
              <Label className="text-xs" style={{ color: colors.textMuted }}>제목 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="일정 제목을 입력하세요"
                className="mt-1"
                required
                autoFocus
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs" style={{ color: colors.textMuted }}>설명</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상세 설명 (선택)"
                className="mt-1"
                rows={2}
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-xs" style={{ color: colors.textMuted }}>종일</Label>
              <Switch checked={allDay} onCheckedChange={setAllDay} />
            </div>

            {/* Date & Time */}
            {allDay ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: colors.textMuted }}>시작 날짜</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: colors.textMuted }}>종료 날짜</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: colors.textMuted }}>날짜</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" required
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: colors.textMuted }}>시작 시간</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" required
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: colors.textMuted }}>종료 시간</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" required
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <Label className="text-xs" style={{ color: colors.textMuted }}>카테고리</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || "#7d8a74" }} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Picker */}
            <div>
              <Label className="text-xs" style={{ color: colors.textMuted }}>배경색</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {presetColors.map((c) => (
                  <button key={c} type="button" className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: color === c ? colors.primary : colors.border, transform: color === c ? "scale(1.15)" : "scale(1)" }}
                    onClick={() => setColor(c)} />
                ))}
              </div>
            </div>

            {/* Alarm */}
            <div>
              <Label className="text-xs" style={{ color: colors.textMuted }}>
                알람 ({alarmMinutes[0] === 0 ? "없음" : `${alarmMinutes[0]}분 전`})
              </Label>
              <Slider value={alarmMinutes} onValueChange={setAlarmMinutes} min={0} max={120} step={5} className="mt-2" />
            </div>

            {/* Repeat — 항상 표시 */}
            <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold" style={{ color: colors.text }}>🔁 반복 일정</Label>
                <Switch checked={isRepeating} onCheckedChange={setIsRepeating} />
              </div>
              {isRepeating && (
                <Select value={repeatType} onValueChange={setRepeatType}>
                  <SelectTrigger style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">매 시간</SelectItem>
                    <SelectItem value="daily">매일</SelectItem>
                    <SelectItem value="weekly">매주</SelectItem>
                    <SelectItem value="monthly">매월</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeModal}
                style={{ borderColor: colors.border, color: colors.text }}>
                취소
              </Button>
              <Button type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || !title.trim()}
                style={{ backgroundColor: colors.primary, color: colors.cardBg }}>
                {createMutation.isPending || updateMutation.isPending
                  ? "저장 중..."
                  : isEdit ? "수정 확인" : "추가"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
