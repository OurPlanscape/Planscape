import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SubUnitSelectorComponent } from './sub-unit-selector.component';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NewScenarioState } from '../new-scenario.state';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';

describe('SubUnitSelectorComponent', () => {
  let component: SubUnitSelectorComponent;
  let fixture: ComponentFixture<SubUnitSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        HttpClientModule,
        SubUnitSelectorComponent,
      ],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({}),
          priorityObjectivesDetails$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubUnitSelectorComponent);
    component = fixture.componentInstance;
    component.form = new FormGroup({
      sub_units_layer: new FormControl<number | undefined>(undefined),
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
