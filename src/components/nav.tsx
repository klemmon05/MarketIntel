import Link from "next/link";

const links = ["dashboard", "sponsors", "companies", "signals", "triggers", "import", "report"];

export function Nav() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <p className="font-semibold">PE Triggers</p>
        {links.map((link) => (
          <Link key={link} href={`/${link}`} className="text-sm capitalize text-slate-600 hover:text-slate-900">
            {link}
          </Link>
        ))}
      </div>
    </nav>
  );
}
