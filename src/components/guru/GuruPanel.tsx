import { useState, useRef, useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  UserCircle,
  Sparkles,
  Trash2,
  GraduationCap,
  Briefcase,
  Stethoscope,
  Scale,
  Laptop,
  Bot,
} from "lucide-react";

const guruOptions = [
  { value: "general", label: "크로노스", icon: <Bot size={14} />, desc: "일정 관리 전문가" },
  { value: "student", label: "학생 멘토", icon: <GraduationCap size={14} />, desc: "학업 일정 특화" },
  { value: "worker", label: "직장인 코치", icon: <Briefcase size={14} />, desc: "업무 효율 특화" },
  { value: "doctor", label: "의사 코치", icon: <Stethoscope size={14} />, desc: "의료 일정 특화" },
  { value: "lawyer", label: "변호사 코치", icon: <Scale size={14} />, desc: "법률 일정 특화" },
  { value: "freelancer", label: "프리랜서 코치", icon: <Laptop size={14} />, desc: "프리랜서 특화" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function GuruPanel() {
  const { colors } = useThemeStore();
  type GuruType = "student" | "worker" | "doctor" | "lawyer" | "freelancer" | "general";
  const [guruType, setGuruType] = useState<GuruType>("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history } = trpc.guru.getHistory.useQuery({ guruType });
  const chatMutation = trpc.guru.chat.useMutation();
  const clearMutation = trpc.guru.clearHistory.useMutation();

  // Load history when it changes
  useEffect(() => {
    if (history?.messages) {
      setMessages(history.messages as Message[]);
    } else {
      setMessages([]);
    }
  }, [history]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await chatMutation.mutateAsync({
        message: userMessage.content,
        guruType: guruType as any,
      });

      if (res.response) {
        const assistantMessage: Message = {
          role: "assistant",
          content: res.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해 주세요.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleClear = async () => {
    await clearMutation.mutateAsync({ guruType: guruType as any });
    setMessages([]);
  };

  const selectedGuru = guruOptions.find((g) => g.value === (guruType as GuruOptionValue));
  type GuruOptionValue = typeof guruOptions[number]["value"];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: colors.primary }} />
            <span className="text-sm font-semibold">AI 코치</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClear}
            title="대화 초기화"
          >
            <Trash2 size={12} style={{ color: colors.textMuted }} />
          </Button>
        </div>

        <Select value={guruType} onValueChange={(v) => setGuruType(v as GuruType)}>
          <SelectTrigger
            className="h-8 text-xs"
            style={{ backgroundColor: colors.background, borderColor: colors.border }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {guruOptions.map((g) => (
              <SelectItem key={g.value} value={g.value} className="text-xs">
                <div className="flex items-center gap-2">
                  {g.icon}
                  <span>{g.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${colors.primary}15` }}
            >
              <Sparkles size={20} style={{ color: colors.primary }} />
            </div>
            <p className="text-xs font-medium" style={{ color: colors.textMuted }}>
              {selectedGuru?.label}와 대화를 시작하세요
            </p>
            <p className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
              일정 관리, 동기부여, 조언 등을 물어보세요
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: msg.role === "assistant" ? `${colors.primary}15` : colors.hover,
              }}
            >
              {msg.role === "assistant" ? (
                <Sparkles size={12} style={{ color: colors.primary }} />
              ) : (
                <UserCircle size={12} style={{ color: colors.textMuted }} />
              )}
            </div>
            <div
              className="max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed"
              style={{
                backgroundColor: msg.role === "assistant" ? colors.background : colors.primary,
                color: msg.role === "assistant" ? colors.text : colors.cardBg,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.primary}15` }}
            >
              <Sparkles size={12} style={{ color: colors.primary }} />
            </div>
            <div
              className="rounded-xl px-3 py-2 text-xs"
              style={{ backgroundColor: colors.background, color: colors.textMuted }}
            >
              <span className="animate-pulse">생각 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: colors.border }}>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
          />
          <Button
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleSend}
            disabled={chatMutation.isPending || !input.trim()}
            style={{ backgroundColor: colors.primary, color: colors.cardBg }}
          >
            <Send size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
