"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tenantDelAdmin } from "@/lib/tenant/admin";

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent("Email o contraseña incorrectos")}`);
  }

  // La cuenta tiene que ser de este sitio (o del master).
  const autorizado = await tenantDelAdmin().then(
    () => true,
    () => false,
  );
  if (!autorizado) {
    await supabase.auth.signOut();
    redirect(`/admin/login?error=${encodeURIComponent("Email o contraseña incorrectos")}`);
  }
  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
