import { TestBed } from '@angular/core/testing';
import {
  BaseLocalStorageService,
  ExploreStorageService,
  HomeParametersStorageService,
  LoginRedirectStorageService,
  MultiMapsStorageService,
} from './local-storage.service';

interface TestData {
  key1: string;
  key2: number;
}

// A test class that extends BaseStorageService
class TestStorageService extends BaseLocalStorageService<TestData> {
  constructor() {
    super('testKey');
  }
}

class ExpiringStorageService extends BaseLocalStorageService<TestData> {
  constructor() {
    super('expiringTestKey', { maxAgeMs: 1000 });
  }
}

class ValidatingStorageService extends BaseLocalStorageService<TestData> {
  constructor() {
    super('validatingTestKey');
  }

  protected override isValidValue(value: unknown): value is TestData {
    return (
      typeof value === 'object' &&
      value !== null &&
      'key1' in value &&
      'key2' in value &&
      typeof value.key1 === 'string' &&
      typeof value.key2 === 'number'
    );
  }
}

describe('BaseStorageService', () => {
  let service: TestStorageService;
  let expiringService: ExpiringStorageService;
  let validatingService: ValidatingStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new TestStorageService();
    expiringService = new ExpiringStorageService();
    validatingService = new ValidatingStorageService();
  });

  afterEach(() => {
    localStorage.clear(); // Clear localStorage after each test to avoid side effects
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve data from localStorage', () => {
    const testData: TestData = { key1: 'value1', key2: 42 };
    service.setItem(testData);

    const storedData = service.getItem();
    expect(storedData).toEqual(testData);
  });

  it('should return null when no data is stored', () => {
    const storedData = service.getItem();
    expect(storedData).toBeNull();
  });

  it('should remove data from localStorage', () => {
    const testData: TestData = { key1: 'value1', key2: 42 };
    service.setItem(testData);

    service.removeItem();
    const storedData = service.getItem();
    expect(storedData).toBeNull();
  });

  it('should remove legacy values that do not match the storage format', () => {
    localStorage.setItem(
      'testKey',
      JSON.stringify({ key1: 'value1', key2: 42 })
    );

    const storedData = service.getItem();

    expect(storedData).toBeNull();
    expect(localStorage.getItem('testKey')).toBeNull();
  });

  it('should expire data when it is older than the configured max age', () => {
    const testData: TestData = { key1: 'value1', key2: 42 };
    spyOn(Date, 'now').and.returnValues(1_000, 2_001);
    expiringService.setItem(testData);

    const storedData = expiringService.getItem();
    expect(storedData).toBeNull();
    expect(localStorage.getItem('expiringTestKey')).toBeNull();
  });

  it('should refresh savedAt on each successful read to extend the expiry window', () => {
    const testData: TestData = { key1: 'value1', key2: 42 };
    // t=0: write, t=900: first read (refreshes savedAt to 900), t=1800: second read (900ms since refresh, not expired)
    spyOn(Date, 'now').and.returnValues(0, 900, 900, 1_800);
    expiringService.setItem(testData);

    expect(expiringService.getItem()).toEqual(testData); // refreshes savedAt to 900
    expect(expiringService.getItem()).toEqual(testData); // 900ms since last refresh, still within 1000ms window
  });

  it('should remove corrupted (non-JSON) data and return null', () => {
    localStorage.setItem('testKey', '{{not valid json');

    const storedData = service.getItem();

    expect(storedData).toBeNull();
    expect(localStorage.getItem('testKey')).toBeNull();
  });

  it('should remove values rejected by subclass validation', () => {
    localStorage.setItem(
      'validatingTestKey',
      JSON.stringify({
        value: { key1: 'value1', key2: 'bad' },
        savedAt: 1_000,
      })
    );

    const storedData = validatingService.getItem();

    expect(storedData).toBeNull();
    expect(localStorage.getItem('validatingTestKey')).toBeNull();
  });
});

describe('LoginRedirectStorageService', () => {
  let service: LoginRedirectStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new LoginRedirectStorageService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should accept a valid RedirectData value', () => {
    service.setItem({ url: '/home', userHash: 'abc123' });
    expect(service.getItem()).toEqual({ url: '/home', userHash: 'abc123' });
  });

  it('should accept a valid RedirectData value with null userHash', () => {
    service.setItem({ url: '/home', userHash: null });
    expect(service.getItem()).toEqual({ url: '/home', userHash: null });
  });

  it('should reject and clear a value missing required fields', () => {
    localStorage.setItem(
      LoginRedirectStorageService.storageKey,
      JSON.stringify({ value: { url: '/home' }, savedAt: 1_000 })
    );

    expect(service.getItem()).toBeNull();
    expect(
      localStorage.getItem(LoginRedirectStorageService.storageKey)
    ).toBeNull();
  });

  it('should reject and clear a value with wrong field types', () => {
    localStorage.setItem(
      LoginRedirectStorageService.storageKey,
      JSON.stringify({ value: { url: 123, userHash: null }, savedAt: 1_000 })
    );

    expect(service.getItem()).toBeNull();
  });
});

describe('HomeParametersStorageService', () => {
  let service: HomeParametersStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new HomeParametersStorageService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should accept a valid Params object', () => {
    service.setItem({ page: '1', tab: 'projects' });
    expect(service.getItem()).toEqual({ page: '1', tab: 'projects' });
  });

  it('should reject and clear a non-object value', () => {
    localStorage.setItem(
      HomeParametersStorageService.storageKey,
      JSON.stringify({ value: 'not-an-object', savedAt: 1_000 })
    );

    expect(service.getItem()).toBeNull();
    expect(
      localStorage.getItem(HomeParametersStorageService.storageKey)
    ).toBeNull();
  });
});

describe('MultiMapsStorageService', () => {
  let service: MultiMapsStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new MultiMapsStorageService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should accept a valid options object', () => {
    service.setItem({ layoutMode: 2, selectedMapId: 1 });
    expect(service.getItem()).toEqual({ layoutMode: 2, selectedMapId: 1 });
  });

  it('should reject and clear a non-object value', () => {
    localStorage.setItem(
      MultiMapsStorageService.storageKey,
      JSON.stringify({ value: null, savedAt: 1_000 })
    );

    expect(service.getItem()).toBeNull();
    expect(localStorage.getItem(MultiMapsStorageService.storageKey)).toBeNull();
  });
});

describe('ExploreStorageService', () => {
  let service: ExploreStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new ExploreStorageService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should accept a valid options object', () => {
    service.setItem({ tabIndex: 1, isPanelExpanded: true, opacity: 0.8 });
    expect(service.getItem()).toEqual({
      tabIndex: 1,
      isPanelExpanded: true,
      opacity: 0.8,
    });
  });

  it('should reject and clear a value with missing fields', () => {
    localStorage.setItem(
      ExploreStorageService.storageKey,
      JSON.stringify({ value: { tabIndex: 1 }, savedAt: 1_000 })
    );

    expect(service.getItem()).toBeNull();
    expect(localStorage.getItem(ExploreStorageService.storageKey)).toBeNull();
  });

  it('should reject and clear a value with wrong field types', () => {
    localStorage.setItem(
      ExploreStorageService.storageKey,
      JSON.stringify({
        value: { tabIndex: '1', isPanelExpanded: true, opacity: 0.8 },
        savedAt: 1_000,
      })
    );

    expect(service.getItem()).toBeNull();
    expect(localStorage.getItem(ExploreStorageService.storageKey)).toBeNull();
  });
});
