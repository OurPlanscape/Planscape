import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayersComponent } from './data-layers.component';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { DataLayersStateService } from '../data-layers.state.service';
import { DataSet, Pagination } from '@types';

describe('DataLayersComponent', () => {
  let component: DataLayersComponent;
  let fixture: ComponentFixture<DataLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLayersComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          searchTerm$: of(''),
          legacyDataSets$: of({} as Pagination<DataSet>),
          selectedDataSet$: of(null),
          dataTree$: of(null),
          searchResults$: of(null),
          loading$: new BehaviorSubject(false),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
