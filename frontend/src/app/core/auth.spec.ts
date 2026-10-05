import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { customer, setup, visit } from '../../testing/setup';
import { AuthService } from './auth.service';
import { Session } from './session';

describe('auth', () => {
  it('sends the token and asks for JSON on every API call', async () => {
    const { http } = setup();
    TestBed.inject(Session).set('jwt-token');

    const done = firstValueFrom(TestBed.inject(HttpClient).get('/api/v1/cart'));
    const req = http.expectOne('/api/v1/cart');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush({});
    await done;
  });

  it('drops the session when the API refuses the token (expired or revoked)', async () => {
    const { http } = setup();
    const auth = TestBed.inject(AuthService);
    TestBed.inject(Session).set('old-token');
    auth.user.set(customer);

    const done = firstValueFrom(TestBed.inject(HttpClient).get('/api/v1/cart')).catch(() => 'rejected');
    http.expectOne('/api/v1/cart').flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(await done).toBe('rejected');
    expect(localStorage.getItem('token')).toBeNull();
    TestBed.tick();
    expect(auth.user()).toBeNull();
  });

  it('a 401 on login (wrong password) does not touch a session that does not exist', async () => {
    const { http } = setup();
    const login = TestBed.inject(AuthService).login('a@b.c', 'nope').catch((e) => e.status);
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ message: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });
    expect(await login).toBe(401);
  });

  it('login stores only the token; the user comes from the response', async () => {
    const { http } = setup();
    const auth = TestBed.inject(AuthService);
    const login = auth.login('rafa@example.com', 'secret-123');
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.body).toEqual({ email: 'rafa@example.com', password: 'secret-123' });
    req.flush({ data: { token: 'new-jwt', user: customer } });
    await login;

    expect(localStorage.getItem('token')).toBe('new-jwt');
    expect(localStorage.getItem('user')).toBeNull();
    expect(auth.user()).toEqual(customer);
  });

  it('restores the user from /auth/me on boot, and forgets a token the API rejects', async () => {
    const { http } = setup();
    localStorage.setItem('token', 'stale');
    TestBed.inject(Session).set('stale');
    const auth = TestBed.inject(AuthService);

    const restore = auth.restore();
    http.expectOne('/api/v1/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await restore;

    expect(auth.ready()).toBeTrue();
    expect(auth.user()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('logout clears locally even if the server call fails', async () => {
    const { http } = setup();
    const auth = TestBed.inject(AuthService);
    TestBed.inject(Session).set('jwt');
    auth.user.set(customer);

    const out = auth.logout();
    http.expectOne('/api/v1/auth/logout').error(new ProgressEvent('offline'));
    await out;

    expect(auth.user()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('the guard sends anonymous users to login, remembering where they were going', async () => {
    const { router } = setup();
    TestBed.inject(AuthService).ready.set(true);

    await visit('/orders/42');

    expect(router.url).toBe('/login?returnUrl=%2Forders%2F42');
  });
});
