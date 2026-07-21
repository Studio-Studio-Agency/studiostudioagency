-- Klimapartner Basel — Raum-Fotos (Supabase Storage)
--
-- Privater Bucket: Besucher dürfen NUR hochladen (für die Offerte des
-- Partners), niemals lesen. Gelesen wird ausschliesslich über Signed URLs,
-- die die klima-admin Edge-Function (Service-Role + Admin-Allowlist) erzeugt.
-- Grössen-/Typ-Limits auf Bucket-Ebene begrenzen Missbrauch des anonymen
-- Uploads; MAX_PHOTO_BYTES im Frontend muss dazu passen.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'klima-photos',
  'klima-photos',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anon can upload klima photos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'klima-photos');

-- kein SELECT/UPDATE/DELETE für anon oder authenticated: Zugriff nur via
-- Service-Role (Signed URLs aus klima-admin).
