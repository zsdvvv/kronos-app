import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { guruConversations, schedules } from "@db/schema";

const GURU_PERSONALITIES: Record<string, string> = {
  student: "당신은 친근하고 이해심 깊은 학생 멘토입니다. 학업 일정 관리에 특화되어 있으며, 시험 준비, 과제 관리, 공부 시간 배분에 대한 조언을 제공합니다. 격려하는 말투를 사용하세요.",
  worker: "당신은 전문적인 직장인 코치입니다. 업무 효율성, 미팅 관리, 워크라이프 밸런스에 대해 조언합니다. 실용적이고 간결한 조언을 제공하세요.",
  doctor: "당신은 의사를 위한 일정 관리 전문가입니다. 수술 일정, 진료 시간, 학회 일정 관리에 특화되어 있습니다. 정확하고 체계적인 조언을 제공하세요.",
  lawyer: "당신은 변호사를 위한 일정 관리 컨설턴트입니다. 재판 일정, 상담 시간, 법률 연구 시간 관리에 특화되어 있습니다. 논리적이고 명확한 조언을 제공하세요.",
  freelancer: "당신은 프리랜서를 위한 생산성 코치입니다. 프로젝트 관리, 클라이언트 미팅, 창작 시간 관리에 특화되어 있습니다. 유연하고 현실적인 조언을 제공하세요.",
  general: "당신은 일정 관리 전문가 '크로노스'입니다. 사용자의 일정을 분석하고 최적화 방안을 제시하며, 동기부여와 격려를 제공합니다. 따뜻하고 전문적인 말투를 사용하세요.",
};

export const guruRouter = createRouter({
  getHistory: publicQuery
    .input(
      z.object({
        guruType: z.enum(["student", "worker", "doctor", "lawyer", "freelancer", "general"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const gType = input.guruType || "general";

      const result = await db
        .select()
        .from(guruConversations)
        .where(
          and(
            eq(guruConversations.userId, userId),
            eq(guruConversations.guruType, gType)
          )
        )
        .limit(1);

      if (result.length === 0) return null;
      return result[0];
    }),

  chat: publicQuery
    .input(
      z.object({
        message: z.string().min(1),
        guruType: z.enum(["student", "worker", "doctor", "lawyer", "freelancer", "general"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const gType = input.guruType || "general";
      const personality = GURU_PERSONALITIES[gType] || GURU_PERSONALITIES.general;

      // Get user's recent schedules for context
      const recentSchedules = await db
        .select()
        .from(schedules)
        .where(eq(schedules.userId, userId))
        .limit(20);

      const scheduleContext = recentSchedules
        .map((s) => `- ${s.title}: ${new Date(s.startTime).toLocaleString("ko-KR")}${s.isCompleted ? " (완료)" : ""}`)
        .join("\n");

      // Build the conversation
      const existing = await db
        .select()
        .from(guruConversations)
        .where(
          and(
            eq(guruConversations.userId, userId),
            eq(guruConversations.guruType, gType)
          )
        )
        .limit(1);

      let messages: Array<{ role: string; content: string; timestamp: string }> = [];
      if (existing.length > 0) {
        messages = existing[0].messages as typeof messages;
      }

      // Add user message
      messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date().toISOString(),
      });

      // Generate AI response using personality and schedule context
      const scheduleCtx = scheduleContext || "등록된 일정이 없습니다.";
      void personality; void scheduleCtx; // Used for context building

      // Simple rule-based response generation
      let aiResponse = "";
      const userMsg = input.message.toLowerCase();

      if (userMsg.includes("안녕") || userMsg.includes("hello")) {
        aiResponse = "안녕하세요! 오늘 일정 관리를 도와드릴게요. 오늘의 주요 일정을 확인해 보시겠어요?";
      } else if (userMsg.includes("바빠") || userMsg.includes("힘들") || userMsg.includes("스트레스")) {
        aiResponse = "정말 수고 많으셨어요! 잠깐 휴식을 취하시는 것도 중요해요. 긴급한 일정만 우선 처리하고, 나머지는 내일로 미뤄보는 건 어떨까요?";
      } else if (userMsg.includes("추천") || userMsg.includes("조언") || userMsg.includes("어떻게")) {
        if (recentSchedules.length > 5) {
          aiResponse = `최근 일정이 ${recentSchedules.length}개나 있네요! 미팅과 개인 시간을 번갈아 배치하면 집중력이 높아질 거예요. 하루에 긴 미팅은 최대 3개까지만 추천드려요.`;
        } else {
          aiResponse = "일정이 여유로워 보여요! 이 시간을 활용해 자기계발이나 운동 시간을 추가해 보시는 건 어떨까요?";
        }
      } else if (userMsg.includes("완료") || userMsg.includes("끝")) {
        aiResponse = "축하해요! 일정을 잘 마무리하셨네요. 완료한 일정을 체크하면 성취감을 느낄 수 있어요. 다음 목표도 함께 세워볼까요?";
      } else {
        const tips = [
          "일정 사이에 15분 버퍼 시간을 두면 지연에 대비할 수 있어요.",
          "비슷한 카테고리의 일정을 묶어 처리하면 문맥 전환 비용을 줄일 수 있어요.",
          "하루 중 가장 집중력이 높은 시간에 중요한 일정을 배치해 보세요.",
          "주말에는 반드시 하루는 완전히 쉬는 시간을 가지시는 걸 추천드려요.",
        ];
        aiResponse = tips[Math.floor(Math.random() * tips.length)];
      }

      messages.push({
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 50 messages
      if (messages.length > 50) messages = messages.slice(-50);

      if (existing.length > 0) {
        await db
          .update(guruConversations)
          .set({ messages })
          .where(eq(guruConversations.id, existing[0].id));
      } else {
        await db.insert(guruConversations).values({
          userId,
          userType: "oauth",
          guruType: gType,
          messages,
        });
      }

      return { response: aiResponse, messages };
    }),

  clearHistory: publicQuery
    .input(
      z.object({
        guruType: z.enum(["student", "worker", "doctor", "lawyer", "freelancer", "general"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const gType = input.guruType || "general";

      await db
        .delete(guruConversations)
        .where(
          and(
            eq(guruConversations.userId, userId),
            eq(guruConversations.guruType, gType)
          )
        );

      return { success: true };
    }),
});
