import { notFound, redirect } from "next/navigation";
import InvestmentForm from "@/components/investment-form";
import { Card, CardHeader } from "@/components/ui";
import { updateInvestment } from "@/lib/actions/investments";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getInvestment, getLocations } from "@/lib/queries";

export default async function EditInvestmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "viewer") redirect("/");

  const { id } = await params;
  const [row, locations, { t }] = await Promise.all([
    getInvestment(id),
    getLocations(),
    getDict(),
  ]);

  if (!row) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader title={t.yield.editInvestment} description={row.investment.name} />
        <div className="p-5">
          <InvestmentForm
            action={updateInvestment}
            investment={row.investment}
            locations={locations}
          />
        </div>
      </Card>
    </div>
  );
}
