-- Read-only schema check for the Max app. Run in the Supabase SQL editor.
-- Every section returns rows only when something is missing or wrong.
-- An empty result for a section means that section passes.
-- Nothing here changes data.

-- 1. Tables the code reads or writes that do not exist in public.
with expected(table_name) as (
  values
    ('profiles'), ('events'), ('conversation_members'), ('messages'),
    ('friendships'), ('event_ideas'), ('notifications'), ('conversations'),
    ('posts'), ('trip_members'), ('rsvps'), ('push_subscriptions'), ('trips'),
    ('rides'), ('list_items'), ('ride_passengers'), ('post_likes'),
    ('post_comments'), ('notification_preferences'), ('hangs'), ('date_options'),
    ('pinned_messages'), ('lists'), ('expenses'), ('event_items'), ('date_votes'),
    ('conversation_nicknames'), ('idea_votes'), ('hang_responses'),
    ('event_arrivals'), ('trip_packing_items'), ('expense_participants'),
    ('event_messages'), ('availability'), ('trip_links'),
    ('trip_itinerary_items'), ('settlements'), ('post_images'),
    ('message_reactions'), ('message_hidden'), ('list_item_votes'),
    ('best_photo_votes')
)
select 'missing table' as problem, e.table_name as detail
from expected e
where not exists (
  select 1 from information_schema.tables t
  where t.table_schema = 'public' and t.table_name = e.table_name
);

-- 2. Columns the code relies on for the core flows. Extend as needed.
with expected(table_name, column_name) as (
  values
    ('notification_preferences', 'user_id'),
    ('notification_preferences', 'push_enabled'),
    ('notification_preferences', 'push_reminders'),
    ('notification_preferences', 'push_new_events'),
    ('notification_preferences', 'push_friends'),
    ('notification_preferences', 'push_chat'),
    ('notification_preferences', 'push_hangs'),
    ('notification_preferences', 'push_social'),
    ('notification_preferences', 'push_posts'),
    ('notification_preferences', 'push_birthdays'),
    ('notification_preferences', 'push_recaps'),
    ('notifications', 'push_done_at'),
    ('notifications', 'attempts'),
    ('notifications', 'read_at'),
    ('notifications', 'data'),
    ('messages', 'image_path'),
    ('messages', 'edited_at'),
    ('messages', 'deleted_at'),
    ('conversation_members', 'cleared_at'),
    ('event_ideas', 'status'),
    ('event_ideas', 'event_id'),
    ('profiles', 'onboarded_at')
)
select 'missing column' as problem, e.table_name || '.' || e.column_name as detail
from expected e
where not exists (
  select 1 from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = e.table_name
    and c.column_name = e.column_name
);

-- 3. Functions (RPCs) the code calls. The app currently calls none via .rpc();
-- add any future RPC names here.
with expected(function_name) as (
  values ('__none__')
)
select 'missing function' as problem, e.function_name as detail
from expected e
where e.function_name <> '__none__'
  and not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = e.function_name
  );

-- 4. Public tables with row level security turned off.
select 'rls disabled' as problem, c.relname as detail
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity;

-- 5. Notification types the code creates must fit the database check constraint.
-- Shows the constraint definition so you can compare it by eye.
select 'notification type constraint' as problem, pg_get_constraintdef(oid) as detail
from pg_constraint
where conrelid = 'public.notifications'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) ilike '%type%';

-- 6. Every notification type the app creates or maps. Any value missing from
-- the constraint above will make inserts fail for that type.
with app_types(type_name) as (
  values
    ('event_reminder'), ('new_event'), ('friend_request'), ('friend_accepted'),
    ('buddy_request'), ('buddy_nudge'), ('chat_message'), ('hang_now'),
    ('new_post'), ('post_comment'), ('trip_invite'), ('birthday'),
    ('weekly_recap'), ('wrapped'), ('best_of_month')
)
select 'app type not allowed by constraint' as problem, a.type_name as detail
from app_types a
where exists (
  select 1 from pg_constraint con
  where con.conrelid = 'public.notifications'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%type%'
    and pg_get_constraintdef(con.oid) not ilike '%''' || a.type_name || '''%'
);

-- 7. Realtime publication. Every table the app subscribes to must be in it.
with expected(table_name) as (
  values
    ('availability'), ('conversation_members'), ('event_arrivals'),
    ('event_ideas'), ('event_messages'), ('hang_responses'), ('hangs'),
    ('idea_votes'), ('message_reactions'), ('messages'), ('notifications'),
    ('pinned_messages'), ('post_comments')
)
select 'not in supabase_realtime publication' as problem, e.table_name as detail
from expected e
where not exists (
  select 1 from pg_publication_tables p
  where p.pubname = 'supabase_realtime'
    and p.schemaname = 'public'
    and p.tablename = e.table_name
);

-- 8. Storage buckets the app uploads to. Every upload and read uses the one
-- bucket named `photos` (see PHOTO_BUCKET in src/lib/photo-urls.ts).
with expected(bucket_id) as (
  values ('photos')
)
select 'missing storage bucket' as problem, e.bucket_id as detail
from expected e
where not exists (
  select 1 from storage.buckets b where b.id = e.bucket_id
);
