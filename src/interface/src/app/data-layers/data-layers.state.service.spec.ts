import { TestBed } from '@angular/core/testing';

import { DataLayersStateService } from './data-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { DataLayersService } from '@services/data-layers.service';
import { of } from 'rxjs';
import { DataSet, Pagination } from '@types';

describe('DataLayersStateService', () => {
  let service: DataLayersStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MockProvider(DataLayersService, {
          listDataSets: () => of({} as Pagination<DataSet>),
        }),
      ],
    });
    service = TestBed.inject(DataLayersStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
