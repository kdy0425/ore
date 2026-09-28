insert into public.branches (name, sort_order)
values ('오레노라멘 본사', 0)
on conflict (name) do update
set is_active = true,
    sort_order = excluded.sort_order,
    updated_at = now();
