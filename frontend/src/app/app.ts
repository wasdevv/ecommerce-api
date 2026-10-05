import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { phosphorPackage, phosphorShoppingBag, phosphorSignOut } from '@ng-icons/phosphor-icons/regular';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon],
  providers: [provideIcons({ phosphorPackage, phosphorShoppingBag, phosphorSignOut })],
  templateUrl: './app.html',
})
export class App {
  protected auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.auth.restore();
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
