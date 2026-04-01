
-- Create storage bucket for notification media files
INSERT INTO storage.buckets (id, name, public) VALUES ('notification-media', 'notification-media', true);

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notification-media');

-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'notification-media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'notification-media');
