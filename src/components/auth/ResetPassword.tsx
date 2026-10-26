import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import SEO from '@/components/seo/SEO';
import { clearRecoverySession, hasRecoverySession } from '@/features/auth/recoverySession';
export default function ResetPassword() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const busy = useRef(false);
  const finished = useRef(false);
  const userId = useRef<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const verify = async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const query = new URLSearchParams(window.location.search);
        if (hash.has('error') || hash.has('error_code') || query.has('error') || query.has('error_code')) {
          clearRecoverySession();
          window.history.replaceState(window.history.state, '', '/auth/callback?flow=recovery');
          if (alive.current) setStatus('invalid');
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        // SDK initializes the URL session first, then emits PASSWORD_RECOVERY on a task.
        await new Promise<void>(resolve => { timer = setTimeout(resolve, 0); });
        if (!alive.current) return;
        if (error || !data.session || !hasRecoverySession(data.session.user.id)) { setStatus('invalid'); return; }
        const checked = await supabase.auth.getUser();
        if (!alive.current) return;
        if (checked.error || checked.data.user?.id !== data.session.user.id || !hasRecoverySession(data.session.user.id)) { setStatus('invalid'); return; }
        userId.current = checked.data.user.id; setStatus('ready');
      } catch { if (alive.current) setStatus('invalid'); }
    };
    void verify();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!finished.current && (event === 'SIGNED_OUT' || (session && userId.current && session.user.id !== userId.current))) {
        userId.current = null; if (alive.current) setStatus('invalid');
      }
    });
    return () => { alive.current = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || status !== 'ready') return;
    if (password.length < 8) { setError('新密碼至少需要8個字元。'); return; }
    if (password !== confirm) { setError('兩次輸入的密碼不一致。'); return; }
    busy.current = true; setPending(true); setError('');
    try {
      const targetUser = userId.current;
      const checked = await supabase.auth.getUser();
      if (checked.error || !userId.current || checked.data.user?.id !== userId.current || !hasRecoverySession(userId.current)) {
        if (alive.current) setStatus('invalid'); return;
      }
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      if (!alive.current || userId.current !== targetUser) return;
      finished.current = true;
      clearRecoverySession();
      if (alive.current) { setPassword(''); setConfirm(''); setStatus('done'); }
      // Password is already saved even if local sign-out fails. Do not invite resubmission.
      try {
        const signedOut = await supabase.auth.signOut({ scope: 'local' });
        if (signedOut.error && alive.current) setLogoutFailed(true);
      } catch { if (alive.current) setLogoutFailed(true); }
    } catch { if (alive.current) setError('未能更新密碼，請重試；如連結已過期，請重新申請。'); }
    finally { busy.current = false; if (alive.current) setPending(false); }
  };
  return <><SEO title="重設密碼" noIndex /><main className="min-h-screen bg-[#F8F3E8] px-4 py-12 text-[#5A4030]">
    <section className="max-w-md mx-auto bg-white rounded-xl border border-[#DDD0B0] p-6">
      <h1 className="text-2xl font-bold text-[#3A2010] mb-4">重設密碼</h1>
      {status === 'loading' && <p role="status">正在驗證重設連結…</p>}
      {status === 'invalid' && <p role="alert">連結無效、已使用或已過期，請重新申請重設密碼。</p>}
      {status === 'done' && <p role="status">密碼已更新，請返回登入頁使用新密碼登入。</p>}
      {status === 'done' && logoutFailed && <p role="alert" className="mt-3">密碼已儲存，但未能登出此瀏覽器。請恢復連線後在帳戶頁登出，再用新密碼登入。</p>}
      {status === 'ready' && <form onSubmit={submit} className="space-y-4">
        <p className="break-all">正在為已驗證的帳戶重設密碼。</p>
        <label className="block">新密碼<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} disabled={pending} onChange={e => setPassword(e.target.value)} className="block w-full border rounded-lg p-3 mt-2" /></label>
        <label className="block">再次輸入新密碼<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} disabled={pending} onChange={e => setConfirm(e.target.value)} className="block w-full border rounded-lg p-3 mt-2" /></label>
        <button disabled={pending} className="min-h-11 w-full rounded-xl bg-[#9B6035] p-3 disabled:opacity-50" style={{ color: '#FFFFFF' }}>{pending ? '更新中…' : '更新密碼'}</button>
      </form>}
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      <nav className="mt-6 flex flex-wrap gap-4"><Link href="/login" className="underline">返回登入</Link><Link href="/account-help" className="underline">重新申請連結</Link></nav>
    </section></main></>;
}
