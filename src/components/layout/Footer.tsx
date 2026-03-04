import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="py-12" style={{ backgroundColor: '#2A1A08', color: '#F8F3E8' }}>
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🍜</span>
              <span className="text-xl font-bold">今晚食乜</span>
            </div>
            <p className="text-sm opacity-80">每日晚餐話你知，一click生成一週餐單</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">快速連結</h4>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link href="/" className="hover:opacity-100">首頁</Link>
              <Link href="/generate" className="hover:opacity-100">生成餐單</Link>
              <Link href="/recipes" className="hover:opacity-100">食譜</Link>
              <Link href="/about" className="hover:opacity-100">關於</Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">帳戶</h4>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link href="/login" className="hover:opacity-100">登入</Link>
              <Link href="/profile" className="hover:opacity-100">個人資料</Link>
              <Link href="/favorites" className="hover:opacity-100">收藏</Link>
              <Link href="/my-menus" className="hover:opacity-100">我既餐單</Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">聯絡我們</h4>
            <p className="text-sm opacity-80">hello@今晚食乜.com</p>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 text-center text-sm opacity-60">
          © 2026 今晚食乜 Made with ❤️
        </div>
      </div>
    </footer>
  );
}
