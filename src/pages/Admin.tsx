import { useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { UserPlus, Trash2, Users, Mail, ArrowLeft, Shield } from "lucide-react";

export default function Admin() {
  const { colors } = useThemeStore();
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");

  const utils = trpc.useUtils();
  const { data: authMe } = trpc.auth.me.useQuery();
  const { data: inviteList } = trpc.invite.list.useQuery(undefined, {
    enabled: authMe?.role === "admin",
  });
  const { data: userList } = trpc.invite.users.useQuery(undefined, {
    enabled: authMe?.role === "admin",
  });

  const createInvite = trpc.invite.create.useMutation({
    onSuccess: () => { utils.invite.list.invalidate(); setNewEmail(""); setError(""); },
    onError: (e) => setError(e.message),
  });
  const deleteInvite = trpc.invite.delete.useMutation({
    onSuccess: () => utils.invite.list.invalidate(),
  });

  if (!authMe) {
    return (
      <div className="h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.background }}>
        <p style={{ color: colors.textMuted }}>로딩 중...</p>
      </div>
    );
  }

  if (authMe.role !== "admin") {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: colors.background }}>
        <Shield size={40} style={{ color: colors.textMuted }} />
        <p style={{ color: colors.textMuted }}>관리자만 접근 가능합니다.</p>
        <Button onClick={() => navigate("/")} style={{ backgroundColor: colors.primary, color: "#fff" }}>
          홈으로
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.background, color: colors.text }}>
      <div className="max-w-2xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft size={18} style={{ color: colors.textMuted }} />
          </Button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            관리자 패널
          </h1>
        </div>

        {/* 초대 추가 */}
        <div className="rounded-xl border p-4 mb-6"
          style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <UserPlus size={15} style={{ color: colors.primary }} />
            새 사용자 초대
          </h2>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="초대할 Gmail 주소"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createInvite.mutate({ email: newEmail })}
              className="flex-1 h-9 text-sm"
              style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
            />
            <Button
              className="h-9 text-sm"
              onClick={() => createInvite.mutate({ email: newEmail })}
              disabled={!newEmail.trim() || createInvite.isPending}
              style={{ backgroundColor: colors.primary, color: "#fff" }}
            >
              초대
            </Button>
          </div>
          {error && <p className="text-xs mt-2 text-red-500">{error}</p>}
        </div>

        {/* 초대 목록 */}
        <div className="rounded-xl border p-4 mb-6"
          style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Mail size={15} style={{ color: colors.primary }} />
            초대 목록 ({inviteList?.length ?? 0}명)
          </h2>
          <div className="space-y-2">
            {inviteList?.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: colors.background }}>
                <div>
                  <p className="text-sm">{inv.email}</p>
                  <p className="text-[10px]" style={{ color: colors.textMuted }}>
                    {inv.status === "accepted" ? "✅ 가입 완료" : "⏳ 대기 중"}
                    {" · "}
                    {new Date(inv.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => deleteInvite.mutate({ id: inv.id })}>
                  <Trash2 size={13} style={{ color: "#ef4444" }} />
                </Button>
              </div>
            ))}
            {inviteList?.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: colors.textMuted }}>초대 내역이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 가입된 사용자 목록 */}
        <div className="rounded-xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users size={15} style={{ color: colors.primary }} />
            가입된 사용자 ({userList?.length ?? 0}명)
          </h2>
          <div className="space-y-2">
            {userList?.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ backgroundColor: colors.background }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: colors.primary, color: "#fff" }}>
                  {(u.name || u.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.name || "이름 없음"}</p>
                  <p className="text-[10px]" style={{ color: colors.textMuted }}>
                    {u.email} · {u.role === "admin" ? "👑 관리자" : "사용자"}
                  </p>
                </div>
                <p className="text-[10px]" style={{ color: colors.textMuted }}>
                  {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString("ko-KR") : "-"}
                </p>
              </div>
            ))}
            {userList?.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: colors.textMuted }}>가입된 사용자가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
