import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

// Helper: detect date patterns in text
function detectDate(str: string): string | null {
  const patterns = [
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/, // DD-MM-YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // MM/DD/YY
  ];
  for (const p of patterns) {
    const m = str.match(p);
    if (m) {
      // Return ISO format
      if (m[0].length > 6 && m[1].length === 4) {
        return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      }
      return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    }
  }
  return null;
}

function detectTime(str: string): string | null {
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
  ];
  for (const p of patterns) {
    const m = str.match(p);
    if (m) {
      let h = parseInt(m[1]);
      const min = m[2];
      const ampm = m[3]?.toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return `${h.toString().padStart(2, "0")}:${min}`;
    }
  }
  return null;
}

function heuristicallyParseSchedule(line: string): {
  title: string;
  date: string;
  time: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) return null;

  const date = detectDate(trimmed);
  const time = detectTime(trimmed);

  // Remove date and time from line to get title
  let title = trimmed;
  if (date) title = title.replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/, "");
  if (date && title.includes(date)) title = title.replace(date, "");
  if (time) {
    title = title.replace(/\d{1,2}:\d{2}\s*(AM|PM)?/i, "");
  }
  title = title.replace(/[-:,*|]+$/, "").trim();

  if (!title) return null;

  return {
    title,
    date: date || new Date().toISOString().split("T")[0],
    time: time || "09:00",
  };
}

export const importRouter = createRouter({
  parseMarkdown: publicQuery
    .input(
      z.object({
        content: z.string(),
        defaultDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const lines = input.content.split("\n");
      const parsed: Array<{
        title: string;
        startTime: string;
        endTime: string;
        description?: string;
      }> = [];
      const failed: string[] = [];

      for (const line of lines) {
        const result = heuristicallyParseSchedule(line);
        if (result) {
          const dateStr = result.date || input.defaultDate || new Date().toISOString().split("T")[0];
          const startHour = parseInt(result.time.split(":")[0]);
          const endHour = Math.min(startHour + 1, 23);

          parsed.push({
            title: result.title,
            startTime: `${dateStr}T${result.time}:00`,
            endTime: `${dateStr}T${endHour.toString().padStart(2, "0")}:${result.time.split(":")[1]}:00`,
          });
        } else if (line.trim() && line.trim().length > 3) {
          // Try to extract something meaningful
          const cleanLine = line.replace(/^[-*\s]+/, "").trim();
          if (cleanLine.length > 3) {
            failed.push(cleanLine);
          }
        }
      }

      // Also try to parse failed lines as plain titles with today's date
      for (const f of failed) {
        const today = input.defaultDate || new Date().toISOString().split("T")[0];
        parsed.push({
          title: f,
          startTime: `${today}T09:00:00`,
          endTime: `${today}T10:00:00`,
        });
      }

      return {
        schedules: parsed,
        stats: { total: lines.length, valid: parsed.length, invalid: lines.length - parsed.length },
      };
    }),

  parseText: publicQuery
    .input(
      z.object({
        content: z.string(),
        defaultDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Same as markdown parsing for plain text
      const lines = input.content.split("\n");
      const parsed: Array<{
        title: string;
        startTime: string;
        endTime: string;
      }> = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 3) continue;

        const result = heuristicallyParseSchedule(trimmed);
        if (result) {
          const dateStr = result.date || input.defaultDate || new Date().toISOString().split("T")[0];
          const startHour = parseInt(result.time.split(":")[0]);
          const endHour = Math.min(startHour + 1, 23);

          parsed.push({
            title: result.title,
            startTime: `${dateStr}T${result.time}:00`,
            endTime: `${dateStr}T${endHour.toString().padStart(2, "0")}:${result.time.split(":")[1]}:00`,
          });
        } else {
          const today = input.defaultDate || new Date().toISOString().split("T")[0];
          parsed.push({
            title: trimmed.replace(/^[-*\d.\s]+/, ""),
            startTime: `${today}T09:00:00`,
            endTime: `${today}T10:00:00`,
          });
        }
      }

      return {
        schedules: parsed,
        stats: { total: lines.length, valid: parsed.length, invalid: Math.max(0, lines.length - parsed.length) },
      };
    }),

  parseExcel: publicQuery
    .input(
      z.object({
        data: z.array(z.record(z.string(), z.any())),
        defaultDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const parsed: Array<{
        title: string;
        startTime: string;
        endTime: string;
        description?: string;
      }> = [];

      for (const row of input.data) {
        // Try to find title, date, time columns heuristically
        const values = Object.values(row);
        const title = values.find((v) => typeof v === "string" && v.length > 2 && v.length < 100) as string;
        const allText = values.map((v) => String(v)).join(" ");

        if (!title) continue;

        const date = detectDate(allText);
        const time = detectTime(allText);

        const dateStr = date || input.defaultDate || new Date().toISOString().split("T")[0];
        const timeStr = time || "09:00";
        const startHour = parseInt(timeStr.split(":")[0]);
        const endHour = Math.min(startHour + 1, 23);

        parsed.push({
          title,
          startTime: `${dateStr}T${timeStr}:00`,
          endTime: `${dateStr}T${endHour.toString().padStart(2, "0")}:${timeStr.split(":")[1]}:00`,
          description: values.filter((v) => v !== title).join(" "),
        });
      }

      return {
        schedules: parsed,
        stats: { total: input.data.length, valid: parsed.length, invalid: input.data.length - parsed.length },
      };
    }),
});
