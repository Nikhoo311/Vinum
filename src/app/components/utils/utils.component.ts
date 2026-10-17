import { Component, Input } from '@angular/core';

import { AuthTypeEnum } from '../../core/types/AuthTypeEnum';
import { LoginFormComponent } from '../login-form/login-form.component';
import { RegisterFormComponent } from '../register-form/register-form.component';

/** Affiche le formulaire de connexion ou d'inscription selon le mode courant. */
@Component({
  selector: 'app-utils',
  standalone: true,
  imports: [LoginFormComponent, RegisterFormComponent],
  templateUrl: './utils.component.html',
})
export class UtilsComponent {
  @Input() mode: AuthTypeEnum = AuthTypeEnum.LOGIN;

  readonly AuthTypeEnum = AuthTypeEnum;
}
