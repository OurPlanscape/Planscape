import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayerTooltipComponent } from './data-layer-tooltip.component';
import { DataLayersStateService } from '../data-layers.state.service';
import { DataLayersService } from '../../services/data-layers.service';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';

describe('DataLayerTooltipComponent', () => {
  let component: DataLayerTooltipComponent;
  let fixture: ComponentFixture<DataLayerTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLayerTooltipComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
        }),
        MockProvider(DataLayersService, {
          getPublicUrl: () => of(''),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataLayerTooltipComponent);
    component = fixture.componentInstance;
    component.layer = {
      name: 'Testing Name',
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
