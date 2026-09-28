import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "허용되지 않은 요청입니다." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "로그인이 필요합니다." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "서버 설정을 확인해주세요." }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "로그인 정보가 유효하지 않습니다." }, 401);

    const { targetUserId, newPassword } = await request.json();
    if (typeof targetUserId !== "string" || typeof newPassword !== "string") {
      return json({ error: "요청값이 올바르지 않습니다." }, 400);
    }
    if (new TextEncoder().encode(newPassword).length < 8 || newPassword.length > 72) {
      return json({ error: "임시 비밀번호는 8~72자로 입력해주세요." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [{ data: actor, error: actorError }, { data: target, error: targetError }] = await Promise.all([
      admin.from("profiles").select("id, branch_id, employee_level, is_super_admin, is_developer, status").eq("id", user.id).single(),
      admin.from("profiles").select("id, branch_id, employee_level, is_super_admin, is_developer, status").eq("id", targetUserId).single(),
    ]);
    if (actorError || targetError || !actor || !target) return json({ error: "직원 정보를 찾을 수 없습니다." }, 404);
    if (actor.status !== "active" || !["active", "suspended"].includes(target.status)) {
      return json({ error: "현재 계정 상태에서는 변경할 수 없습니다." }, 403);
    }
    if (actor.id === target.id || target.is_developer) return json({ error: "해당 계정은 변경할 수 없습니다." }, 403);

    const developerAllowed = actor.is_developer === true;
    const superAllowed = actor.is_super_admin === true && !target.is_super_admin;
    const branchManagerAllowed = actor.employee_level === "branch_manager"
      && actor.branch_id === target.branch_id
      && !target.is_super_admin
      && target.employee_level !== "branch_manager";
    if (!developerAllowed && !superAllowed && !branchManagerAllowed) {
      return json({ error: "비밀번호 재설정 권한이 없습니다." }, 403);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(target.id, { password: newPassword });
    if (updateError) return json({ error: "비밀번호를 변경하지 못했습니다." }, 400);

    await admin.from("admin_audit_logs").insert({
      actor_user_id: actor.id,
      target_user_id: target.id,
      branch_id: target.branch_id,
      action: "reset_employee_password",
      after_data: { reset_at: new Date().toISOString() },
    });

    return json({ success: true });
  } catch {
    return json({ error: "비밀번호 재설정 중 오류가 발생했습니다." }, 500);
  }
});
