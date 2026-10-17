import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  addOutline,
  checkmarkCircle,
  checkmarkOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  createOutline,
  eyeOffOutline,
  eyeOutline,
  gridOutline,
  informationCircleOutline,
  libraryOutline,
  listOutline,
  lockClosedOutline,
  logOutOutline,
  mailOutline,
  pencilOutline,
  personOutline,
  podiumOutline,
  removeOutline,
  saveOutline,
  settingsOutline,
  star,
  starHalf,
  starOutline,
  trashOutline,
  wineOutline,
} from 'ionicons/icons';

/**
 * Icônes utilisées par nom dans les gabarits (`<ion-icon name="…">`).
 *
 * Elles sont embarquées dans le bundle plutôt que téléchargées depuis `assets/svg` :
 * affichage immédiat, hors ligne, et seulement les ~30 icônes réellement utilisées.
 * Toute nouvelle icône référencée par son nom doit être ajoutée ici
 * (`npm run check:icons` le vérifie).
 */
export const APP_ICONS: Readonly<Record<string, string>> = {
  'add-circle-outline': addCircleOutline,
  'add-outline': addOutline,
  'checkmark-circle': checkmarkCircle,
  'checkmark-outline': checkmarkOutline,
  'chevron-back-outline': chevronBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'close-outline': closeOutline,
  'create-outline': createOutline,
  'eye-off-outline': eyeOffOutline,
  'eye-outline': eyeOutline,
  'grid-outline': gridOutline,
  'information-circle-outline': informationCircleOutline,
  'library-outline': libraryOutline,
  'list-outline': listOutline,
  'lock-closed-outline': lockClosedOutline,
  'log-out-outline': logOutOutline,
  'mail-outline': mailOutline,
  'pencil-outline': pencilOutline,
  'person-outline': personOutline,
  'podium-outline': podiumOutline,
  'remove-outline': removeOutline,
  'save-outline': saveOutline,
  'settings-outline': settingsOutline,
  star,
  'star-half': starHalf,
  'star-outline': starOutline,
  'trash-outline': trashOutline,
  'wine-outline': wineOutline,
};

export function registerIcons(): void {
  addIcons({ ...APP_ICONS });
}
