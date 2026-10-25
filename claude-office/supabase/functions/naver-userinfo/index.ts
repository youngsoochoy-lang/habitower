// Naver sign-in for Supabase: Naver's profile API answers { resultcode, message, response: { id, email, ... } },
// with the user nested under "response". Supabase's custom OAuth2 provider reads the user from the top level,
// so this tiny Edge Function sits in between as the provider's "UserInfo URL": it passes the access token
// through to Naver and hands back the fields flat. It stores nothing and needs no secrets.
// Deploy: Dashboard → Edge Functions → Deploy a new function → name "naver-userinfo", paste this,
// and turn OFF "Verify JWT" (the caller is Supabase Auth with a Naver token, not a signed-in user).
Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+/.test(auth)) return Response.json({ error: 'missing token' }, { status: 401 });
  const r = await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: auth } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.resultcode !== '00' || !j.response?.id) return Response.json({ error: 'naver', detail: j.message ?? r.status }, { status: 401 });
  const u = j.response;
  return Response.json({
    sub: u.id, id: u.id,
    email: u.email ?? null, email_verified: !!u.email,     // Naver checks the email it returns
    name: u.name ?? u.nickname ?? null, nickname: u.nickname ?? null,
    picture: u.profile_image ?? null,
  });
});
