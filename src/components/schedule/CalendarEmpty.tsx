import { useThemeStore } from "@/store/themeStore";
import { CalendarX } from "lucide-react";

export function CalendarEmpty() {
  const { colors } = useThemeStore();

  return (
    <div className="flex flex-col items-center justify-center py-6 opacity-50">
      <CalendarX size={20} style={{ color: colors.textMuted }} />
      <span className="text-[10px] mt-1" style={{ color: colors.textMuted }}>일정 없음</span>
    </div>
  );
}
