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
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const { colors } = useThemeStore();
  const { isGuruPanelOpen } = useScheduleStore();

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* Top Header Bar */}
      <HeaderBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto min-h-0">
            <CalendarView />
          </div>

          {/* Bottom Dashboard */}
          <DashboardBar />
        </div>

        {/* Right Guru Panel */}
        {isGuruPanelOpen && (
          <div className="w-80 border-l flex-shrink-0" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
            <GuruPanel />
          </div>
        )}
      </div>

      {/* Modals */}
      <ScheduleModal />
      <ImportModal />

      {/* Theme Switcher Floating Button */}
      <ThemeSwitcher />
    </div>
  );
}
