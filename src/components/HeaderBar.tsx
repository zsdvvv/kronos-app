import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, ChevronLeft, ChevronRight, Clock, Plus,
  MessageCircle, LogIn, LogOut, User, Bell, Upload, Menu,
} from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

interface HeaderBarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export function HeaderBar({ onToggleSidebar, sidebarOpen }: HeaderBarProps) {
  const { colors } = useThemeStore();
  const {
    currentDate, viewMode, weekCount, goToPrev, goToNext, goToToday,
    setCreateModalOpen, setGuruPanelOpen, setImportModalOpen,
    isGuruPanelOpen, searchQuery, setSearchQuery,
  } = useScheduleStore();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 뷰 모드별 제목
  const getTitleText = () => {
    if (viewMode === "day") {
      return format(currentDate, "yyyy년 M월 d일 EEEE", { locale: ko });
    }
    if (viewMode === "week") {
      const count = weekCount || 1;
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 7 * count - 1);
      if (count === 1) {
        return `${format(weekStart, "M월 d일", { locale: ko })} ~ ${format(weekEnd, "M월 d일", { locale: ko })}`;
      }
      return `${format(weekStart, "M월 d일", { locale: ko })} ~ ${format(weekEnd, "M월 d일", { locale: ko })} (${count}주)`;
    }
    return format(currentDate, "yyyy년 M월", { locale: ko });
  };

  const today = new Date();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const todayStr = `${today.getMonth() + 1}.${today.getDate()} ${weekdays[today.getDay()]}`;

  return (
    <header
      className="h-14 flex items-center justify-between px-3 border-b flex-shrink-0 gap-2"
      style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
    >
      {/* 왼쪽 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 모바일 사이드바 토글 */}
        <button
          className="p-1.5 rounded-lg md:hidden"
          onClick={onToggleSidebar}
          style={{ color: colors.textMuted }}
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Clock size={16} style={{ color: colors.primary }} />
          <span
            className="text-xs font-mono tabular-nums hidden sm:block"
            style={{ color: colors.primary, minWidth: "5rem" }}
          >
            {format(currentTime, "HH:mm:ss")}
          </span>
        </div>

        {/* 이전/다음/오늘 */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrev}
            style={{ color: colors.text }}>
            <ChevronLeft size={16} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 flex flex-col items-center leading-none"
            onClick={goToToday}
            style={{ color: colors.text }}
          >
            <span className="text-[11px] font-semibold">오늘</span>
            <span className="text-[9px] mt-0.5" style={{ color: colors.primary }}>
              ({todayStr})
            </span>
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNext}
            style={{ color: colors.text }}>
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* 현재 뷰 제목 */}
        <h1
          className="text-sm font-semibold hidden md:block truncate max-w-[200px]"
          style={{ fontFamily: "Cormorant Garamond, serif", color: colors.text }}
        >
          {getTitleText()}
        </h1>
      </div>

      {/* 가운데 검색 */}
      <div className="flex-1 max-w-xs mx-2 hidden sm:block">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: colors.textMuted }} />
          <Input
            placeholder="일정 검색..."
            className="h-8 pl-8 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
          />
        </div>
      </div>

      {/* 오른쪽 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => setImportModalOpen(true)}
          style={{ color: colors.text }}>
          <Upload size={15} />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => setGuruPanelOpen(!isGuruPanelOpen)}
          style={{ color: isGuruPanelOpen ? colors.primary : colors.text }}>
          <MessageCircle size={15} />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8"
          style={{ color: colors.text }}>
          <Bell size={15} />
        </Button>

        <div className="w-px h-5" style={{ backgroundColor: colors.border }} />

        {isAuthenticated && user ? (
          <div className="flex items-center gap-1.5">
            {user.role === "admin" && (
              <button
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold hidden sm:block"
                style={{ backgroundColor: colors.primary, color: "#fff" }}
                onClick={() => navigate("/admin")}
                title="관리자 패널"
              >
                관리자
              </button>
            )}
            <span className="text-xs hidden sm:block">{user.name || "사용자"}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout}
              style={{ color: colors.textMuted }}>
              <LogOut size={14} />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs"
            onClick={() => window.location.href = "/login"}
            style={{ color: colors.primary }}>
            <LogIn size={13} />
            <span className="hidden sm:inline">로그인</span>
          </Button>
        )}

        <Button size="sm" className="h-8 gap-1 text-xs"
          onClick={() => setCreateModalOpen(true)}
          style={{ backgroundColor: colors.primary, color: colors.cardBg }}>
          <Plus size={13} />
          <span className="hidden sm:inline">일정 추가</span>
          <span className="sm:hidden">추가</span>
        </Button>
      </div>
    </header>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
}
