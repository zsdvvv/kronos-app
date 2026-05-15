import { useState } from "react";
import { useThemeStore, type ThemeName } from "@/store/themeStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";

const themeOptions: { value: ThemeName; label: string; desc: string }[] = [
  { value: "modern", label: "모던 세이지", desc: "따뜻한 크림 톤의 현대적 디자인" },
  { value: "classic", label: "클래식 테일러", desc: "빈티지 아이보리의 클래식한 감성" },
  { value: "dark", label: "시네마틱 다크", desc: "네온 컬러의 다크 모드" },
];

export function ThemeSwitcher() {
  const { theme, setTheme, colors } = useThemeStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg"
            style={{
              backgroundColor: colors.primary,
              color: colors.cardBg,
            }}
          >
            <Palette size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          {themeOptions.map((t) => (
            <DropdownMenuItem
              key={t.value}
              className="flex items-center gap-3 py-2.5 cursor-pointer"
              onClick={() => {
                setTheme(t.value);
                setOpen(false);
              }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: theme === t.value ? "#2f3e35" : "#ddd",
                  backgroundColor:
                    t.value === "modern"
                      ? "#f7f6f2"
                      : t.value === "classic"
                      ? "#fdfbf7"
                      : "#101010",
                }}
              >
                {theme === t.value && <Check size={12} style={{ color: t.value === "dark" ? "#00f0ff" : "#2f3e35" }} />}
              </div>
              <div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-[10px]" style={{ color: "#6b7280" }}>{t.desc}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
