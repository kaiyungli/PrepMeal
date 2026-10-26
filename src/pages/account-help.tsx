import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import supabase from '@/lib/supabase';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { accountHelpError, EMAIL_COOLDOWN_MS, EMAIL_REQUEST_MESSAGE, emailCallbackUrl } from '@/features/auth/accountHelp';
const button = 'min-h-11 w-full rounded-xl bg-[#9B6035] px-4 py-3 font-semibold disabled:opacity-50';
export default function AccountHelp() {
  const router = useRouter();
  const resend = router.query.mode === 'resend';
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const until = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    try { until.current = Math.min(Number(sessionStorage.getItem('prepmeal:email-cooldown')) || 0, Date.now() + EMAIL_COOLDOWN_MS); } catch { /* optional */ }
    const tick = () => setRemaining(Math.max(0, Math.ceil((until.current - Date.now()) / 1000)));
    tick(); const timer = setInterval(tick, 1000);
    return () => { alive.current = false; clearInterval(timer); };
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || Date.now() < until.current) return;
    busy.current = true; setPending(true); setMessage(''); setError('');
    // Apply cooldown to failures too; the server remains responsible for rate limits.
    until.current = Date.now() + EMAIL_COOLDOWN_MS;
    setRemaining(60);
    try { sessionStorage.setItem('prepmeal:email-cooldown', String(until.current)); } catch { /* page guard remains */ }
    try {
      const result = resend
        ? await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: emailCallbackUrl(window.location.origin, 'signup') } })
        : await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: emailCallbackUrl(window.location.origin, 'recovery') });
      if (result.error) throw result.error;
      if (alive.current) setMessage(EMAIL_REQUEST_MESSAGE);
    } catch (reason) { if (alive.current) setError(accountHelpError(reason)); }
    finally { busy.current = false; if (alive.current) setPending(false); }
  };
  return <Layout><SEO title={resend ? '重發驗證郵件' : '忘記密碼'} noIndex />
    <main className="max-w-md mx-auto px-4 py-12 text-[#5A4030]">
      <h1 className="text-2xl font-bold text-[#3A2010] mb-4">{resend ? '重發驗證郵件' : '忘記密碼'}</h1>
      <p className="mb-6">{resend ? '適用於以Email註冊、尚未完成驗證的帳戶。' : '輸入註冊時使用的Email，我們會嘗試寄出重設密碼連結。'}</p>
      <p className="text-sm mb-6">如果一直使用Google、Apple或Facebook登入，請先使用原本方式登入。</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={pending} className="block w-full border border-[#DDD0B0] rounded-lg p-3 mt-2 bg-white" /></label>
        <button type="submit" style={{ color: '#FFFFFF' }} className={button} disabled={!router.isReady || pending || remaining > 0}>{pending ? '提交中…' : remaining > 0 ? `${remaining}秒後可再申請` : resend ? '重發驗證郵件' : '寄出重設連結'}</button>
      </form>
      {message && <p role="status" className="mt-4">{message}</p>}
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-4"><Link href="/login" className="underline">返回登入</Link><Link href={resend ? '/account-help' : '/account-help?mode=resend'} className="underline">{resend ? '忘記密碼' : '收不到驗證郵件？'}</Link><Link href="/contact" className="underline">聯絡我們</Link></div>
    </main></Layout>;
}
