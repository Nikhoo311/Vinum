import { addIcons } from 'ionicons';
import {
  add,
  addCircleOutline,
  addOutline,
  checkmarkCircle,
  checkmarkOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  closeOutline,
  createOutline,
  eyeOffOutline,
  eyeOutline,
  gridOutline,
  hourglassOutline,
  informationCircleOutline,
  layersOutline,
  libraryOutline,
  listOutline,
  lockClosedOutline,
  logOutOutline,
  mailOutline,
  optionsOutline,
  paperPlaneOutline,
  pencilOutline,
  personOutline,
  podiumOutline,
  pricetagOutline,
  removeOutline,
  saveOutline,
  scaleOutline,
  settingsOutline,
  star,
  starHalf,
  starOutline,
  timeOutline,
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
  add,
  'add-circle-outline': addCircleOutline,
  'add-outline': addOutline,
  'checkmark-circle': checkmarkCircle,
  'checkmark-outline': checkmarkOutline,
  'chevron-back-outline': chevronBackOutline,
  'chevron-down-outline': chevronDownOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'close-outline': closeOutline,
  'create-outline': createOutline,
  'eye-off-outline': eyeOffOutline,
  'eye-outline': eyeOutline,
  'grid-outline': gridOutline,
  'hourglass-outline': hourglassOutline,
  'information-circle-outline': informationCircleOutline,
  'layers-outline': layersOutline,
  'library-outline': libraryOutline,
  'list-outline': listOutline,
  'lock-closed-outline': lockClosedOutline,
  'log-out-outline': logOutOutline,
  'mail-outline': mailOutline,
  'options-outline': optionsOutline,
  'paper-plane-outline': paperPlaneOutline,
  'pencil-outline': pencilOutline,
  'person-outline': personOutline,
  'podium-outline': podiumOutline,
  'pricetag-outline': pricetagOutline,
  'remove-outline': removeOutline,
  'save-outline': saveOutline,
  'scale-outline': scaleOutline,
  'settings-outline': settingsOutline,
  star,
  'star-half': starHalf,
  'star-outline': starOutline,
  'time-outline': timeOutline,
  'trash-outline': trashOutline,
  'wine-outline': wineOutline,
};

export function registerIcons(): void {
  addIcons({ ...APP_ICONS });
}
