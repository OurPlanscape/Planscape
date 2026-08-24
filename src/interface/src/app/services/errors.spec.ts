import { HttpErrorResponse } from '@angular/common/http';
import { getFieldError } from './errors';

describe('getFieldError', () => {
  function httpError(body: unknown) {
    return new HttpErrorResponse({ status: 400, error: body });
  }

  it('returns the first message for the field', () => {
    const error = httpError({
      detail: 'Validation error.',
      errors: { name: ['A workspace with this name already exists.'] },
    });

    expect(getFieldError(error, 'name')).toBe(
      'A workspace with this name already exists.'
    );
  });

  it('accepts a bare string instead of a list', () => {
    const error = httpError({ errors: { name: 'Too long.' } });

    expect(getFieldError(error, 'name')).toBe('Too long.');
  });

  it('returns null for a different field', () => {
    const error = httpError({ errors: { geometry: ['Invalid.'] } });

    expect(getFieldError(error, 'name')).toBeNull();
  });

  it('returns null when there are no errors', () => {
    expect(
      getFieldError(httpError({ detail: 'Server error.' }), 'name')
    ).toBeNull();
  });

  it('returns null for a non-http error', () => {
    expect(getFieldError(new Error('nope'), 'name')).toBeNull();
  });

  it('returns null for null and undefined', () => {
    expect(getFieldError(null, 'name')).toBeNull();
    expect(getFieldError(undefined, 'name')).toBeNull();
  });

  it('returns null when the message list is empty or not strings', () => {
    expect(
      getFieldError(httpError({ errors: { name: [] } }), 'name')
    ).toBeNull();
    expect(
      getFieldError(httpError({ errors: { name: [42] } }), 'name')
    ).toBeNull();
  });
});
