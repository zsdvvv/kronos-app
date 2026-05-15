import { useState, useCallback } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, FileText, CheckCircle, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";


// 로그인 없는 사용자 - 복구 가능한 JSON/Excel 다운로드
function downloadSchedulesAsJSON(schedules: any[]) {
  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    app: "Kronos Schedule Manager",
    schedules: schedules.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      categoryId: s.categoryId,
      color: s.color,
      isRepeating: s.isRepeating,
      repeatType: s.repeatType,
      alarmMinutes: s.alarmMinutes,
    })),
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kronos_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSchedulesAsCSV(schedules: any[]) {
  const header = ["제목", "설명", "시작시간", "종료시간", "카테고리ID", "색상", "반복여부", "반복유형", "알림(분)"];
  const rows = schedules.map((s) => [
    s.title || "",
    s.description || "",
    s.startTime || "",
    s.endTime || "",
    s.categoryId || "",
    s.color || "",
    s.isRepeating ? "Y" : "N",
    s.repeatType || "",
    s.alarmMinutes || "",
  ]);
  const csvContent = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kronos_backup_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportModal() {
  const { colors } = useThemeStore();
  const { isImportModalOpen, setImportModalOpen } = useScheduleStore();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState("excel");
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<Array<any>>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const parseExcelMutation = trpc.import.parseExcel.useMutation();
  const parseTextMutation = trpc.import.parseText.useMutation();
  const parseMarkdownMutation = trpc.import.parseMarkdown.useMutation();
  const batchCreateMutation = trpc.schedule.batchCreate.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });

  const reset = () => {
    setFileName("");
    setParsedData([]);
    void false; // no-op
    setImportResult(null);
  };

  const closeModal = () => {
    setImportModalOpen(false);
    reset();
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileName(file.name);
      void true; // loading
      setParsedData([]);
      setImportResult(null);

      const reader = new FileReader();

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".csv")) {
        reader.onload = (e) => {
          const data = e.target?.result;
          if (!data) return;

          // For demo, parse simple CSV
          const text = data as string;
          const lines = text.split("\n");
          const parsed = lines
            .filter((l) => l.trim())
            .map((line) => {
              const parts = line.split(",").map((p) => p.trim());
              const obj: Record<string, string> = {};
              parts.forEach((p, i) => {
                obj[`col${i}`] = p;
              });
              return obj;
            });

          parseExcelMutation.mutate(
            { data: parsed },
            {
              onSuccess: (res) => {
                setParsedData(res.schedules);
                void false; // no-op
              },
            }
          );
        };
        reader.readAsText(file);
      } else if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (!content) return;

          const mutation = file.name.endsWith(".md") ? parseMarkdownMutation : parseTextMutation;
          mutation.mutate(
            { content },
            {
              onSuccess: (res) => {
                setParsedData(res.schedules);
                void false; // no-op
              },
            }
          );
        };
        reader.readAsText(file);
      }
    },
    [parseExcelMutation, parseMarkdownMutation, parseTextMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "text/markdown": [".md"],
      "text/plain": [".txt"],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    const schedules = parsedData.map((s) => ({
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      source: activeTab as "excel" | "notion" | "markdown" | "text",
    }));

    try {
      await batchCreateMutation.mutateAsync(schedules);
      setImportResult({ success: schedules.length, failed: 0 });
    } catch {
      setImportResult({ success: 0, failed: schedules.length });
    }
  };

  return (
    <Dialog open={isImportModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent
        className="sm:max-w-xl"
        style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colors.text }}>파일 가져오기</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); reset(); }}>
          <TabsList className="grid grid-cols-4" style={{ backgroundColor: colors.background }}>
            <TabsTrigger value="excel" className="text-xs">엑셀/CSV</TabsTrigger>
            <TabsTrigger value="notion" className="text-xs">노션</TabsTrigger>
            <TabsTrigger value="markdown" className="text-xs">마크다운</TabsTrigger>
            <TabsTrigger value="text" className="text-xs">텍스트</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {/* Drop Zone */}
            {!importResult && (
              <div
                {...getRootProps()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragActive ? colors.primary : colors.border,
                  backgroundColor: isDragActive ? `${colors.primary}08` : colors.background,
                }}
              >
                <input {...getInputProps()} />
                <Upload size={32} style={{ color: isDragActive ? colors.primary : colors.textMuted }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: colors.text }}>
                  {isDragActive ? "파일을 여기에 놓으세요" : "파일을 드래그하거나 클릭하여 선택하세요"}
                </p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  지원: .xlsx, .csv, .md, .txt
                </p>
              </div>
            )}

            {/* File Info */}
            {fileName && !importResult && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: colors.background }}>
                {activeTab === "excel" ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                <span className="text-xs font-medium">{fileName}</span>
                {parsedData.length > 0 && (
                  <span className="text-xs ml-auto" style={{ color: colors.success }}>
                    {parsedData.length}개 파싱됨
                  </span>
                )}
              </div>
            )}

            {/* Preview */}
            {parsedData.length > 0 && !importResult && (
              <div className="mt-3">
                <div className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>미리보기 ({parsedData.length}개)</div>
                <div className="max-h-40 overflow-y-auto rounded-lg border" style={{ borderColor: colors.border }}>
                  {parsedData.slice(0, 10).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 text-xs border-b last:border-0"
                      style={{ borderColor: colors.border }}
                    >
                      <span className="font-medium flex-1 truncate">{item.title}</span>
                      <span style={{ color: colors.textMuted }}>
                        {new Date(item.startTime).toLocaleString("ko-KR")}
                      </span>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <div className="px-3 py-2 text-xs text-center" style={{ color: colors.textMuted }}>
                      외 {parsedData.length - 10}개 더...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Import Button */}
            {parsedData.length > 0 && !importResult && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleImport}
                  disabled={batchCreateMutation.isPending}
                  style={{ backgroundColor: colors.primary, color: colors.cardBg }}
                >
                  {batchCreateMutation.isPending ? "가져오는 중..." : `${parsedData.length}개 일정 가져오기`}
                </Button>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="text-center py-6">
                <CheckCircle size={48} style={{ color: colors.success }} className="mx-auto mb-3" />
                <p className="text-lg font-semibold" style={{ color: colors.text }}>가져오기 완료!</p>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  {importResult.success}개의 일정이 성공적으로 추가되었습니다.
                </p>
                <Button className="mt-4" onClick={closeModal} style={{ backgroundColor: colors.primary, color: colors.cardBg }}>
                  확인
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      {/* Export / Download for guest users */}
        <ExportSection />
      </DialogContent>
    </Dialog>
  );
}

function ExportSection() {
  const { colors } = useThemeStore();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [exporting, setExporting] = useState(false);

  const { data: allSchedules } = trpc.schedule.list.useQuery({
    startDate: new Date(2020, 0, 1).toISOString(),
    endDate: new Date(2099, 11, 31).toISOString(),
    view: "month",
  });

  const schedules = allSchedules || [];

  if (schedules.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: colors.border }}>
      <div className="flex items-center gap-2 mb-2">
        <Download size={13} style={{ color: colors.primary }} />
        <span className="text-xs font-semibold" style={{ color: colors.text }}>스케줄 백업 다운로드</span>
        {!isAuthenticated && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
            비로그인 복구용
          </span>
        )}
      </div>
      <p className="text-[10px] mb-2" style={{ color: colors.textMuted }}>
        현재 저장된 {schedules.length}개 일정을 다운로드합니다. 앱/웹에서 복구 가능한 형식입니다.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs gap-1"
          onClick={() => downloadSchedulesAsJSON(schedules)}
          style={{ borderColor: colors.border, color: colors.text }}
        >
          <Download size={12} />
          JSON 백업
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs gap-1"
          onClick={() => downloadSchedulesAsCSV(schedules)}
          style={{ borderColor: colors.border, color: colors.text }}
        >
          <FileSpreadsheet size={12} />
          CSV(엑셀) 백업
        </Button>
      </div>
    </div>
  );
}
