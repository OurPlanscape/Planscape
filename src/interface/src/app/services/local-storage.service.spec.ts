import { TestBed } from '@angular/core/testing';
import { BaseLocalStorageService } from '@services/local-storage.service';

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

describe('BaseStorageService', () => {
  let service: TestStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new TestStorageService();
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
});
