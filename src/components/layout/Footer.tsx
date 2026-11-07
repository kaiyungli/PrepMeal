import Link from 'next/link';
import { LogoMark } from '@/components/ui/Icons';
import PrivacyOptionsButton from '@/components/ads/PrivacyOptionsButton';

const HOME_GUIDES = [
  ['/30-minute-dinner-recipes', '30分鐘快手菜'], ['/50-classic-hk-recipes', '家常菜靈感'],
  ['/7-day-dinner-plan', '一週晚餐示例'], ['/hong-kong-market-shopping-guide', '買餸攻略'],
  ['/healthy-dinner-guide', '健康晚餐'], ['/ingredient-pairing-guide', '按材料揀菜'],
];

export default function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) return (
    <footer className="pm-home-footer">
      <div className="pm-wrap pm-footer-inner">
        <Link href="/" className="pm-logo">今晚食乜 <span className="pm-footer-tagline">日日好好食飯。</span></Link>
        <div className="pm-footer-links"><Link href="/about">關於我們</Link><Link href="/contact">聯絡我們</Link><Link href="/privacy">私隱政策</Link><PrivacyOptionsButton /><Link href="/terms">使用條款</Link></div>
        <span>© {new Date().getFullYear()} 今晚食乜</span>
        <nav className="pm-footer-guides" aria-label="晚餐指南">{HOME_GUIDES.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
      </div>
    </footer>
  );
  return (
    <footer className="bg-footer py-12 text-bg">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <LogoMark size={32} />
              <span className="text-xl font-bold">今晚食乜</span>
            </div>
            <p className="text-sm opacity-80">每日晚餐話你知，一按生成一週餐單</p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">快速連結</h4>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link href="/" className="hover:opacity-100">首頁</Link>
              <Link href="/generate" className="hover:opacity-100">生成餐單</Link>
              <Link href="/recipes" className="hover:opacity-100">食譜</Link>
              <Link href="/30-minute-dinner-recipes">30分鐘快手菜</Link>
              <Link href="/50-classic-hk-recipes">家常菜靈感</Link>
              <Link href="/7-day-dinner-plan">一週晚餐示例</Link>
              <Link href="/hong-kong-market-shopping-guide">買餸攻略</Link>
              <Link href="/healthy-dinner-guide">健康晚餐</Link>
              <Link href="/ingredient-pairing-guide">按材料揀菜</Link>
              <Link href="/contact">聯絡我們</Link>
              <Link href="/about" className="hover:opacity-100">關於</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">帳戶</h4>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link href="/login" className="hover:opacity-100">登入</Link>
              <Link href="/profile" className="hover:opacity-100">個人資料</Link>
              <Link href="/favorites" className="hover:opacity-100">收藏</Link>
              <Link href="/my-plans" className="hover:opacity-100">我的餐單</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">聯絡我們</h4>
            <div className="flex flex-col gap-2">
              <a href="mailto:eatwhathk247@gmail.com" className="text-sm hover:opacity-100 underline">
                eatwhathk247@gmail.com
              </a>
              <a href="tel:+85294959673" className="text-sm hover:opacity-100 underline">
                +852 9495 9673
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E7E0D4] pt-8">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm opacity-60">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              <Link href="/privacy" className="hover:opacity-100">隱私政策</Link>
              <PrivacyOptionsButton className="hover:opacity-100" />
              <Link href="/faq" className="hover:opacity-100">常見問題</Link>
              <Link href="/terms" className="hover:opacity-100">服務條款</Link>
            </div>
            <div>
              © 2026 今晚食乜
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
