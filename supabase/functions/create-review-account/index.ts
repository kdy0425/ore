import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const employeeLevels = new Set(["branch_manager", "manager", "captain", "trainer", "part_timer"]);

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
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "서버 설정을 확인해주세요." }, 500);

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: "로그인 정보가 유효하지 않습니다." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: actor, error: actorError } = await admin
      .from("profiles")
      .select("id, is_developer, status")
      .eq("id", user.id)
      .single();
    if (actorError || !actor || actor.status !== "active" || actor.is_developer !== true) {
      return json({ error: "개발자 계정만 심사용 계정을 만들 수 있습니다." }, 403);
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const branchId = typeof body.branchId === "string" ? body.branchId : "";
    const employeeLevel = typeof body.employeeLevel === "string" ? body.employeeLevel : "";

    if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 1 || name.length > 50) {
      return json({ error: "이메일 또는 이름이 올바르지 않습니다." }, 400);
    }
    if (new TextEncoder().encode(password).length < 8 || password.length > 72) {
      return json({ error: "비밀번호는 8~72자로 입력해주세요." }, 400);
    }
    if (!/^\+?[0-9 -]{8,20}$/.test(phoneNumber) || !employeeLevels.has(employeeLevel)) {
      return json({ error: "휴대폰 번호 또는 직원 레벨이 올바르지 않습니다." }, 400);
    }

    const { data: branch, error: branchError } = await admin
      .from("branches")
      .select("id, is_active")
      .eq("id", branchId)
      .single();
    if (branchError || !branch?.is_active) return json({ error: "활성 지점을 찾을 수 없습니다." }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone_number: phoneNumber, requested_branch_id: branchId },
      app_metadata: { account_type: "store_review" },
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "심사용 계정을 만들지 못했습니다." }, 400);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        status: "active",
        branch_id: branchId,
        employee_level: employeeLevel,
        is_super_admin: false,
        is_developer: false,
        approved_by: actor.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", created.user.id);

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "직원 프로필을 활성화하지 못했습니다." }, 500);
    }

    await admin.from("admin_audit_logs").insert({
      actor_user_id: actor.id,
      target_user_id: created.user.id,
      branch_id: branchId,
      action: "create_review_account",
      after_data: { email, employee_level: employeeLevel, created_at: new Date().toISOString() },
    });

    return json({ success: true, userId: created.user.id, email });
  } catch {
    return json({ error: "심사용 계정 생성 중 오류가 발생했습니다." }, 500);
  }
});
