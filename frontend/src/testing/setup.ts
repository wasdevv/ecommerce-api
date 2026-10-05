import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app/app.routes';
import { authInterceptor } from '../app/core/auth.interceptor';
import { AuthService } from '../app/core/auth.service';
import { User } from '../app/core/models';

export const customer: User = { id: 7, name: 'Rafaela Moura', email: 'rafa@example.com', role: 'customer' };

/** Real router, real interceptor, real components; only the network is a fake (HttpTestingController). */
export function setup(providers: unknown[] = []) {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      ...(providers as never[]),
    ],
  });
  return { http: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
}

/** Pretend the user already signed in, without a /auth/me round trip. */
export function signIn(user: User = customer): void {
  localStorage.setItem('token', 'jwt-token');
  const auth = TestBed.inject(AuthService);
  auth.user.set(user);
  auth.ready.set(true);
  (auth as unknown as { restoring: Promise<void> }).restoring = Promise.resolve(); // as after a real login
}

/** Navigate through the real router and let signals, resources and change detection settle. */
export async function visit(url: string): Promise<{ harness: RouterTestingHarness; el: HTMLElement }> {
  const harness = await RouterTestingHarness.create();
  // Not harness.navigateByUrl: it waits for stability, and a pending httpResource request is
  // never stable until the test flushes it.
  void TestBed.inject(Router).navigateByUrl(url);
  await settle(harness);
  return { harness, el: harness.fixture.nativeElement as HTMLElement };
}

// Captured before any test installs jasmine.clock(), so settling still yields to real macrotasks.
const realTimeout = window.setTimeout.bind(window);

/** Let router promises, effects, resources and change detection run, without waiting on open requests. */
export async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let i = 0; i < 10; i++) { // lazy routes resolve over several macrotasks
    await new Promise((r) => realTimeout(r));
    TestBed.tick();
    harness.detectChanges();
  }
}

export const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
export const byText = (root: HTMLElement, selector: string, content: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(selector)).find((e) => text(e).includes(content)) ?? null;
