import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { localUsers } from "@db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "kronos-local-auth-secret-key";

export async function verifyLocalToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; type: string };
    if (decoded.type !== "local") return null;

    const db = getDb();
    const users = await db
      .select({
        id: localUsers.id,
        name: localUsers.name,
        email: localUsers.email,
        role: localUsers.role,
        createdAt: localUsers.createdAt,
      })
      .from(localUsers)
      .where(eq(localUsers.id, decoded.userId))
      .limit(1);

    return users[0] ?? null;
  } catch {
    return null;
  }
}

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(localUsers)
        .where(eq(localUsers.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Email already registered");
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const result = await db.insert(localUsers).values({
        email: input.email,
        passwordHash,
        name: input.name || input.email.split("@")[0],
      });

      const insertId = Number(result.insertId);
      const token = jwt.sign(
        { userId: insertId, type: "local" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return { token, user: { id: insertId, email: input.email, name: input.name } };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const users = await db
        .select()
        .from(localUsers)
        .where(eq(localUsers.email, input.email))
        .limit(1);

      if (users.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = users[0];
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }

      const token = jwt.sign(
        { userId: user.id, type: "local" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return { token, user: { id: user.id, email: user.email, name: user.name } };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const req = ctx.req;
    const token = req.headers.get("x-local-auth-token");
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; type: string };
      if (decoded.type !== "local") return null;

      const db = getDb();
      const users = await db
        .select()
        .from(localUsers)
        .where(eq(localUsers.id, decoded.userId))
        .limit(1);

      if (users.length === 0) return null;
      const user = users[0];
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        type: "local" as const,
      };
    } catch {
      return null;
    }
  }),
});
