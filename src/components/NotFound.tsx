import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8F3E8" }}>
      <div className="text-center">
        <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#9B6035", marginBottom: "1rem" }}>
          404
        </h1>
        <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "#C0A080", marginBottom: "2rem" }}>
          搵唔到呢個頁面
        </p>
        <Link
          to="/"
          className="inline-block text-white px-8 py-3 rounded-lg"
          style={{ backgroundColor: "#9B6035", fontWeight: 700 }}
        >
          返回首頁
        </Link>
      </div>
    </div>
  );
}
