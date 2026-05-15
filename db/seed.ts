import { getDb } from "../api/queries/connection";
import { categories, appSettings } from "./schema";

const db = getDb();

async function seed() {
  console.log("Seeding default categories...");

  const defaultCategories = [
    { name: "work", label: "일/직장", icon: "briefcase", color: "#e8a95e", isSystem: true },
    { name: "study", label: "학업", icon: "book-open", color: "#7d8a74", isSystem: true },
    { name: "friends", label: "친구", icon: "users", color: "#bc6c25", isSystem: true },
    { name: "meeting", label: "미팅", icon: "calendar-days", color: "#3a4f41", isSystem: true },
    { name: "exercise", label: "운동", icon: "dumbbell", color: "#2f3e35", isSystem: true },
    { name: "personal", label: "개인", icon: "user", color: "#7d8a74", isSystem: true },
    { name: "family", label: "가족", icon: "heart", color: "#e8a95e", isSystem: true },
    { name: "health", label: "건강", icon: "stethoscope", color: "#2f3e35", isSystem: true },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onDuplicateKeyUpdate({
      set: { label: cat.label, icon: cat.icon, color: cat.color },
    });
  }

  console.log("Seeding app settings...");
  await db.insert(appSettings).values({}).onDuplicateKeyUpdate({
    set: { authEnabled: true },
  });

  console.log("Seed complete!");
}

seed().catch(console.error);
