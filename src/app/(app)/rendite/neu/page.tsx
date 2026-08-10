import { redirect } from "next/navigation";
import InvestmentForm from "@/components/investment-form";
import { Card, CardHeader } from "@/components/ui";
import { createInvestment } from "@/lib/actions/investments";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getLocations } from "@/lib/queries";

export const metadata = { title: "Investition anlegen" };

export default async function NewInvestmentPage() {
  const profile = await requireProfile();
  if (profile.role === "viewer") redirect("/");

  const [locations, { t }] = await Promise.all([getLocations(), getDict()]);

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader title={t.yield.newInvestment} description={t.yield.intro} />
        <div className="p-5">
          <InvestmentForm action={createInvestment} locations={locations} />
        </div>
      </Card>
    </div>
  );
}
