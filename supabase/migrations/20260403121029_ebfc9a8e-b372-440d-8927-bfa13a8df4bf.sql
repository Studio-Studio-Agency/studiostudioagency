
INSERT INTO storage.buckets (id, name, public) VALUES ('list-exports', 'list-exports', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload list exports" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'list-exports');
CREATE POLICY "Anyone can read list exports" ON storage.objects FOR SELECT USING (bucket_id = 'list-exports');
