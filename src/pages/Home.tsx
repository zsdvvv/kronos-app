import { useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { Sidebar } from "@/components/schedule/Sidebar";
import { CalendarView } from "@/components/schedule/CalendarView";
import { DashboardBar } from "@/components/dashboard/DashboardBar";
import { GuruPanel } from "@/components/guru/GuruPanel";
import { ScheduleModal } from "@/components/schedule/ScheduleModal";
import { ImportModal } from "@/components/import/ImportModal";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { HeaderBar } from "@/components/HeaderBar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const { colors } = useThemeStore();
  const { isGuruPanelOpen } = useScheduleStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      <HeaderBar onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 — 모바일에서 슬라이드 인/아웃 */}
        <div
          className="flex-shrink-0 transition-all duration-300 overflow-hidden"
          style={{ width: sidebarOpen ? undefined : 0 }}
        >
          <Sidebar />
        </div>

        {/* 사이드바 토글 탭 (항상 보임) */}
        <button
          className="flex-shrink-0 flex items-center justify-center w-4 border-r border-l z-10 transition-colors hover:opacity-70"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.textMuted,
          }}
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
        >
          {sidebarOpen
            ? <ChevronLeft size={12} />
            : <ChevronRight size={12} />}
        </button>

        {/* 캘린더 영역 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0">
            <CalendarView />
          </div>
          <DashboardBar />
        </div>

        {/* Guru 패널 */}
        {isGuruPanelOpen && (
          <div
            className="w-80 border-l flex-shrink-0"
            style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
          >
            <GuruPanel />
          </div>
        )}
      </div>

      <ScheduleModal />
      <ImportModal />
      <ThemeSwitcher />
    </div>
  );
}
