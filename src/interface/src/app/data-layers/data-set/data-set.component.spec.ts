import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSetComponent } from '@app/data-layers/data-set/data-set.component';
import { MockProvider } from 'ng-mocks';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { of } from 'rxjs';

describe('DataSetComponent', () => {
  let component: DataSetComponent;
  let fixture: ComponentFixture<DataSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataSetComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(null),
          selectedDataLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
