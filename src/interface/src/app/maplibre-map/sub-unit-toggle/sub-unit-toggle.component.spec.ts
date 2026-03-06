import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SubUnitToggleComponent } from './sub-unit-toggle.component';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';

describe('SubUnitToggleComponent', () => {
  let component: SubUnitToggleComponent;
  let fixture: ComponentFixture<SubUnitToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubUnitToggleComponent],
      providers: [
        {
          provide: NewScenarioState,
          useValue: { selectedSubUnitLayer$: of(null) },
        },
        {
          provide: BaseLayersStateService,
          useValue: {
            addBaseLayer: () => {},
            clearBaseLayer: () => {},
            removeBaseLayer: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubUnitToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
