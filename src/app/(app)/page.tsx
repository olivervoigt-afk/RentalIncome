import Link from "next/link";
import ArchiveToggle from "@/components/archive-toggle";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { formatters, type Formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import {
  getPropertiesWithSummary,
  getRecentActivity,
  type ActivityEntry,
  type PropertyWithSummary,
} from "@/lib/queries";
import { fill, plural, type Dict } from "@/lib/i18n/dictionaries";

export const metadata = { title: "Dashboard" };

/** Vorwarnzeit, ab der ein auslaufender Vertrag Aufmerksamkeit verdient. */
const ENDING_SOON_DAYS = 90;

/** Rundungsreste sollen kein Objekt in den Rückstand schreiben. */
const CENT = 0.005;

type Totals = {
  due: number;
  received: number;
  credits: number;
  balance: number;
  /** Verwahrte Kautionen — bewusst außerhalb des Saldos. */
  deposit: number;
};

function sum(list: PropertyWithSummary[]): Totals {
  return list.reduce(
    (acc, p) => ({
      due: acc.due + p.summary.totalDue,
      received: acc.received + p.summary.totalReceived,
      credits: acc.credits + p.summary.totalCredits,
      balance: acc.balance + p.summary.balance,
      deposit: acc.deposit + p.deposit.held,
    }),
    { due: 0, received: 0, credits: 0, balance: 0, deposit: 0 },
  );
}

/** Verbleibende Tage bis zum Vertragsende. */
function daysUntil(end: Date, now: Date): number {
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

const VIEWS = ["faellig", "rueckstand", "kaution", "ende"] as const;
type View = (typeof VIEWS)[number];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ archiv?: string; blick?: string }>;
}) {
  const { archiv, blick } = await searchParams;
  const showArchived = archiv === "1";

  const [profile, all, activity, { t, locale }] = await Promise.all([
    getProfile(),
    getPropertiesWithSummary(),
    getRecentActivity(),
    getDict(),
  ]);
  const f = formatters(locale);
  const NO_LOCATION = t.dashboard.noLocation;

  const canEdit = profile?.role !== "viewer";
  const now = new Date();
  const year = now.getFullYear();

  const hidden = all.filter((p) => p.archived || p.summary.expired);
  const active = showArchived ? all : all.filter((p) => !p.archived && !p.summary.expired);

  /* Kennzahlen beziehen sich immer auf die aktiven Objekte — ein Rückstand
   * auf einem beendeten Vertrag ist kein Handlungsbedarf mehr. */
  const inArrears = active.filter((p) => p.summary.balance < -CENT);
  const withDeposit = active.filter((p) => p.deposit.held > 0);
  const endingSoon = active.filter((p) => {
    const days = daysUntil(p.summary.contractEnd, now);
    return days > 0 && days <= ENDING_SOON_DAYS;
  });
  const incomeThisYear = active.reduce((total, p) => total + p.receivedThisYear, 0);
  const dueSoonList = active.filter((p) => p.dueSoon > 0);
  const dueSoonTotal = dueSoonList.reduce((total, p) => total + p.dueSoon, 0);
  const dueSoonArrears = dueSoonList.filter((p) => p.summary.balance < -CENT).length;
  const annualRentTotal = active.reduce((total, p) => total + p.annualRent, 0);

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  // Die Kacheln beschreiben immer den vollen aktiven Bestand, auch während
  // ein Filter läuft — sonst zeigte die Kachel ihre eigene Auswahl an.
  const activeTotals = sum(active);
  const arrearsTotal = sum(inArrears).balance;

  const view: View | null = VIEWS.includes(blick as View) ? (blick as View) : null;
  const filtered =
    view === "faellig"
      ? dueSoonList
      : view === "rueckstand"
      ? inArrears
      : view === "kaution"
        ? withDeposit
        : view === "ende"
          ? endingSoon
          : active;

  const rows = filtered;
  const totals = sum(rows);
  const hiddenTotals = showArchived || view ? null : sum(hidden);

  // Gruppierung nach Standort; Objekte ohne Standort stehen am Ende.
  const groups = new Map<string, PropertyWithSummary[]>();
  for (const property of rows) {
    const key = property.location ?? NO_LOCATION;
    groups.set(key, [...(groups.get(key) ?? []), property]);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === NO_LOCATION) return 1;
    if (b === NO_LOCATION) return -1;
    return a.localeCompare(b, "de");
  });

  const columnCount = canEdit ? 7 : 6;

  const viewLabel =
    view === "faellig"
      ? t.dashboard.dueSoon
      : view === "rueckstand"
      ? t.dashboard.arrears
      : view === "kaution"
        ? t.dashboard.depositsHeld
        : view === "ende"
          ? t.dashboard.endingSoon
          : "";

  const withArchive = (query: string) =>
    showArchived ? `${query}${query.includes("?") ? "&" : "?"}archiv=1` : query;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {plural(t.dashboard.countProperties, active.length)}
            {orderedGroups.length > 1 &&
              fill(t.dashboard.inLocations, { n: orderedGroups.length })}
            {hidden.length > 0 &&
              !showArchived &&
              fill(t.dashboard.hiddenCount, { n: hidden.length })}
          </p>
        </div>
        {canEdit && <ButtonLink href="/objekte/neu">{t.dashboard.newProperty}</ButtonLink>}
      </div>

      {/* Was heute Aufmerksamkeit verdient — jede Kachel filtert die Tabelle.
          Kumulierte Lebenssummen standen hier früher, beantworteten aber
          keine Frage, die man beim Öffnen hat. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t.dashboard.dueSoon}
          value={f.euro(dueSoonTotal)}
          hint={
            dueSoonList.length > 0
              ? fill(t.dashboard.dueSoonHint, { date: f.date(horizon) }) +
                (dueSoonArrears > 0
                  ? fill(t.dashboard.dueSoonArrears, { n: dueSoonArrears })
                  : "")
              : t.dashboard.dueSoonNone
          }
          href={dueSoonList.length > 0 ? withArchive("/?blick=faellig") : undefined}
          active={view === "faellig"}
        />
        <StatCard
          label={t.dashboard.arrears}
          value={f.euro(arrearsTotal)}
          hint={
            inArrears.length > 0
              ? plural(t.dashboard.countProperties, inArrears.length)
              : t.dashboard.arrearsNone
          }
          tone={inArrears.length > 0 ? "negative" : undefined}
          href={inArrears.length > 0 ? withArchive("/?blick=rueckstand") : undefined}
          active={view === "rueckstand"}
        />
        <StatCard
          label={fill(t.dashboard.incomeYear, { year })}
          value={f.euro(incomeThisYear)}
          hint={t.dashboard.incomeYearHint}
          href="/auswertungen"
        />

        <StatCard
          label={t.dashboard.depositsHeld}
          value={f.euro(activeTotals.deposit)}
          hint={t.dashboard.depositsHint}
          href={withDeposit.length > 0 ? withArchive("/?blick=kaution") : undefined}
          active={view === "kaution"}
        />
        <StatCard
          label={t.dashboard.annualRent}
          value={f.euro(annualRentTotal)}
          hint={t.dashboard.annualRentHint}
        />
        <StatCard
          label={t.dashboard.endingSoon}
          value={String(endingSoon.length)}
          hint={
            endingSoon.length > 0 ? t.dashboard.endingSoonHint : t.dashboard.endingSoonNone
          }
          tone={endingSoon.length > 0 ? "negative" : undefined}
          href={endingSoon.length > 0 ? withArchive("/?blick=ende") : undefined}
          active={view === "ende"}
        />
      </div>

      <ActivityCard t={t} f={f} entries={activity} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">
            {t.dashboard.overview}
            {view && (
              <span className="ml-2 text-sm font-normal text-muted">
                {fill(t.dashboard.filtered, { label: viewLabel })}
              </span>
            )}
          </h2>
          {view ? (
            <Link
              href={withArchive("/")}
              className="text-sm text-accent hover:underline"
            >
              {t.dashboard.showAll}
            </Link>
          ) : (
            <ArchiveToggle active={showArchived} count={hidden.length} />
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? t.dashboard.emptyTitle : t.dashboard.emptyNoActive}
            description={
              all.length === 0 ? t.dashboard.emptyHint : t.dashboard.emptyArchivedHint
            }
            action={
              canEdit && all.length === 0 ? (
                <ButtonLink href="/objekte/neu">{t.dashboard.newProperty}</ButtonLink>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="w-[34%] min-w-[260px] px-5 py-3 font-medium">
                    {t.dashboard.property}
                  </th>
                  <th className="px-5 py-3 text-right font-medium">{t.dashboard.dueSoFar}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.dashboard.received}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.dashboard.balance}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.deposits.title}</th>
                  <th className="px-5 py-3 font-medium">{t.dashboard.contractEnd}</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>

              {orderedGroups.map(([location, items]) => {
                const groupTotals = sum(items);

                return (
                  <tbody key={location}>
                    <tr className="border-y-2 border-border bg-surface-muted">
                      <th
                        scope="colgroup"
                        colSpan={columnCount}
                        className="border-l-4 border-accent px-5 py-3 text-left"
                      >
                        <span className="text-lg font-bold tracking-tight">{location}</span>
                        <span className="ml-3 text-sm font-normal text-muted">
                          {plural(t.dashboard.countProperties, items.length)}
                        </span>
                      </th>
                    </tr>

                    {items.map((p) => {
                      const days = daysUntil(p.summary.contractEnd, now);
                      const soon = days > 0 && days <= ENDING_SOON_DAYS;

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border/60 hover:bg-surface-muted/40"
                        >
                          <td className="px-5 py-3 align-top">
                            <Link
                              href={`/objekte/${p.id}`}
                              className="font-medium text-balance hover:text-accent hover:underline"
                            >
                              {p.name}
                            </Link>
                            {p.tenant_name && (
                              <span className="block text-xs text-muted">{p.tenant_name}</span>
                            )}
                            {/* Kennzeichen am Namen statt in eigenen Spalten —
                                sie sind selten und kosten sonst volle Breite. */}
                            <div className="mt-0.5 flex flex-wrap gap-1.5">
                              {p.ta24 && <Badge tone="accent">TA24</Badge>}
                              {p.archived && <Badge>{t.dashboard.archived}</Badge>}
                              {!p.archived && p.summary.expired && (
                                <Badge>{t.dashboard.expired}</Badge>
                              )}
                              {p.summary.hasMissingRates && (
                                <Badge tone="negative">{t.dashboard.missingRate}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="tabular px-5 py-3 text-right">
                            {f.euro(p.summary.totalDue)}
                          </td>
                          <td className="tabular px-5 py-3 text-right">
                            {f.euro(p.summary.totalReceived)}
                            {p.summary.totalCredits > 0 && (
                              <span className="block text-xs text-muted">
                                {fill(t.dashboard.creditSuffix, {
                                  amount: f.euro(p.summary.totalCredits),
                                })}
                              </span>
                            )}
                          </td>
                          <td
                            className={`tabular px-5 py-3 text-right font-medium ${
                              p.summary.balance < -CENT ? "text-negative" : "text-positive"
                            }`}
                          >
                            {f.euro(p.summary.balance)}
                          </td>
                          <td className="tabular px-5 py-3 text-right text-muted">
                            {p.deposit.held > 0 ? f.euro(p.deposit.held) : t.common.none}
                          </td>
                          {/* Vertragsende und Restlaufzeit sagten dasselbe
                              zweimal; die Restlaufzeit steht jetzt darunter. */}
                          <td className="px-5 py-3">
                            <span className={soon ? "font-medium text-negative" : "text-muted"}>
                              {f.date(p.summary.contractEnd)}
                            </span>
                            {p.summary.remainingMonths > 0 && (
                              <span className="block text-xs text-muted">
                                {fill(t.dashboard.months, { n: p.summary.remainingMonths })}
                              </span>
                            )}
                          </td>
                          {canEdit && (
                            <td className="px-5 py-3 text-right">
                              <Link
                                href={`/objekte/${p.id}?tab=zahlungen`}
                                className="whitespace-nowrap text-sm text-accent hover:underline"
                              >
                                {t.dashboard.addPayment}
                              </Link>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {orderedGroups.length > 1 && (
                      <tr className="border-b border-border text-muted">
                        <td className="px-5 py-2 text-right text-xs uppercase tracking-wide">
                          {fill(t.dashboard.sumOf, { location })}
                        </td>
                        <td className="tabular px-5 py-2 text-right">
                          {f.euro(groupTotals.due)}
                        </td>
                        <td className="tabular px-5 py-2 text-right">
                          {f.euro(groupTotals.received)}
                        </td>
                        <td />
                        <td className="tabular px-5 py-2 text-right">
                          {groupTotals.deposit > 0 ? f.euro(groupTotals.deposit) : ""}
                        </td>
                        <td colSpan={canEdit ? 2 : 1} />
                      </tr>
                    )}
                  </tbody>
                );
              })}

              <tfoot>
                <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                  <td className="px-5 py-3">{t.dashboard.total}</td>
                  <td className="tabular px-5 py-3 text-right">{f.euro(totals.due)}</td>
                  <td className="tabular px-5 py-3 text-right">{f.euro(totals.received)}</td>
                  <td
                    className={`tabular px-5 py-3 text-right ${
                      totals.balance < -CENT ? "text-negative" : "text-positive"
                    }`}
                  >
                    {f.euro(totals.balance)}
                  </td>
                  <td className="tabular px-5 py-3 text-right">{f.euro(totals.deposit)}</td>
                  <td colSpan={canEdit ? 2 : 1} />
                </tr>

                {hiddenTotals && hidden.length > 0 && (
                  <>
                    <tr className="text-muted">
                      <td className="px-5 py-2">
                        {plural(t.dashboard.plusHidden, hidden.length)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(hiddenTotals.due)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(hiddenTotals.received)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(hiddenTotals.balance)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(hiddenTotals.deposit)}
                      </td>
                      <td colSpan={canEdit ? 2 : 1} />
                    </tr>
                    <tr className="border-t border-border font-medium">
                      <td className="px-5 py-2">{t.dashboard.allProperties}</td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(totals.due + hiddenTotals.due)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(totals.received + hiddenTotals.received)}
                      </td>
                      <td
                        className={`tabular px-5 py-2 text-right ${
                          totals.balance + hiddenTotals.balance < -CENT
                            ? "text-negative"
                            : "text-positive"
                        }`}
                      >
                        {f.euro(totals.balance + hiddenTotals.balance)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(totals.deposit + hiddenTotals.deposit)}
                      </td>
                      <td colSpan={canEdit ? 2 : 1} />
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  href,
  active,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
  /** Macht die Kachel zum Filter bzw. zur Verknüpfung. */
  href?: string;
  active?: boolean;
}) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`tabular mt-1 text-2xl font-semibold ${
          tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );

  if (!href) return <Card className="px-5 py-4">{body}</Card>;

  return (
    <Card
      className={`transition-colors hover:border-accent/60 ${
        active ? "border-accent ring-1 ring-accent/30" : ""
      }`}
    >
      <Link href={href} className="block px-5 py-4">
        {body}
      </Link>
    </Card>
  );
}

/**
 * Was zuletzt eingetragen wurde. Beantwortet die Frage "was hat sich seit
 * meinem letzten Besuch getan" — die einzige, die aus den Zahlen allein
 * nicht hervorgeht.
 */
function ActivityCard({
  t,
  f,
  entries,
}: {
  t: Dict;
  f: Formatters;
  entries: ActivityEntry[];
}) {
  const kindLabel: Record<ActivityEntry["kind"], string> = {
    payment: t.dashboard.kindPayment,
    credit: t.dashboard.kindCredit,
    deposit: t.dashboard.kindDeposit,
  };

  return (
    <Card>
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold">{t.dashboard.activity}</h2>
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted">
          {t.dashboard.activityEmpty}
        </p>
      ) : (
        <ul className="grid gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/objekte/${entry.propertyId}`}
                  className="truncate font-medium hover:text-accent hover:underline"
                >
                  {entry.propertyName}
                </Link>
                <span className="tabular whitespace-nowrap font-medium">
                  {f.euro(entry.amount)}
                </span>
              </div>
              <p className="text-xs text-muted">
                {kindLabel[entry.kind]} · {f.date(entry.happenedOn)}
                {entry.by && ` · ${fill(t.dashboard.activityBy, { name: entry.by })}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
