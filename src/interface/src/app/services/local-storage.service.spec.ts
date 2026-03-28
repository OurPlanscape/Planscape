import { TestBed } from '@angular/core/testing';
import { BaseLocalStorageService } from './local-storage.service';

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
    localStorage.setItem('testKey', JSON.stringify({ key1: 'value1', key2: 42 }));

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
