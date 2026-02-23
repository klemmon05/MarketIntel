"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function signIn(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}
