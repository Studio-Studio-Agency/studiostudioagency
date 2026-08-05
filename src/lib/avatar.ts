import { supabase } from "@/integrations/supabase/client";

/**
 * The avatars bucket is private — resolve a stored value (either a storage path
 * or a legacy public URL) into a short-lived signed URL.
 */
export async function resolveAvatarUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;

  let path = value;
  const match = value.match(/\/avatars\/(.+)$/);
  if (match) path = match[1];
  path = path.split("?")[0];

  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
