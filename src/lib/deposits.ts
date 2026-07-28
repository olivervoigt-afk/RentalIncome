import type { Deposit } from "./types";

export type DepositSummary = {
  /** Summe aller eingegangenen Kautionen. */
  received: number;
  /** An den Mieter zurückgezahlt. */
  refunded: number;
  /** Einbehalten — steuerpflichtig im Jahr des Einbehalts. */
  retained: number;
  /** Was aktuell verwahrt wird: erhalten − zurückgezahlt − einbehalten. */
  held: number;
};

export function summarizeDeposits(deposits: Deposit[]): DepositSummary {
  const sum = (kind: Deposit["kind"]) =>
    deposits
      .filter((d) => d.kind === kind)
      .reduce((total, d) => total + Number(d.amount), 0);

  const received = sum("received");
  const refunded = sum("refunded");
  const retained = sum("retained");

  return { received, refunded, retained, held: received - refunded - retained };
}

/**
 * Steuerpflichtiger Kautionsanteil eines Jahres.
 *
 * Eine Kaution wird erst mit dem Einbehalt zur Einnahme. Einbehalte, die
 * gegen einen Mietrückstand verrechnet wurden, sind bereits als Zahlung
 * erfasst und bleiben hier deshalb außen vor — sonst zählte man doppelt.
 */
export function taxableRetentions(deposits: Deposit[]): Deposit[] {
  return deposits.filter((d) => d.kind === "retained" && !d.payment_id);
}
