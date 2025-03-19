import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSetComponent } from './data-set.component';
import { MockProvider } from 'ng-mocks';
import { DataLayersStateService } from '../data-layers.state.service';
import { of } from 'rxjs';

describe('DataSetComponent', () => {
  let component: DataSetComponent;
  let fixture: ComponentFixture<DataSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataSetComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          selectedDataLayer$: of(null),
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
