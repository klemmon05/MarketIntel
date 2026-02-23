import { signIn, signUp } from "@/actions/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto mt-16 max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-xl font-semibold">Sign in to PE Triggers</h1>
      <form className="space-y-3">
        <input className="input" name="email" type="email" placeholder="Email" required />
        <input className="input" name="password" type="password" placeholder="Password" required />
        <button className="btn w-full" formAction={signIn}>Sign In</button>
        <button className="w-full text-sm text-slate-600 underline" formAction={signUp}>Create Account</button>
      </form>
    </main>
  );
}
