import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioCreationComponent } from './scenario-creation.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { firstValueFrom, Observable, of } from 'rxjs';
import { ScenarioService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ValidationErrors } from '@angular/forms';
import { Step1Component } from '../step1/step1.component';
import { Step3Component } from '../step3/step3.component';

describe('ScenarioCreationComponent', () => {
  let component: ScenarioCreationComponent;
  let fixture: ComponentFixture<ScenarioCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioCreationComponent, NoopAnimationsModule],
      providers: [
        MockProvider(ActivatedRoute, {
          snapshot: {
            data: {
              planId: 24,
            },
          } as any,
        }),
        MockProvider(ScenarioService),
        MockProvider(DataLayersStateService, {
          paths$: of([]),
        }),
      ],
      declarations: [
        MockDeclarations(DataLayersComponent, Step1Component, Step3Component),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('scenarioNameMustBeUnique (async validator)', () => {
    let mockScenarioService: any;

    beforeEach(() => {
      mockScenarioService = {
        getScenariosForPlan: jasmine.createSpy(),
      };
    });

    it('should return null if name is not provided', async () => {
      const validator = component.scenarioNameMustBeUnique(
        mockScenarioService,
        1
      );
      const control = new FormControl('');
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toBeNull();
    });

    it('should return null if name is unique', async () => {
      mockScenarioService.getScenariosForPlan.and.returnValue(
        of([{ name: 'Scenario A' }, { name: 'Scenario B' }])
      );

      const validator = component.scenarioNameMustBeUnique(
        mockScenarioService,
        1
      );
      const control = new FormControl('Scenario C');

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toBeNull();
    });

    it('should return duplicate error if name already exists (case insensitive)', async () => {
      mockScenarioService.getScenariosForPlan.and.returnValue(
        of([{ name: 'Scenario A' }, { name: 'Scenario B' }])
      );

      const validator = component.scenarioNameMustBeUnique(
        mockScenarioService,
        1
      );
      const control = new FormControl('scenario a');

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toEqual({ duplicate: true });
    });

    it('should return duplicate error with extra whitespace in name', async () => {
      mockScenarioService.getScenariosForPlan.and.returnValue(
        of([{ name: 'Scenario A' }])
      );

      const validator = component.scenarioNameMustBeUnique(
        mockScenarioService,
        1
      );
      const control = new FormControl('   Scenario A   ');

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toEqual({ duplicate: true });
    });

    it('should return null if the scenario list is empty', async () => {
      mockScenarioService.getScenariosForPlan.and.returnValue(of([]));

      const validator = component.scenarioNameMustBeUnique(
        mockScenarioService,
        1
      );
      const control = new FormControl('Any name');

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toBeNull();
    });
  });
});
