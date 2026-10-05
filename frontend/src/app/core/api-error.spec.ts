import { HttpErrorResponse } from '@angular/common/http';
import { fieldError, generalError, toApiError } from './api-error';

describe('toApiError', () => {
  it('keeps the business rule code and details', () => {
    const e = toApiError(new HttpErrorResponse({ status: 422, error: { message: 'No stock', code: 'insufficient_stock', details: { items: [] } } }));
    expect(e).toEqual(jasmine.objectContaining({ status: 422, message: 'No stock', code: 'insufficient_stock', errors: {} }));
    expect(generalError(e)).toBe(e);
  });

  it('exposes validation errors per field and hides the general banner', () => {
    const e = toApiError(new HttpErrorResponse({ status: 422, error: { message: 'Invalid', errors: { email: ['Taken.'] } } }));
    expect(fieldError(e, 'email')).toBe('Taken.');
    expect(fieldError(e, 'name')).toBeNull();
    expect(generalError(e)).toBeNull();
  });

  it('says the server is unreachable on a network failure', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).message).toContain('Could not reach the server');
  });
});
