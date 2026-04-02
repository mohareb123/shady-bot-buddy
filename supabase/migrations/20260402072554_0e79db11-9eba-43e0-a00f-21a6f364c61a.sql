CREATE POLICY "Allow authenticated uploads to notification-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notification-media');

CREATE POLICY "Allow public read from notification-media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'notification-media');

CREATE POLICY "Allow authenticated delete from notification-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'notification-media');

CREATE POLICY "Allow authenticated update in notification-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'notification-media')
WITH CHECK (bucket_id = 'notification-media');