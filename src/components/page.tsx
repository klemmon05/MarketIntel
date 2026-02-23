import { ReactNode } from "react";

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {children}
    </main>
  );
}
