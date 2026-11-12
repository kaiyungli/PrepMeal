import Link from 'next/link';
import PrivacyOptionsButton from '@/components/ads/PrivacyOptionsButton';
import { PRIMARY_LINKS, TOOL_LINKS, GUIDE_LINKS, ACCOUNT_LINKS, TRUST_LINKS } from '@/features/layout/navigation';
import styles from './SiteChrome.module.css';

export default function Footer() {
  return <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <Link href="/" className={styles.footerBrand}>今晚食乜 <span>日日好好食飯。</span></Link>
      <nav className={styles.footerLinks} aria-label="網站資訊">{TRUST_LINKS.map(link => <Link key={link.path} href={link.path}>{link.label}</Link>)}<PrivacyOptionsButton /></nav>
      <span>© {new Date().getFullYear()} 今晚食乜</span>
      <nav className={styles.footerRow} aria-label="常用功能"><Link href="/">首頁</Link>{[...PRIMARY_LINKS.slice(0, 2), ...TOOL_LINKS, ...ACCOUNT_LINKS, { path: '/login', label: '登入' }].map(link => <Link key={link.path} href={link.path}>{link.label}</Link>)}</nav>
      <nav className={styles.footerRow} aria-label="晚餐指南">{GUIDE_LINKS.map(link => <Link key={link.path} href={link.path}>{link.label}</Link>)}</nav>
      <div className={styles.footerContact}><span>聯絡我們</span><a href="mailto:eatwhathk247@gmail.com">eatwhathk247@gmail.com</a><a href="tel:+85294959673">+852 9495 9673</a></div>
    </div>
  </footer>;
}
