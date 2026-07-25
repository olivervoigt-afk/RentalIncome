import { createClient } from "@/lib/supabase/server";

/**
 * Der Dokumenten-Bucket ist privat. Beim Rendern wird daher eine
 * zeitlich begrenzte Signatur erzeugt (eine Stunde gültig).
 */
export default async function DocumentLink({
  path,
  name,
}: {
  path: string;
  name: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("property-documents")
    .createSignedUrl(path, 3600);

  if (!data?.signedUrl) {
    return <p className="truncate font-medium">{name}</p>;
  }

  return (
    <a
      href={data.signedUrl}
      target="_blank"
      rel="noreferrer"
      className="block truncate font-medium hover:text-accent hover:underline"
    >
      {name}
    </a>
  );
}
