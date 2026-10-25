# Habitower online

The same app, signed in, on any device: your quests, XP, edits and courses follow you, and the office shows every Claude Code session you connect, whether it runs on your PC or in the cloud.

```
 💻 PC: Claude Code ──hook──┐                         ┌── 📱 phone (installed app)
                            ├──▶  Supabase  ◀─────────┼── 💻 any browser
 ☁️ cloud session ──hook────┘   (your account)        └── 🖥️ PC, http://localhost:7777 still works offline
                                      ▲
            GitHub Pages serves the app itself (office.html + cloud.js), no server of ours
```

- **The app** is static files on GitHub Pages. With no `server.js` behind it, `cloud.js` answers the page's `/api/...` calls from your Supabase account instead.
- **Your saves** are JSON documents in the `docs` table (`quests`, `user`, `building`, `pack:<id>`). Row-level security means each signed-in person reads and writes only their own rows. Realtime pushes a change from one device to the others within a second or two.
- **The office** comes from `tools/tower-hook.js`, a Claude Code hook. After each prompt and tool call it sends the new short office events (a prompt's first 140 characters, "Read memo.md", the first line of a result) to the `ingest` function with a per-device key. It never sends whole files or full outputs.
- **Your PC server keeps working** exactly as before, offline, for sessions on that PC.

## 1. Supabase project (about 5 minutes)

1. Create a free project at [supabase.com](https://supabase.com). Choose a region close to you (Seoul or Stockholm).
2. In **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It is safe to run again later.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** (publishable) key into [`cloud-config.js`](cloud-config.js). Both values are public by design; the schema's row-level security is what protects the data.
4. In **Authentication → URL Configuration**:
   - **Site URL:** `https://youngsoochoy-lang.github.io/habitower/claude-office/office.html`
   - **Redirect URLs:** add that same address, plus `http://localhost:7777/**` if you want to try the online mode on your PC at `http://localhost:7777/?cloud`.

Free projects pause after a week with no activity. Opening the app counts as activity, and you can resume a paused project from the dashboard.

## 2. Sign-in methods

Every provider asks for the same **callback URL**: `https://<project-ref>.supabase.co/auth/v1/callback` (shown on each provider's page in Supabase). Switch a provider on in **Authentication → Providers**, then list it in `providers` in `cloud-config.js`. The buttons appear in that order, and only the ones listed.

| Provider | Where | Notes |
|---|---|---|
| **Email** (magic link) | On by default | Supabase's built-in mailer sends only a few emails an hour. Before going public, add your own SMTP (Authentication → Emails). |
| **Google** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create credentials → OAuth client ID → Web application → Authorized redirect URI = callback | Paste the client ID and secret into Supabase → Google. |
| **Kakao** | [Kakao Developers](https://developers.kakao.com) → My application → Kakao Login: on, Redirect URI = callback; Security → Client secret: create and enable | REST API key = client ID. Consent items: nickname, profile image. Email needs a business app; until then, allow sign-in without an email in Supabase → Kakao, if your project shows that option. |
| **Naver** | [Naver Developers](https://developers.naver.com/apps) → 애플리케이션 등록 → 네이버 로그인, 제공 정보: 이메일, 별명, 프로필 사진; Callback URL = callback | Naver isn't built into Supabase, so it is a **custom OAuth2 provider** (below). Until Naver reviews the app (검수 요청), only accounts you add as testers can sign in. |
| **Facebook** | [Meta for Developers](https://developers.facebook.com/apps) → Create app → Facebook Login → Valid OAuth redirect URI = callback | App ID and secret into Supabase. To let anyone sign in, the app must be switched to Live, which needs a privacy policy URL. |

### Naver as a custom provider

Naver's profile API wraps the user in `{ "response": { ... } }`. A tiny Edge Function, [`supabase/functions/naver-userinfo`](supabase/functions/naver-userinfo/index.ts), returns the same fields at the top level, which is where Supabase looks for them.

1. **Edge Functions → Deploy a new function** (via the editor), name it `naver-userinfo`, paste the file, deploy. In the function's settings, turn **Verify JWT** off: Supabase Auth calls it with a Naver token, not with a signed-in user.
2. **Authentication → Providers → Custom provider → OAuth2**:
   - **Identifier:** `naver` (Supabase calls it `custom:naver`, which matches `naverProvider` in `cloud-config.js`)
   - **Authorization URL:** `https://nid.naver.com/oauth2.0/authorize`
   - **Token URL:** `https://nid.naver.com/oauth2.0/token`
   - **UserInfo URL:** `https://<project-ref>.supabase.co/functions/v1/naver-userinfo`
   - **Client ID / Secret:** from the Naver app. Leave scopes empty; Naver uses the items you chose in its console.

If the dashboard's form differs from this (custom providers are new in Supabase), follow its labels. The four URLs above are what matter.

## 3. Publish on GitHub Pages

Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**. A minute later the app is at **https://youngsoochoy-lang.github.io/habitower/** (it forwards to `claude-office/office.html`). Every push to `main` updates it.

On a phone, open it and choose **Add to Home Screen**. It then opens full-screen like an app and keeps the 3D models cached for a fast start.

## 4. Bring your PC data over (once)

Sign in, then **☁️ 계정 → PC 데이터 가져오기** and pick, from `claude-office/data` on your PC:

- `quests.json`: progress, XP, coins, history
- `private/user.json`: your edits
- `private/personal.json`: your own course

Each file replaces the account's copy of the same kind. **내 데이터 모두 내려받기** downloads everything as one backup file whenever you want.

## 5. Connect Claude Code

In **☁️ 계정 → Claude 연결**, make one key per device or cloud environment ("집 PC", "클라우드"). The key is shown once. Delete a key there to disconnect that device.

**Your PC** (every session on it): in the `habitower` folder, run the command the app shows:

```
node claude-office/tools/tower-hook.js install --user --url … --key … --token htw_…
node claude-office/tools/tower-hook.js test      # a "연결 테스트" floor appears in the app
```

This writes the hook into `~/.claude/settings.json` (any hooks you already have stay) and the keys into `~/.claude/habitower.json`. Sessions started afterwards report in. `uninstall --user` removes it.

**Cloud sessions** (claude.ai/code): the hook has to live in the repository the session opens, and the keys in the cloud environment.

1. The `habitower` repository already carries it (`.claude/settings.json` and `.claude/hooks/habitower-hook.js`). For another repository: `node claude-office/tools/tower-hook.js install --repo ../other-repo`, then commit its `.claude/` folder. Without keys the hook does nothing, so it is harmless for anyone else who opens the repository.
2. In the cloud environment's settings (the environment menu in the session's title bar → Edit):
   - **Environment variables:** paste the three `HABITOWER_…` lines the app shows.
   - **Network access:** add `<project-ref>.supabase.co` to the allowed domains.
3. Start a new session. Its Claude appears on that project's floor in the app.

What the hook sends, and when: on each prompt, tool call, tool result and stop, it starts a background upload of the lines written since last time (it remembers its place in `~/.claude/habitower-hook/`) and returns at once, so Claude never waits for it. If a send fails, it tries again next time from the same place; errors go to `~/.claude/habitower-hook/log.txt`. History older than two weeks is deleted.

## Before you open it to everyone

- A **privacy policy** page (Facebook and Kakao require one), and the Naver and Facebook app reviews.
- **Your own SMTP** for magic links.
- Supabase's free tier allows 50,000 monthly active users and 500 MB of database. Upgrade before that, or when you want the project never to pause.
- Course packs in `data/packs/` are public on Pages. Personal packs belong in each person's account (imported in step 4), never in this repository.
