import ConfirmButton from "@/components/confirm-button";
import InlineForm from "@/components/inline-form";
import { Card, CardHeader, Field, Input } from "@/components/ui";
import { addCredit, deleteCredit } from "@/lib/actions/properties";
import { formatDate, formatEuro, toISODate } from "@/lib/rent";
import type { Credit } from "@/lib/types";

export default function CreditsTab({
  propertyId,
  credits,
  canEdit,
}: {
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
            title="Gutschrift erfassen"
            description="Beträge, die dem Mieter angerechnet werden, z. B. selbst bezahlte Handwerker."
          />
          <div className="p-5">
            <InlineForm action={addCredit} submitLabel="Gutschrift erfassen">
              <input type="hidden" name="property_id" value={propertyId} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Datum">
                  <Input
                    name="credited_on"
                    type="date"
                    required
                    defaultValue={toISODate(new Date())}
                  />
                </Field>
                <Field label="Betrag (€)">
                  <Input name="amount" inputMode="decimal" required placeholder="250,00" />
                </Field>
                <Field label="Grund">
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
            Gutschriften
            <span className="ml-2 text-sm font-normal text-muted">
              {credits.length} {credits.length === 1 ? "Eintrag" : "Einträge"}
            </span>
          </h2>
          <p className="tabular text-lg font-semibold">{formatEuro(total)}</p>
        </div>

        {credits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Keine Gutschriften erfasst.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Datum</th>
                  <th className="px-5 py-3 text-right font-medium">Betrag</th>
                  <th className="px-5 py-3 font-medium">Grund</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {credits.map((credit) => (
                  <tr key={credit.id} className="border-b border-border/60 last:border-0">
                    <td className="tabular px-5 py-3">{formatDate(credit.credited_on)}</td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {formatEuro(Number(credit.amount))}
                    </td>
                    <td className="px-5 py-3 text-muted">{credit.reason || "—"}</td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <form action={deleteCredit}>
                          <input type="hidden" name="id" value={credit.id} />
                          <input type="hidden" name="property_id" value={propertyId} />
                          <ConfirmButton message="Diese Gutschrift löschen?">
                            Löschen
                          </ConfirmButton>
                        </form>
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
