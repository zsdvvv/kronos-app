import { useThemeStore } from "@/store/themeStore";
import { trpc } from "@/providers/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  CheckCircle2,
  CalendarDays,
  Repeat,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export function DashboardBar() {
  const { colors } = useThemeStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: stats } = trpc.dashboard.stats.useQuery({ period: "week" });

  if (!stats) return null;

  const pieData = stats.categoryBreakdown.map((c) => ({
    name: c.categoryName,
    value: c.count,
    color: c.color,
  }));

  const trendData = stats.dailyTrend.map((d) => ({
    date: d.date.slice(5),
    count: d.count,
    completed: d.completed,
  }));

  return (
    <div
      className="border-t flex-shrink-0 transition-all duration-300"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.cardBg,
        maxHeight: isExpanded ? "320px" : "44px",
      }}
    >
      {/* Collapsed Bar */}
      <button
        className="w-full h-11 flex items-center justify-between px-4 hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} style={{ color: colors.primary }} />
            <span className="text-xs font-medium">대시보드</span>
          </div>

          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} style={{ color: colors.textMuted }} />
            <span className="text-xs" style={{ color: colors.textMuted }}>
              총 <strong style={{ color: colors.text }}>{stats.totalSchedules}</strong>개
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} style={{ color: colors.success }} />
            <span className="text-xs" style={{ color: colors.textMuted }}>
              완료 <strong style={{ color: colors.success }}>{stats.completionRate}%</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Repeat size={12} style={{ color: colors.accent }} />
            <span className="text-xs" style={{ color: colors.textMuted }}>
              반복 <strong style={{ color: colors.accent }}>{stats.repeatingSchedules}</strong>개
            </span>
          </div>
        </div>

        {isExpanded ? (
          <ChevronDown size={16} style={{ color: colors.textMuted }} />
        ) : (
          <ChevronUp size={16} style={{ color: colors.textMuted }} />
        )}
      </button>

      {/* Expanded Dashboard */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: colors.border }}>
          <div className="grid grid-cols-3 gap-4 mt-3">
            {/* Daily Trend Chart */}
            <div className="rounded-xl border p-3" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
              <div className="text-xs font-semibold mb-2">일별 일정 추이</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} width={20} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: colors.text,
                    }}
                  />
                  <Bar dataKey="count" fill={colors.primary} radius={[3, 3, 0, 0]} name="전체" />
                  <Bar dataKey="completed" fill={colors.success} radius={[3, 3, 0, 0]} name="완료" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            <div className="rounded-xl border p-3" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
              <div className="text-xs font-semibold mb-2">카테고리 분포</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.cardBg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: colors.text,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-xs" style={{ color: colors.textMuted }}>
                  데이터 없음
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
              <div className="text-xs font-semibold mb-2">주간 요약</div>

              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: colors.textMuted }}>총 일정</span>
                <span className="text-sm font-bold" style={{ color: colors.primary }}>{stats.totalSchedules}개</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: colors.textMuted }}>완료율</span>
                <span className="text-sm font-bold" style={{ color: colors.success }}>{stats.completionRate}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: colors.textMuted }}>반복 일정</span>
                <span className="text-sm font-bold" style={{ color: colors.accent }}>{stats.repeatingSchedules}개</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: colors.textMuted }}>예상 총 시간</span>
                <span className="text-sm font-bold">{stats.totalHours.toFixed(0)}시간</span>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="h-1.5 rounded-full" style={{ backgroundColor: colors.border }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${stats.completionRate}%`,
                      backgroundColor: colors.success,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
