import DangerAction from "@/components/danger-action";
import DepositForm from "@/components/property/deposit-form";
import { Badge, Card, CardHeader } from "@/components/ui";
import { deleteDeposit } from "@/lib/actions/deposits";
import type { DepositSummary } from "@/lib/deposits";
import type { Formatters } from "@/lib/format";
import { fill, type Dict } from "@/lib/i18n/dictionaries";
import type { Deposit, PaymentSource, Property } from "@/lib/types";

export default function DepositsTab({
  t,
  f,
  property,
  deposits,
  summary,
  sources,
  canEdit,
}: {
  t: Dict;
  f: Formatters;
  property: Property;
  deposits: Deposit[];
  summary: DepositSummary;
  sources: PaymentSource[];
  canEdit: boolean;
}) {
  const agreed = Number(property.deposit_amount);
  const difference = agreed - summary.held;

  const kindLabel: Record<Deposit["kind"], string> = {
    received: t.deposits.received,
    refunded: t.deposits.refunded,
    retained: t.deposits.retained,
  };

  return (
    <div className="space-y-6">
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <div>
            <p className="text-sm text-muted">{t.deposits.held}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{f.euro(summary.held)}</p>
            {agreed > 0 && (
              <p className="mt-0.5 text-xs text-muted">
                {t.deposits.agreed}: {f.euro(agreed)} ·{" "}
                {difference > 0.005
                  ? fill(t.deposits.missing, { amount: f.euro(difference) })
                  : difference < -0.005
                    ? fill(t.deposits.tooMuch, { amount: f.euro(-difference) })
                    : t.deposits.complete}
              </p>
            )}
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Figure t={t.deposits.received} value={f.euro(summary.received)} />
            <Figure t={t.deposits.refunded} value={f.euro(summary.refunded)} />
            <Figure t={t.deposits.retained} value={f.euro(summary.retained)} />
          </dl>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
          {t.deposits.hint}
        </p>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader title={t.deposits.record} />
          <div className="p-5">
            <DepositForm t={t} propertyId={property.id} sources={sources} />
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">{t.deposits.title}</h2>
        </div>

        {deposits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t.deposits.none}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">{t.common.date}</th>
                  <th className="px-5 py-3 font-medium">{t.deposits.kind}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.common.amount}</th>
                  <th className="px-5 py-3 font-medium">{t.common.note}</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="border-b border-border/60 last:border-0">
                    <td className="tabular px-5 py-3">{f.date(deposit.happened_on)}</td>
                    <td className="px-5 py-3">
                      {kindLabel[deposit.kind]}
                      {deposit.payment_id && (
                        <span className="ml-2">
                          <Badge tone="accent">{t.deposits.bookedAsPayment}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {/* Rückzahlung und Einbehalt verringern die verwahrte Summe. */}
                      {deposit.kind === "received" ? "" : "− "}
                      {f.euro(Number(deposit.amount))}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {deposit.note || t.common.none}
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <DangerAction
                          action={deleteDeposit}
                          fields={{ id: deposit.id, property_id: property.id }}
                          trigger={t.common.delete}
                          title={t.deposits.deleteTitle}
                          description={
                            fill(t.deposits.deleteDetail, {
                              amount: f.euro(Number(deposit.amount)),
                              date: f.date(deposit.happened_on),
                            }) +
                            (deposit.payment_id
                              ? ` ${t.deposits.deleteWithPayment}`
                              : "")
                          }
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

function Figure({ t, value }: { t: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{t}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  );
}
