import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  // Both injected before the await: after it we're outside the injection context.
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restore();
  return auth.user() ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
