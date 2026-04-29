import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayerTooltipComponent } from './data-layer-tooltip.component';
import { DataLayersStateService } from '../data-layers.state.service';
import { DatalayersService } from '@app/api/generated/datalayers/datalayers.service';
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
        MockProvider(DatalayersService),
      ],
    }).compileComponents();

    spyOn(TestBed.inject(DatalayersService), 'v2DatalayersUrlsRetrieve').and.returnValue(of({ layer_url: '' }) as any);

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
