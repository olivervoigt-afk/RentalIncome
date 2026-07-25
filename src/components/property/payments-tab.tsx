import Link from "next/link";
import ConfirmButton from "@/components/confirm-button";
import InlineForm from "@/components/inline-form";
import { Badge, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { addPayment, deletePayment } from "@/lib/actions/properties";
import { formatDate, formatEuro, installments, toISODate } from "@/lib/rent";
import type { Payment, PaymentSource, Property, RentPeriod } from "@/lib/types";

const PAGE_SIZE = 25;

export type PaymentsView = "eingaenge" | "soll";

export default function PaymentsTab({
  property,
  periods,
  payments,
  sources,
  canEdit,
  view,
  year,
  page,
}: {
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

  // Auswahl der Jahre aus vorhandenen Zahlungen und Fälligkeiten.
  const years = [
    ...new Set([
      ...payments.map((p) => p.paid_on.slice(0, 4)),
      ...dueList.map((i) => String(i.dueDate.getFullYear())),
    ]),
  ].sort((a, b) => b.localeCompare(a));

  const rows =
    view === "soll"
      ? dueList
          .filter((i) => year === "alle" || String(i.dueDate.getFullYear()) === year)
          .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
      : payments.filter((p) => year === "alle" || p.paid_on.startsWith(year));

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
          <CardHeader title="Zahlung erfassen" />
          <div className="p-5">
            <InlineForm action={addPayment} submitLabel="Zahlung erfassen">
              <input type="hidden" name="property_id" value={property.id} />
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Zahlungsdatum">
                  <Input
                    name="paid_on"
                    type="date"
                    required
                    defaultValue={toISODate(new Date())}
                  />
                </Field>
                <Field label="Betrag (€)">
                  <Input name="amount" inputMode="decimal" required placeholder="1250,00" />
                </Field>
                <Field label="Quelle">
                  <Select name="source_id" defaultValue={sources[0]?.id ?? ""}>
                    <option value="">Ohne Angabe</option>
                    {sources
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Notiz">
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
              href={href({ ansicht: "eingaenge", jahr: year })}
              active={view === "eingaenge"}
            >
              Zahlungseingänge
            </SwitchLink>
            <SwitchLink
              href={href({ ansicht: "soll", jahr: year })}
              active={view === "soll"}
            >
              Fällige Raten
            </SwitchLink>
          </div>

          {/* Jahresfilter */}
          <div className="flex flex-wrap items-center gap-1">
            <YearLink href={href({ ansicht: view, jahr: "alle" })} active={year === "alle"}>
              Alle
            </YearLink>
            {years.map((y) => (
              <YearLink
                key={y}
                href={href({ ansicht: view, jahr: y })}
                active={year === y}
              >
                {y}
              </YearLink>
            ))}
          </div>
        </div>

        {/* Summe des gewählten Zeitraums */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-surface-muted/40 px-5 py-3">
          <p className="text-sm text-muted">
            {view === "soll" ? "Fällig" : "Erhalten"}
            {year === "alle" ? " insgesamt" : ` im Jahr ${year}`}
            {" · "}
            {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"}
          </p>
          <p className="tabular text-lg font-semibold">{formatEuro(periodTotal)}</p>
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            {view === "soll"
              ? "Für diesen Zeitraum sind keine Raten fällig."
              : "Keine Zahlungen in diesem Zeitraum erfasst."}
          </p>
        ) : view === "soll" ? (
          <DueTable rows={visible as typeof dueList} />
        ) : (
          <PaymentTable
            rows={visible as Payment[]}
            sources={sources}
            propertyId={property.id}
            canEdit={canEdit}
          />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3 text-sm">
            <span className="text-muted">
              Seite {currentPage} von {totalPages}
            </span>
            <div className="flex gap-2">
              <PageLink
                href={href({ ansicht: view, jahr: year, seite: currentPage - 1 })}
                disabled={currentPage === 1}
              >
                ← Zurück
              </PageLink>
              <PageLink
                href={href({ ansicht: view, jahr: year, seite: currentPage + 1 })}
                disabled={currentPage === totalPages}
              >
                Weiter →
              </PageLink>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function PaymentTable({
  rows,
  sources,
  propertyId,
  canEdit,
}: {
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
            <th className="px-5 py-3 font-medium">Zahlungsdatum</th>
            <th className="px-5 py-3 text-right font-medium">Betrag</th>
            <th className="px-5 py-3 font-medium">Quelle</th>
            <th className="px-5 py-3 font-medium">Notiz</th>
            {canEdit && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((payment) => (
            <tr key={payment.id} className="border-b border-border/60 last:border-0">
              <td className="tabular px-5 py-3">{formatDate(payment.paid_on)}</td>
              <td className="tabular px-5 py-3 text-right font-medium">
                {formatEuro(Number(payment.amount))}
              </td>
              <td className="px-5 py-3">
                {payment.source_id ? (
                  <Badge>{sourceName.get(payment.source_id) ?? "Unbekannt"}</Badge>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-muted">{payment.note || "—"}</td>
              {canEdit && (
                <td className="px-5 py-3 text-right">
                  <form action={deletePayment}>
                    <input type="hidden" name="id" value={payment.id} />
                    <input type="hidden" name="property_id" value={propertyId} />
                    <ConfirmButton message="Diese Zahlung löschen?">Löschen</ConfirmButton>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DueTable({ rows }: { rows: { dueDate: Date; amount: number | null }[] }) {
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">Fälligkeit</th>
            <th className="px-5 py-3 text-right font-medium">Betrag</th>
            <th className="px-5 py-3 font-medium">Status</th>
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
                <td className="tabular px-5 py-3">{formatDate(row.dueDate)}</td>
                <td className="tabular px-5 py-3 text-right font-medium">
                  {row.amount === null ? (
                    <span className="text-negative">keine Miete hinterlegt</span>
                  ) : (
                    formatEuro(row.amount)
                  )}
                </td>
                <td className="px-5 py-3">
                  {isPast ? (
                    <Badge>Fällig</Badge>
                  ) : (
                    <span className="text-muted">Künftig</span>
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
