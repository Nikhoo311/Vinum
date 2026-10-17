import { UserWine } from '../models/wine.model';

/** Heure locale d'envoi des alertes de maturité. */
export const MATURITY_NOTIFICATION_HOUR = 10;

/** iOS plafonne à 64 notifications programmées ; on garde une marge. */
export const MAX_SCHEDULED_NOTIFICATIONS = 60;

export interface MaturityNotification {
  /** Identifiant numérique stable, dérivé de l'identifiant du vin. */
  id: number;
  wineId: string;
  wineName: string;
  vintage: number;
  at: Date;
}

/**
 * Date de l'alerte : le jour et le mois d'ajout du vin, dans l'année d'apogée
 * (ajouté le 03/10/2026, apogée 2028 → alerte le 03/10/2028).
 * Sans date d'ajout exploitable (anciennes fiches), l'alerte tombe le 1er janvier de l'année d'apogée.
 * Un ajout un 29 février est ramené au 28 les années non bissextiles.
 */
export function maturityDate(addedAt: string | undefined, peakYear: number): Date {
  const added = addedAt ? new Date(addedAt) : null;
  if (!added || Number.isNaN(added.getTime())) {
    return new Date(peakYear, 0, 1, MATURITY_NOTIFICATION_HOUR);
  }

  const month = added.getMonth();
  const date = new Date(peakYear, month, added.getDate(), MATURITY_NOTIFICATION_HOUR);
  if (date.getMonth() !== month) date.setDate(0); // 29 février → dernier jour de février
  return date;
}

/** Entier positif sur 31 bits, stable pour un même identifiant (exigé par les notifications locales). */
export function notificationIdFor(wineId: string): number {
  let hash = 0;
  for (let i = 0; i < wineId.length; i++) {
    hash = (Math.imul(hash, 31) + wineId.charCodeAt(i)) | 0;
  }
  return (hash & 0x7fffffff) || 1;
}

/**
 * Alertes à programmer : un vin qui a encore des bouteilles, une année d'apogée valide,
 * et une date d'alerte dans le futur. Les plus proches d'abord, plafonnées.
 */
export function planMaturityNotifications(wines: readonly UserWine[], now: Date): MaturityNotification[] {
  const planned: MaturityNotification[] = [];

  for (const wine of wines) {
    const peak = wine.peakMaturityYear;
    if (!wine.id || !Number.isInteger(peak) || (wine.placements?.length ?? 0) === 0) continue;

    const at = maturityDate(wine.addedAt, peak as number);
    if (at.getTime() <= now.getTime()) continue;

    planned.push({ id: notificationIdFor(wine.id), wineId: wine.id, wineName: wine.name, vintage: wine.vintage, at });
  }

  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED_NOTIFICATIONS);
}
