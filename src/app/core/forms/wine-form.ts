import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';

import { UserWine } from '../models/wine.model';
import { WineType } from '../types/WineType';
import { formatFoodPairing, isHalfStep, parseFoodPairing } from '../utils/wine.util';

/** Bornes de validation du formulaire d'un vin (alignées sur les règles Firestore). */
export const WINE_FORM_LIMITS = {
  textMax: 100,
  descriptionMax: 1000,
  foodPairingMax: 500,
  vintageMin: 1900,
} as const;

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** L'année d'apogée doit être postérieure au millésime. */
export function peakMaturityYearAfterVintage(control: AbstractControl): ValidationErrors | null {
  const vintage = control.parent?.get('vintage')?.value;
  if (isBlank(control.value) || isBlank(vintage)) return null;

  return Number(control.value) > Number(vintage) ? null : { peakMaturityYearBeforeVintage: true };
}

/** Une note est un multiple de 0,5. */
export function halfStepRating(control: AbstractControl): ValidationErrors | null {
  if (isBlank(control.value)) return null;
  return isHalfStep(Number(control.value)) ? null : { halfStepRating: true };
}

/** Construit le formulaire partagé par l'ajout et la modification d'un vin. */
export function createWineForm(fb: FormBuilder) {
  const currentYear = new Date().getFullYear();

  return fb.group({
    type: [WineType.RED as WineType, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(WINE_FORM_LIMITS.textMax)]],
    domain: ['', [Validators.required, Validators.maxLength(WINE_FORM_LIMITS.textMax)]],
    vintage: [
      currentYear as number | null,
      [Validators.required, Validators.min(WINE_FORM_LIMITS.vintageMin), Validators.max(currentYear)],
    ],
    peakMaturityYear: [null as number | null, [Validators.pattern(/^\d{4}$/), peakMaturityYearAfterVintage]],
    region: ['', [Validators.required, Validators.maxLength(WINE_FORM_LIMITS.textMax)]],
    grapeVariety: ['', [Validators.required, Validators.maxLength(WINE_FORM_LIMITS.textMax)]],
    unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    rating: [null as number | null, [Validators.min(0), Validators.max(5), halfStepRating]],
    description: ['', Validators.maxLength(WINE_FORM_LIMITS.descriptionMax)],
    foodPairing: ['', Validators.maxLength(WINE_FORM_LIMITS.foodPairingMax)],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });
}

export type WineForm = ReturnType<typeof createWineForm>;
export type WineFormValue = ReturnType<WineForm['getRawValue']>;

/** Informations d'un vin saisies dans le formulaire (hors propriétaire et emplacements). */
export type WineDetails = Pick<
  UserWine,
  'type' | 'name' | 'domain' | 'region' | 'vintage' | 'grapeVariety' | 'unitPrice' | 'description' | 'foodPairing'
> &
  Partial<Pick<UserWine, 'rating' | 'peakMaturityYear'>>;

/** Convertit les valeurs brutes du formulaire en informations de vin propres et typées. */
export function wineDetailsFromForm(value: WineFormValue): WineDetails {
  const details: WineDetails = {
    type: value.type ?? WineType.RED,
    name: (value.name ?? '').trim(),
    domain: (value.domain ?? '').trim(),
    region: (value.region ?? '').trim(),
    vintage: Number(value.vintage),
    grapeVariety: (value.grapeVariety ?? '').trim(),
    unitPrice: Number(value.unitPrice),
    description: (value.description ?? '').trim(),
    foodPairing: parseFoodPairing(value.foodPairing),
  };

  // Un champ vidé après saisie vaut '' : il ne doit pas devenir une note ou une année à 0.
  if (!isBlank(value.rating)) details.rating = Number(value.rating);
  if (!isBlank(value.peakMaturityYear)) details.peakMaturityYear = Number(value.peakMaturityYear);

  return details;
}

/** Valeurs initiales du formulaire pour un nouveau vin. */
export function emptyWineFormValue(defaultFoodPairing: string): WineFormValue {
  return {
    type: WineType.RED,
    name: '',
    domain: '',
    vintage: new Date().getFullYear(),
    peakMaturityYear: null,
    region: '',
    grapeVariety: '',
    unitPrice: null,
    rating: null,
    description: '',
    foodPairing: defaultFoodPairing,
    quantity: 1,
  };
}

/** Valeurs du formulaire pré-remplies avec un vin existant. */
export function wineFormValueFrom(wine: UserWine): WineFormValue {
  return {
    type: wine.type,
    name: wine.name,
    domain: wine.domain,
    vintage: wine.vintage,
    peakMaturityYear: wine.peakMaturityYear ?? null,
    region: wine.region,
    grapeVariety: wine.grapeVariety ?? '',
    unitPrice: wine.unitPrice,
    rating: wine.rating ?? null,
    description: wine.description ?? '',
    foodPairing: formatFoodPairing(wine.foodPairing),
    quantity: wine.placements.length,
  };
}
