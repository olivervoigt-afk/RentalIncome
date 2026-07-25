import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import { Card, CardHeader, Field, Input } from "@/components/ui";
import { addCredit, deleteCredit } from "@/lib/actions/properties";
import type { Formatters } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dictionaries";
import { toISODate } from "@/lib/rent";
import type { Credit } from "@/lib/types";

export default function CreditsTab({
  t,
  f,
  propertyId,
  credits,
  canEdit,
}: {
  t: Dict;
  f: Formatters;
  propertyId: string;
  credits: Credit[];
  canEdit: boolean;
}) {
  const total = credits.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <CardHeader
            title={t.property.recordCredit}
            description={t.property.creditsHint}
          />
          <div className="p-5">
            <InlineForm action={addCredit} submitLabel={t.property.recordCredit}>
              <input type="hidden" name="property_id" value={propertyId} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t.common.date}>
                  <Input
                    name="credited_on"
                    type="date"
                    required
                    defaultValue={toISODate(new Date())}
                  />
                </Field>
                <Field label={t.common.amount}>
                  <Input name="amount" inputMode="decimal" required placeholder="250,00" />
                </Field>
                <Field label={t.common.reason}>
                  <Input name="reason" placeholder="z. B. Sanitär-Reparatur" />
                </Field>
              </div>
            </InlineForm>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-baseline justify-between gap-2 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">
            {t.property.creditsTitle}
            <span className="ml-2 text-sm font-normal text-muted">
              {t.property.entries(credits.length)}
            </span>
          </h2>
          <p className="tabular text-lg font-semibold">{f.euro(total)}</p>
        </div>

        {credits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            {t.property.noCredits}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">{t.common.date}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.common.amount}</th>
                  <th className="px-5 py-3 font-medium">{t.common.reason}</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {credits.map((credit) => (
                  <tr key={credit.id} className="border-b border-border/60 last:border-0">
                    <td className="tabular px-5 py-3">{f.date(credit.credited_on)}</td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {f.euro(Number(credit.amount))}
                    </td>
                    <td className="px-5 py-3 text-muted">{credit.reason || t.common.none}</td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <DangerAction
                          action={deleteCredit}
                          fields={{ id: credit.id, property_id: propertyId }}
                          trigger={t.common.delete}
                          title={t.property.creditsTitle}
                          description={`${f.euro(Number(credit.amount))} vom ${f.date(credit.credited_on)} wird entfernt.`}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
