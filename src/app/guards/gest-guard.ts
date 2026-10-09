import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    if (await this.auth.waitUntilReady()) {
      this.router.navigate(['/home']);
      return false;
    }
    return true;
  }
}