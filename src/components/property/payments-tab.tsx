import Link from "next/link";
import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import { Badge, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { addPayment, deletePayment } from "@/lib/actions/properties";
import type { Formatters } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dictionaries";
import { installments, toISODate } from "@/lib/rent";
import type { Payment, PaymentSource, Property, RentPeriod } from "@/lib/types";
import { fill, plural } from "@/lib/i18n/dictionaries";

const PAGE_SIZE = 25;

export type PaymentsView = "eingaenge" | "soll";

export default function PaymentsTab({
  t,
  f,
  property,
  periods,
  payments,
  sources,
  canEdit,
  view,
  year,
  page,
}: {
  t: Dict;
  f: Formatters;
  property: Property;
  periods: RentPeriod[];
  payments: Payment[];
  sources: PaymentSource[];
  canEdit: boolean;
  view: PaymentsView;
  /** Kalenderjahr oder "alle". */
  year: string;
  page: number;
}) {
  const basePath = `/objekte/${property.id}`;

  const href = (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams({ tab: "zahlungen" });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
    return `${basePath}?${query}`;
  };

  const dueList = installments(property, periods);
  const currentYear = new Date().getFullYear();

  /* Bei den Eingängen sind künftige Jahre sinnlos — eine Zahlung für 2038
   * kann niemand erfassen. Bei den fälligen Raten gehören sie dagegen dazu. */
  const years = [
    ...new Set([
      ...payments.map((p) => p.paid_on.slice(0, 4)),
      ...dueList.map((i) => String(i.dueDate.getFullYear())),
    ]),
  ]
    .filter((y) => view === "soll" || Number(y) <= currentYear)
    .sort((a, b) => b.localeCompare(a));

  // Wer aus der Soll-Ansicht mit einem künftigen Jahr herüberwechselt,
  // landet sonst auf einer leeren Liste ohne passende Schaltfläche.
  const selectedYear =
    view === "eingaenge" && year !== "alle" && Number(year) > currentYear
      ? String(currentYear)
      : year;

  const rows =
    view === "soll"
      ? dueList
          .filter(
            (i) => selectedYear === "alle" || String(i.dueDate.getFullYear()) === selectedYear,
          )
          .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
      : payments.filter(
          (p) => selectedYear === "alle" || p.paid_on.startsWith(selectedYear),
        );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const periodTotal =
    view === "soll"
      ? (rows as typeof dueList).reduce((sum, i) => sum + (i.amount ?? 0), 0)
      : (rows as Payment[]).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {canEdit && view === "eingaenge" && (
        <Card>
          <CardHeader title={t.property.recordPayment} />
          <div className="p-5">
            <InlineForm action={addPayment} submitLabel={t.property.recordPayment}>
              <input type="hidden" name="property_id" value={property.id} />
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label={t.property.paymentDate}>
                  <Input
                    name="paid_on"
                    type="date"
                    required
                    defaultValue={toISODate(new Date())}
                  />
                </Field>
                <Field label={t.common.amount}>
                  <Input name="amount" inputMode="decimal" required placeholder="1250,00" />
                </Field>
                <Field label={t.common.source}>
                  <Select name="source_id" defaultValue={sources[0]?.id ?? ""}>
                    <option value="">{t.property.withoutSource}</option>
                    {sources
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label={t.common.note}>
                  <Input name="note" />
                </Field>
              </div>
            </InlineForm>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          {/* Umschalter Ist / Soll */}
          <div className="flex rounded-md border border-border p-0.5">
            <SwitchLink
              href={href({ ansicht: "eingaenge", jahr: selectedYear })}
              active={view === "eingaenge"}
            >
              {t.property.paymentsTitle}
            </SwitchLink>
            <SwitchLink
              href={href({ ansicht: "soll", jahr: selectedYear })}
              active={view === "soll"}
            >
              {t.property.dueRates}
            </SwitchLink>
          </div>

          {/* Jahresfilter */}
          <div className="flex flex-wrap items-center gap-1">
            <YearLink href={href({ ansicht: view, jahr: "alle" })} active={selectedYear === "alle"}>
              {t.property.allYears}
            </YearLink>
            {years.map((y) => (
              <YearLink
                key={y}
                href={href({ ansicht: view, jahr: y })}
                active={selectedYear === y}
              >
                {y}
              </YearLink>
            ))}
          </div>
        </div>

        {/* Summe des gewählten Zeitraums */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-surface-muted/40 px-5 py-3">
          <p className="text-sm text-muted">
            {view === "soll" ? t.property.dueLabel : t.property.receivedLabel}
            {selectedYear === "alle"
              ? t.property.receivedTotal
              : fill(t.property.receivedInYear, { year: selectedYear })}
            {" · "}
            {plural(t.property.entries, rows.length)}
          </p>
          <p className="tabular text-lg font-semibold">{f.euro(periodTotal)}</p>
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            {view === "soll"
              ? t.property.noDueInPeriod
              : t.property.noPaymentsInPeriod}
          </p>
        ) : view === "soll" ? (
          <DueTable t={t} f={f} rows={visible as typeof dueList} />
        ) : (
          <PaymentTable
            t={t}
            f={f}
            rows={visible as Payment[]}
            sources={sources}
            propertyId={property.id}
            canEdit={canEdit}
          />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3 text-sm">
            <span className="text-muted">
              {fill(t.property.pageOf, { page: currentPage, total: totalPages })}
            </span>
            <div className="flex gap-2">
              <PageLink
                href={href({ ansicht: view, jahr: selectedYear, seite: currentPage - 1 })}
                disabled={currentPage === 1}
              >
                {t.property.prev}
              </PageLink>
              <PageLink
                href={href({ ansicht: view, jahr: selectedYear, seite: currentPage + 1 })}
                disabled={currentPage === totalPages}
              >
                {t.property.next}
              </PageLink>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function PaymentTable({
  t,
  f,
  rows,
  sources,
  propertyId,
  canEdit,
}: {
  t: Dict;
  f: Formatters;
  rows: Payment[];
  sources: PaymentSource[];
  propertyId: string;
  canEdit: boolean;
}) {
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">{t.property.paymentDate}</th>
            <th className="px-5 py-3 text-right font-medium">{t.common.amount}</th>
            <th className="px-5 py-3 font-medium">{t.common.source}</th>
            <th className="px-5 py-3 font-medium">{t.common.note}</th>
            {canEdit && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((payment) => (
            <tr key={payment.id} className="border-b border-border/60 last:border-0">
              <td className="tabular px-5 py-3">{f.date(payment.paid_on)}</td>
              <td className="tabular px-5 py-3 text-right font-medium">
                {f.euro(Number(payment.amount))}
              </td>
              <td className="px-5 py-3">
                {payment.source_id ? (
                  <Badge>{sourceName.get(payment.source_id) ?? t.property.unknownSource}</Badge>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-muted">{payment.note || t.common.none}</td>
              {canEdit && (
                <td className="px-5 py-3 text-right">
                  <DangerAction
                    action={deletePayment}
                    fields={{ id: payment.id, property_id: propertyId }}
                    trigger={t.common.delete}
                    title={t.property.paymentsTitle}
                    description={`${f.euro(Number(payment.amount))} vom ${f.date(payment.paid_on)} wird entfernt. Der Saldo erhöht sich entsprechend.`}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DueTable({
  t,
  f,
  rows,
}: {
  t: Dict;
  f: Formatters;
  rows: { dueDate: Date; amount: number | null }[];
}) {
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">{t.property.due}</th>
            <th className="px-5 py-3 text-right font-medium">{t.common.amount}</th>
            <th className="px-5 py-3 font-medium">{t.property.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isPast = row.dueDate <= today;

            return (
              <tr
                key={row.dueDate.toISOString()}
                className="border-b border-border/60 last:border-0"
              >
                <td className="tabular px-5 py-3">{f.date(row.dueDate)}</td>
                <td className="tabular px-5 py-3 text-right font-medium">
                  {row.amount === null ? (
                    <span className="text-negative">{t.property.noRateSet}</span>
                  ) : (
                    f.euro(row.amount)
                  )}
                </td>
                <td className="px-5 py-3">
                  {isPast ? (
                    <Badge>{t.property.isDue}</Badge>
                  ) : (
                    <span className="text-muted">{t.property.future}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SwitchLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-surface-muted font-medium text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function YearLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
        active
          ? "bg-accent text-accent-fg"
          : "text-muted hover:bg-surface-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="px-3 py-1.5 text-muted opacity-50">{children}</span>;
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-surface-muted"
    >
      {children}
    </Link>
  );
}
