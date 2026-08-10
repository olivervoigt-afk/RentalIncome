import { redirect } from "next/navigation";
import { Card, CardHeader } from "@/components/ui";
import PropertyForm from "@/components/property-form";
import { createProperty } from "@/lib/actions/properties";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getInvestmentOptions, getLocations } from "@/lib/queries";

export const metadata = { title: "Mietvertrag anlegen" };

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ investition?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "viewer") redirect("/");

  const { investition } = await searchParams;
  const [locations, investments, { t }] = await Promise.all([
    getLocations(),
    getInvestmentOptions(),
    getDict(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.form.newProperty}</h1>

      <Card>
        <CardHeader
          title={t.form.masterData}
          description={t.form.masterHintNew}
        />
        <div className="p-5">
          <PropertyForm
            action={createProperty}
            locations={locations}
            investments={investments}
            preselectedInvestment={investition}
            showInitialRent
          />
        </div>
      </Card>
    </div>
  );
}
