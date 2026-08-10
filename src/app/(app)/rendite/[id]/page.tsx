import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import { Flags } from "@/app/(app)/rendite/page";
import { Badge, ButtonLink, Card, CardHeader, Field, Input } from "@/components/ui";
import { addExpense, deleteExpense, deleteInvestment } from "@/lib/actions/investments";
import { requireProfile } from "@/lib/auth";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { fill, plural } from "@/lib/i18n/dictionaries";
import { getInvestment } from "@/lib/queries";
import { toISODate } from "@/lib/rent";

export default async function InvestmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "viewer") redirect("/");

  const { id } = await params;
  const [row, { t, locale }] = await Promise.all([getInvestment(id), getDict()]);
  const f = formatters(locale);

  if (!row) notFound();
  const { investment, location, expenses, properties, figures, flags, firstPayment } = row;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/rendite" className="text-sm text-muted hover:text-foreground">
            ← {t.yield.title}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{investment.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {location ?? t.reports.noLocation}
            {investment.purchased_on && ` · ${t.yield.purchasedOn} ${f.date(investment.purchased_on)}`}
          </p>
          <Flags t={t} flags={flags} />
        </div>

        <ButtonLink href={`/rendite/${investment.id}/bearbeiten`} variant="secondary">
          {t.common.edit}
        </ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.yield.total} value={figures.total > 0 ? f.euro(figures.total) : t.common.none} />
        <Stat label={t.yield.income} value={f.euro(figures.income)} />
        <Stat
          label={t.yield.payback}
          value={figures.payback === null ? t.common.none : f.percent(figures.payback)}
          hint={
            figures.yearsToPayback === null
              ? figures.payback === null
                ? undefined
                : t.yield.paidBack
              : fill(t.yield.yearsToPayback, { n: figures.yearsToPayback.toFixed(1) })
          }
        />
        <Stat
          label={figures.sold ? t.yield.result : t.yield.grossYield}
          value={
            figures.sold
              ? figures.result === null
                ? t.common.none
                : f.euro(figures.result)
              : figures.grossYield === null
                ? t.common.none
                : f.percent(figures.grossYield)
          }
          hint={figures.sold ? t.yield.resultHint : undefined}
        />
      </div>

      <Card className="px-5 py-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={t.yield.purchasePrice} value={money(investment.purchase_price, f, t)} />
          <Detail label={t.yield.costsAmount} value={f.euro(figures.costs)} />
          <Detail label={t.yield.expenses} value={f.euro(figures.expenses)} />
          <Detail label={t.yield.annualCosts} value={money(investment.annual_costs, f, t)} />
          <Detail
            label={t.yield.marketYield}
            value={
              figures.marketYield === null
                ? t.common.none
                : `${f.percent(figures.marketYield)} (${fill(t.yield.foregone, { amount: f.euro(figures.foregone ?? 0) })})`
            }
          />
          <Detail
            label={t.yield.valuation}
            value={
              investment.valuation === null
                ? t.common.none
                : `${f.euro(Number(investment.valuation))}${investment.valued_on ? ` (${f.date(investment.valued_on)})` : ""}`
            }
          />
          <Detail
            label={t.yield.appreciation}
            value={figures.appreciation === null ? t.common.none : f.euro(figures.appreciation)}
          />
          {investment.sold_on && (
            <>
              <Detail label={t.yield.soldOn} value={f.date(investment.sold_on)} />
              <Detail label={t.yield.salePrice} value={money(investment.sale_price, f, t)} />
            </>
          )}
          {firstPayment && (
            <Detail label={t.yield.openingValue} value={money(investment.opening_value, f, t)} />
          )}
        </dl>

        {investment.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="whitespace-pre-wrap text-sm">{investment.notes}</p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title={t.yield.expenses} description={t.yield.expensesHint} />
        <div className="p-5">
          <InlineForm action={addExpense} submitLabel={t.yield.recordExpense}>
            <input type="hidden" name="investment_id" value={investment.id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t.common.date}>
                <Input
                  name="happened_on"
                  type="date"
                  required
                  defaultValue={toISODate(new Date())}
                />
              </Field>
              <Field label={t.common.amount}>
                <Input name="amount" inputMode="decimal" required placeholder="12500,00" />
              </Field>
              <Field label={t.common.note}>
                <Input name="description" placeholder="z. B. neue Heizung" />
              </Field>
            </div>
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name="value_adding"
                className="mt-0.5 size-4 rounded border-border accent-accent"
              />
              <span>
                <span className="font-medium">{t.yield.valueAdding}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {t.yield.valueAddingHint}
                </span>
              </span>
            </label>
          </InlineForm>
        </div>

        {expenses.length > 0 && (
          <table className="w-full border-t border-border text-sm">
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border/60 last:border-0">
                  <td className="tabular px-5 py-3">{f.date(expense.happened_on)}</td>
                  <td className="tabular px-5 py-3 text-right font-medium">
                    {f.euro(Number(expense.amount))}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {expense.description || t.common.none}
                    {expense.value_adding && (
                      <span className="ml-2">
                        <Badge tone="accent">{t.yield.valueAdding}</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DangerAction
                      action={deleteExpense}
                      fields={{ id: expense.id, investment_id: investment.id }}
                      trigger={t.common.delete}
                      title={t.yield.expenses}
                      description={`${f.euro(Number(expense.amount))} vom ${f.date(expense.happened_on)}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">
            {t.yield.tenancies}
            <span className="ml-2 text-sm font-normal text-muted">
              {plural(t.dashboard.countProperties, properties.length)}
            </span>
          </h2>
        </div>
        {properties.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t.yield.noTenancies}</p>
        ) : (
          <ul className="divide-y divide-border">
            {properties.map((property) => (
              <li key={property.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <Link
                  href={`/objekte/${property.id}`}
                  className="text-sm font-medium hover:text-accent hover:underline"
                >
                  {property.name}
                  {property.tenant_name && (
                    <span className="block text-xs font-normal text-muted">
                      {property.tenant_name}
                    </span>
                  )}
                </Link>
                {property.archived && <Badge>{t.dashboard.archived}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-negative/30 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">{t.yield.deleteDetail}</p>
          <DangerAction
            action={deleteInvestment}
            fields={{ id: investment.id }}
            trigger={t.common.deleteFinally}
            triggerClassName="rounded-md border border-negative/40 px-3.5 py-2 text-sm font-medium text-negative transition-colors hover:bg-negative/10"
            title={t.yield.deleteTitle}
            description={t.yield.deleteDetail}
          />
        </div>
      </Card>
    </div>
  );
}

function money(
  value: number | null,
  f: ReturnType<typeof formatters>,
  t: { common: { none: string } },
): string {
  return value === null ? t.common.none : f.euro(Number(value));
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
