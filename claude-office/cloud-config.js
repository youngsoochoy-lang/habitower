// Habitower online: your Supabase project. Fill these in once (ONLINE.md, step 1) and commit.
// Both values are public by design: the anon key only lets a visitor sign in; row-level security in
// supabase/schema.sql decides that each signed-in user reads and writes only their own rows.
export default {
  url: '',          // https://<project-ref>.supabase.co   (Project Settings → API → Project URL)
  anonKey: '',      // the "anon public" / publishable key  (Project Settings → API)
  // sign-in buttons, in this order. Keep only the ones you have switched on in Supabase → Authentication → Providers.
  providers: ['google', 'kakao', 'naver', 'facebook', 'email'],
  naverProvider: 'custom:naver',   // the identifier you gave Naver as a custom OAuth provider
};
