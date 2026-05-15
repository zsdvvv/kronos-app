import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  MessageCircle,
  LogIn,
  LogOut,
  User,
  Bell,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect } from "react";

export function HeaderBar() {
  const { colors } = useThemeStore();
  const { currentDate, viewMode, goToPrev, goToNext, goToToday, setCreateModalOpen, setGuruPanelOpen, setImportModalOpen, isGuruPanelOpen, searchQuery, setSearchQuery } = useScheduleStore();
  const { user, isAuthenticated, logout } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const titleText =
    viewMode === "day"
      ? format(currentDate, "yyyy년 M월 d일 EEEE", { locale: ko })
      : viewMode === "week"
      ? `${format(currentDate, "yyyy년 M월", { locale: ko })} ${getWeekNumber(currentDate)}주차`
      : format(currentDate, "yyyy년 M월", { locale: ko });

  return (
    <header
      className="h-14 flex items-center justify-between px-4 border-b flex-shrink-0"
      style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Clock size={18} style={{ color: colors.primary }} />
          <span className="font-mono text-sm font-medium">
            {format(currentTime, "HH:mm:ss")}
          </span>
        </div>

        <div className="w-px h-6" style={{ backgroundColor: colors.border }} />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPrev}
            style={{ color: colors.text }}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto text-sm font-medium flex flex-col items-center px-2 py-1"
            onClick={goToToday}
            style={{ color: colors.text }}
          >
            <span className="text-xs font-semibold leading-tight">오늘</span>
            <span className="text-[9px] font-normal leading-tight" style={{ color: colors.primary }}>
              ({format(new Date(), "M.d EEE", { locale: ko })})
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNext}
            style={{ color: colors.text }}
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <h1 className="text-base font-semibold ml-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
          {titleText}
        </h1>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
          <Input
            placeholder="일정 검색..."
            className="h-8 pl-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setImportModalOpen(true)}
          title="파일 가져오기"
          style={{ color: colors.text }}
        >
          <Upload size={16} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={() => setGuruPanelOpen(!isGuruPanelOpen)}
          title="AI 코치"
          style={{ color: isGuruPanelOpen ? colors.primary : colors.text }}
        >
          <MessageCircle size={16} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          title="알림"
          style={{ color: colors.text }}
        >
          <Bell size={16} />
        </Button>

        <div className="w-px h-6 mx-1" style={{ backgroundColor: colors.border }} />

        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <User size={14} style={{ color: colors.primary }} />
              <span className="text-xs font-medium">{user.name || "사용자"}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={logout}
              title="로그아웃"
              style={{ color: colors.textMuted }}
            >
              <LogOut size={14} />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => window.location.href = "/login"}
            style={{ color: colors.primary }}
          >
            <LogIn size={14} />
            로그인
          </Button>
        )}

        <Button
          size="sm"
          className="h-8 gap-1 text-xs ml-1"
          onClick={() => setCreateModalOpen(true)}
          style={{ backgroundColor: colors.primary, color: colors.cardBg }}
        >
          <Plus size={14} />
          일정 추가
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
