import { TestBed } from '@angular/core/testing';
import { BaseStorageService } from '@services/local-storage.service';

interface TestData {
  key1: string;
  key2: number;
}

// A test class that extends BaseStorageService
class TestStorageService extends BaseStorageService<TestData> {
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
});
