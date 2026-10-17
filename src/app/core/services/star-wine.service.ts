import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { UserWine } from '../models/wine.model';
import { RankedWine, StarWineCriterion, StarWineResult, resolveStarWine } from '../utils/star-wine.util';
import { CaveService } from './cave.service';
import { PreferencesService } from './preferences.service';

const SEEN_KEY = 'star-wine-settings-seen';

/** Clé de traduction d'un critère : `best-rated` → `BEST_RATED`. */
export function starWineKey(criterion: StarWineCriterion): string {
  return criterion.toUpperCase().replace(/-/g, '_');
}

/**
 * Vin star du tableau de bord : le vin que le critère choisi par l'utilisateur place en tête.
 * Le critère est une préférence de l'appareil (voir {@link PreferencesService}).
 */
@Injectable({ providedIn: 'root' })
export class StarWineService {
  private readonly prefs = inject(PreferencesService);
  private readonly caveService = inject(CaveService);
  private readonly transloco = inject(TranslocoService);

  private cache: { wines: readonly UserWine[]; criterion: StarWineCriterion; result: StarWineResult } | null = null;
  private readonly numberFormats = new Map<string, Intl.NumberFormat>();

  /** Critère choisi par l'utilisateur. */
  get criterion(): StarWineCriterion {
    return this.prefs.current.starWineCriterion;
  }

  /** Classement courant, mémorisé tant que la cave et le critère ne changent pas. */
  get result(): StarWineResult {
    const wines = this.caveService.cave;
    const criterion = this.criterion;
    if (!this.cache || this.cache.wines !== wines || this.cache.criterion !== criterion) {
      this.cache = { wines, criterion, result: resolveStarWine(wines, criterion) };
    }
    return this.cache.result;
  }

  get star(): UserWine | null {
    return this.result.ranking[0]?.wine ?? null;
  }

  setCriterion(criterion: StarWineCriterion): Promise<void> {
    return this.prefs.setStarWineCriterion(criterion);
  }

  /** Nom du critère, dans la langue courante. */
  criterionLabel(criterion: StarWineCriterion): string {
    return this.transloco.translate(`STAR_WINE.CRITERIA.${starWineKey(criterion)}.TITLE`);
  }

  /** Valeur qui a fait gagner (ou classé) un vin, prête à afficher : « 32 € / bouteille », « ★ 4,8 / 5 »… */
  describe(entry: RankedWine, criterion: StarWineCriterion): string {
    const { wine } = entry;
    const lang = this.transloco.getActiveLang();
    const price = this.money(wine.unitPrice, lang);

    return this.transloco.translate(`STAR_WINE.METRIC.${starWineKey(criterion)}`, {
      price,
      value: this.money(wine.unitPrice * (wine.placements?.length ?? 0), lang),
      vintage: wine.vintage,
      rating: this.number(wine.rating ?? 0, lang, 1),
      count: wine.placements?.length ?? 0,
      date: wine.addedAt ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(wine.addedAt)) : '',
    });
  }

  // ── Pastille « Nouveau » ──────────────────────────────────

  /** Vrai tant que l'utilisateur n'a pas ouvert l'écran de réglage du vin star. */
  get isNew(): boolean {
    try {
      return localStorage.getItem(SEEN_KEY) !== 'true';
    } catch {
      return false;
    }
  }

  markSeen(): void {
    try {
      localStorage.setItem(SEEN_KEY, 'true');
    } catch {
      // Stockage indisponible : la pastille réapparaîtra, sans gravité.
    }
  }

  // ── Internes ──────────────────────────────────────────────

  private number(value: number, lang: string, fractionDigits: number): string {
    const key = `n|${lang}|${fractionDigits}`;
    let format = this.numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(lang, { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits });
      this.numberFormats.set(key, format);
    }
    return format.format(value);
  }

  private money(value: number, lang: string): string {
    const key = `€|${lang}`;
    let format = this.numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
      this.numberFormats.set(key, format);
    }
    return format.format(Number.isFinite(value) ? value : 0);
  }
}
