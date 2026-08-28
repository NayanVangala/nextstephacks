import { useAuth } from "./useAuth";

/**
 * 登入之鈕。無供給則全不見 —— 壞鈕劣於無鈕。
 *
 * Signing in is OPTIONAL and always will be. Anonymous reporting is the default
 * path and stays the default path: an accessibility tool that demands an account
 * before you can say "this curb cut is broken" has failed the person standing at
 * the broken curb cut. What an account buys is attribution, so a report can be
 * confirmed by someone other than its author.
 */

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="currentColor" className="size-4">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function SignIn({ 暗 = false }: { 暗?: boolean }) {
  const { 狀, 誤, 登入, 登出 } = useAuth();

  // 不可登入者,不示其鈕。無服而示之,則人點之而無所往。
  if (狀.態 === "不可") return null;
  if (狀.態 === "未定") return null;

  const 邊 = 暗
    ? "border-white/25 hover:border-white/60 text-white"
    : "border-line hover:border-ink text-ink";

  if (狀.態 === "已登入") {
    const u = 狀.session.user;
    const 名 =
      (u.user_metadata?.user_name as string) ??
      (u.user_metadata?.full_name as string) ??
      u.email ??
      "signed in";
    return (
      <div className="flex items-center gap-3">
        <span className={`text-xs ${暗 ? "text-white/70" : "text-muted-foreground"}`}>
          {名}
        </span>
        <button
          type="button"
          onClick={登出}
          className={`min-h-11 rounded-full border px-4 text-xs font-semibold uppercase transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${邊}`}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => 登入("google")}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] ${邊}`}
        >
          <GoogleMark />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => 登入("github")}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] ${邊}`}
        >
          <GitHubMark />
          Continue with GitHub
        </button>
      </div>
      {誤 && (
        <p role="alert" className={`text-xs ${暗 ? "text-white/70" : "text-fullsun"}`}>
          Sign-in failed: {誤}
        </p>
      )}
    </div>
  );
}
