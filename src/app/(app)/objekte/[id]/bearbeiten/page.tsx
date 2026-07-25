import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PropertyForm from "@/components/property-form";
import { Card, CardHeader } from "@/components/ui";
import { updateProperty } from "@/lib/actions/properties";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getLocations, getPropertyDetail } from "@/lib/queries";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  if (profile.role === "viewer") redirect(`/objekte/${id}`);

  const [detail, locations, { t }] = await Promise.all([
    getPropertyDetail(id),
    getLocations(),
    getDict(),
  ]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/objekte/${id}`} className="text-sm text-muted hover:text-foreground">
          {t.form.backToProperty}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {t.form.editSuffix(detail.property.name)}
        </h1>
      </div>

      <Card>
        <CardHeader
          title={t.form.masterData}
          description={t.form.masterHintEdit}
        />
        <div className="p-5">
          <PropertyForm
            action={updateProperty}
            property={detail.property}
            locations={locations}
          />
        </div>
      </Card>
    </div>
  );
}
