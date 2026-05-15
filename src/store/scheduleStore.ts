import { create } from "zustand";

export type ViewMode = "day" | "week" | "month";

interface ScheduleState {
  viewMode: ViewMode;
  currentDate: Date;
  selectedScheduleId: number | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isImportModalOpen: boolean;
  isGuruPanelOpen: boolean;
  searchQuery: string;
  selectedCategoryId: number | null;
  timezone: string;
  dayStartHour: number;
  dayEndHour: number;
  weekCount: number;

  setViewMode: (mode: ViewMode) => void;
  setCurrentDate: (date: Date) => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToToday: () => void;
  setSelectedScheduleId: (id: number | null) => void;
  setCreateModalOpen: (open: boolean) => void;
  setEditModalOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  setGuruPanelOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryId: (id: number | null) => void;
  setTimezone: (tz: string) => void;
  setDayStartHour: (h: number) => void;
  setDayEndHour: (h: number) => void;
  setWeekCount: (n: number) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  viewMode: "week",
  currentDate: new Date(),
  selectedScheduleId: null,
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isImportModalOpen: false,
  isGuruPanelOpen: false,
  searchQuery: "",
  selectedCategoryId: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dayStartHour: 7,
  dayEndHour: 22,
  weekCount: 1,

  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentDate: (date) => set({ currentDate: date }),
  goToPrev: () =>
    set((s) => {
      const d = new Date(s.currentDate);
      if (s.viewMode === "day") d.setDate(d.getDate() - 1);
      else if (s.viewMode === "week") d.setDate(d.getDate() - 7 * (s.weekCount || 1));
      else d.setMonth(d.getMonth() - 1);
      return { currentDate: d };
    }),
  goToNext: () =>
    set((s) => {
      const d = new Date(s.currentDate);
      if (s.viewMode === "day") d.setDate(d.getDate() + 1);
      else if (s.viewMode === "week") d.setDate(d.getDate() + 7 * (s.weekCount || 1));
      else d.setMonth(d.getMonth() + 1);
      return { currentDate: d };
    }),
  goToToday: () => set({ currentDate: new Date() }),
  setSelectedScheduleId: (id) => set({ selectedScheduleId: id }),
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  setEditModalOpen: (open) => set({ isEditModalOpen: open }),
  setImportModalOpen: (open) => set({ isImportModalOpen: open }),
  setGuruPanelOpen: (open) => set({ isGuruPanelOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  setTimezone: (tz) => set({ timezone: tz }),
  setDayStartHour: (h) => set({ dayStartHour: h }),
  setDayEndHour: (h) => set({ dayEndHour: h }),
  setWeekCount: (n) => set({ weekCount: n }),
}));
