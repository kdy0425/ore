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

    const { data: authoredNotices, error: noticeError } = await admin
      .from("notices")
      .select("notice_images(storage_path)")
      .eq("author_user_id", user.id);
    if (noticeError) return json({ error: "계정 데이터를 확인하지 못했습니다." }, 500);

    const imagePaths = (authoredNotices ?? []).flatMap((notice) =>
      (notice.notice_images ?? []).map((image: { storage_path: string }) => image.storage_path)
    );
    if (imagePaths.length) {
      const { error: storageError } = await admin.storage.from("notice-images").remove(imagePaths);
      if (storageError) return json({ error: "공지 이미지 삭제에 실패했습니다." }, 500);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) return json({ error: "계정을 삭제하지 못했습니다." }, 500);

    return json({ success: true });
  } catch {
    return json({ error: "계정 삭제 중 오류가 발생했습니다." }, 500);
  }
});
