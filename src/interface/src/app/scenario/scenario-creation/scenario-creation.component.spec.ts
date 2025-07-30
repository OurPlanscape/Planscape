import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioCreationComponent } from './scenario-creation.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { of } from 'rxjs';
import { TreatmentGoalsComponent } from '../treatment-goals/treatment-goals.component';
import { StandSizeComponent } from '../stand-size/stand-size.component';

describe('ScenarioCreationComponent', () => {
  let component: ScenarioCreationComponent;
  let fixture: ComponentFixture<ScenarioCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioCreationComponent, NoopAnimationsModule],
      providers: [
        MockProvider(DataLayersStateService, {
          paths$: of([]),
        }),
      ],
      declarations: [
        MockDeclarations(DataLayersComponent),
        MockDeclarations(TreatmentGoalsComponent),
        MockDeclarations(StandSizeComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
