import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayerTreeComponent } from './data-layer-tree.component';
import { MockProvider } from 'ng-mocks';
import { DataLayersStateService } from '../data-layers.state.service';
import { of } from 'rxjs';

describe('DataLayerTreeComponent', () => {
  let component: DataLayerTreeComponent;
  let fixture: ComponentFixture<DataLayerTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLayerTreeComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataLayerTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
