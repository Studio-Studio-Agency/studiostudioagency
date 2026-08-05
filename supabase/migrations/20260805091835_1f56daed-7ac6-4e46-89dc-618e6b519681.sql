-- 1. ios_waitlist: stop exposing e-mail addresses, keep a public counter
DROP POLICY IF EXISTS "Anyone can count waitlist" ON public.ios_waitlist;

CREATE TABLE IF NOT EXISTS public.ios_waitlist_stats (
  id integer PRIMARY KEY DEFAULT 1,
  total integer NOT NULL DEFAULT 0,
  CONSTRAINT ios_waitlist_stats_singleton CHECK (id = 1)
);

GRANT SELECT ON public.ios_waitlist_stats TO anon, authenticated;
GRANT ALL ON public.ios_waitlist_stats TO service_role;
ALTER TABLE public.ios_waitlist_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read waitlist count" ON public.ios_waitlist_stats;
CREATE POLICY "Anyone can read waitlist count"
ON public.ios_waitlist_stats FOR SELECT USING (true);

INSERT INTO public.ios_waitlist_stats (id, total)
VALUES (1, (SELECT count(*) FROM public.ios_waitlist))
ON CONFLICT (id) DO UPDATE SET total = EXCLUDED.total;

CREATE OR REPLACE FUNCTION public.sync_ios_waitlist_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.ios_waitlist_stats (id, total)
  VALUES (1, (SELECT count(*) FROM public.ios_waitlist))
  ON CONFLICT (id) DO UPDATE SET total = EXCLUDED.total;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ios_waitlist_stats_sync ON public.ios_waitlist;
CREATE TRIGGER ios_waitlist_stats_sync
AFTER INSERT OR DELETE ON public.ios_waitlist
FOR EACH STATEMENT EXECUTE FUNCTION public.sync_ios_waitlist_stats();

-- 2. Storage: scope object access to the owner
DROP POLICY IF EXISTS "Anyone can read list exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload list exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own list exports" ON storage.objects;

CREATE POLICY "Users can upload own list exports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'list-exports'
  AND EXISTS (
    SELECT 1 FROM public.lists l
    WHERE l.id::text = (storage.foldername(name))[1]
      AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can read own list exports"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'list-exports'
  AND EXISTS (
    SELECT 1 FROM public.lists l
    WHERE l.id::text = (storage.foldername(name))[1]
      AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own list exports"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'list-exports'
  AND EXISTS (
    SELECT 1 FROM public.lists l
    WHERE l.id::text = (storage.foldername(name))[1]
      AND l.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own avatar" ON storage.objects;
CREATE POLICY "Users can view own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Pin search_path on SECURITY DEFINER helpers
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

-- 4. Only the backend may call these privileged helpers
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_ios_waitlist_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;