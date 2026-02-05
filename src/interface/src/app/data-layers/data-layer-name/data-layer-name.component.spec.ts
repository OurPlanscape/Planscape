import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayerNameComponent } from '@app/data-layers/data-layer-name/data-layer-name.component';
import { MockProvider } from 'ng-mocks';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { of } from 'rxjs';

describe('DataLayerNameComponent', () => {
  let component: DataLayerNameComponent;
  let fixture: ComponentFixture<DataLayerNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLayerNameComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataLayerNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
