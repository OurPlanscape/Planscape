import { TestBed } from '@angular/core/testing';

import { RedirectService } from './redirect.service';

describe('RedirectService', () => {
  let service: RedirectService;

  let store: any = {};
  const mockLocalStorage = {
    getItem: (key: string): string => {
      return key in store ? store[key] : null;
    },
    setItem: (key: string, value: string) => {
      store[key] = `${value}`;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RedirectService);
    spyOn(localStorage, 'getItem').and.callFake(mockLocalStorage.getItem);
    spyOn(localStorage, 'setItem').and.callFake(mockLocalStorage.setItem);
    spyOn(localStorage, 'removeItem').and.callFake(mockLocalStorage.removeItem);
    spyOn(localStorage, 'clear').and.callFake(mockLocalStorage.clear);
    mockLocalStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setRedirect', () => {
    it('should save the url', () => {
      const url = 'some-url/path/';
      service.setRedirect(url);
      const redirectData = service['getRedirectData']();
      expect(redirectData).not.toBeNull();
      expect(redirectData?.url).toEqual(url);
      expect(redirectData?.userHash).toBeNull();
    });

    it('should save the url and hash the email if provided', () => {
      const url = 'some-url/path/to/';
      const email = 'someone@sig.com';
      service.setRedirect(url, email);
      const redirectData = service['getRedirectData']();
      expect(redirectData).not.toBeNull();
      expect(redirectData?.url).toEqual(url);
      expect(redirectData?.userHash).not.toBeNull();
      expect(redirectData?.userHash).not.toEqual(email);
    });
  });

  describe('shouldRedirect', () => {
    it('it should not redirect if no url saved', () => {
      expect(service.shouldRedirect('someone@sig.com')).toEqual(false);
    });

    it('it should redirect if url is saved', () => {
      const url = 'some-url/path/';
      service.setRedirect(url);
      const redirect = service.shouldRedirect('someone@sig.com');
      expect(redirect).toEqual(url);
    });

    it('should not redirect if the emails mismatch', () => {
      const url = 'some-url/path/to/';
      const email = 'someone@sig.com';
      service.setRedirect(url, email);
      const redirect = service.shouldRedirect('someone-else@sig.com');
      expect(redirect).toEqual(false);
    });

    it('should not redirect if the emails match', () => {
      const url = 'some-url/path/to/';
      const email = 'someone@sig.com';
      service.setRedirect(url, email);
      const redirect = service.shouldRedirect('someone@sig.com');
      expect(redirect).toEqual(url);
    });
  });
});
