import { useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router";

function getGoogleOAuthUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/oauth/google/callback`;
  const state = btoa(redirectUri);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");

  return url.toString();
}

export default function Login() {
  const { colors } = useThemeStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("local_auth_token", data.token);
      window.location.href = "/";
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("local_auth_token", data.token);
      window.location.href = "/";
    },
    onError: (err) => setError(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginEmail || !loginPassword) {
      setError("이메일과 비밀번호를 입력하세요");
      return;
    }
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regEmail || !regPassword || regPassword.length < 6) {
      setError("이메일과 6자 이상의 비밀번호를 입력하세요");
      return;
    }
    registerMutation.mutate({ email: regEmail, password: regPassword, name: regName || undefined });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 shadow-xl"
        style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <Clock size={28} style={{ color: colors.primary }} />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "Cormorant Garamond, serif", color: colors.text }}
          >
            Kronos
          </h1>
          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
            당신의 시간을 예술로 만드세요
          </p>
        </div>

        {/* Google OAuth Login */}
        <button
          className="w-full h-10 mb-4 text-sm flex items-center justify-center gap-2 rounded-lg transition-shadow hover:shadow-md"
          onClick={() => window.location.href = getGoogleOAuthUrl()}
          style={{ backgroundColor: "#fff", color: "#3c4043", border: "1px solid #dadce0", fontWeight: 500, cursor: "pointer" }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></g></svg>
          Google 계정으로 로그인
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: colors.border }} />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-xs" style={{ backgroundColor: colors.cardBg, color: colors.textMuted }}>
              또는
            </span>
          </div>
        </div>

        {/* Local Auth Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full mb-4" style={{ backgroundColor: colors.background }}>
            <TabsTrigger value="login" className="text-xs">로그인</TabsTrigger>
            <TabsTrigger value="register" className="text-xs">회원가입</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label className="text-xs" style={{ color: colors.textMuted }}>이메일</Label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1 h-9 text-sm"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div>
                <Label className="text-xs" style={{ color: colors.textMuted }}>비밀번호</Label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="mt-1 h-9 text-sm"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-9 text-sm"
                disabled={loginMutation.isPending}
                variant="outline"
                style={{ borderColor: colors.border }}
              >
                {loginMutation.isPending ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <Label className="text-xs" style={{ color: colors.textMuted }}>이름 (선택)</Label>
                <Input
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="홍길동"
                  className="mt-1 h-9 text-sm"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div>
                <Label className="text-xs" style={{ color: colors.textMuted }}>이메일</Label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1 h-9 text-sm"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div>
                <Label className="text-xs" style={{ color: colors.textMuted }}>비밀번호 (6자 이상)</Label>
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="mt-1 h-9 text-sm"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-9 text-sm"
                disabled={registerMutation.isPending}
                variant="outline"
                style={{ borderColor: colors.border }}
              >
                <UserPlus size={14} className="mr-1" />
                {registerMutation.isPending ? "가입 중..." : "회원가입"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Error */}
        {error && (
          <div className="mt-3 px-3 py-2 rounded-lg text-xs text-center" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
            {error}
          </div>
        )}

        {/* Back */}
        <Button
          variant="ghost"
          className="w-full mt-4 text-xs"
          onClick={() => navigate("/")}
          style={{ color: colors.textMuted }}
        >
          <ArrowLeft size={12} className="mr-1" />
          로그인 없이 계속하기
        </Button>
      </div>
    </div>
  );
}
