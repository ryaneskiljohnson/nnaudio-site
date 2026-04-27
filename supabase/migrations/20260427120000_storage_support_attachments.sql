-- RLS for support-attachments bucket. Upload/sign in app use the service role after
-- server-side auth checks, but these policies let authenticated users interact if needed.

DROP POLICY IF EXISTS "Support attachments: authenticated can upload" ON storage.objects;
DROP POLICY IF EXISTS "Support attachments: authenticated can read" ON storage.objects;
DROP POLICY IF EXISTS "Support attachments: authenticated can update" ON storage.objects;
DROP POLICY IF EXISTS "Support attachments: authenticated can delete" ON storage.objects;

CREATE POLICY "Support attachments: authenticated can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Support attachments: authenticated can read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'support-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Support attachments: authenticated can update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'support-attachments'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Support attachments: authenticated can delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'support-attachments'
    AND auth.role() = 'authenticated'
  );
