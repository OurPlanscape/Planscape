import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { BehaviorSubject, catchError, interval, NEVER, take } from 'rxjs';
import {
  Plan,
  Scenario,
  ScenarioResult,
  ScenarioResultStatus,
} from 'src/app/types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { POLLING_INTERVAL } from '../plan-helpers';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlanStateService } from '../../services/plan-state.service';
import { SNACK_ERROR_CONFIG } from '../../shared/constants';
import { SetPrioritiesComponent } from './set-priorities/set-priorities.component';
import { ConstraintsPanelComponent } from './constraints-panel/constraints-panel.component';
import { FeatureService } from '../../features/feature.service';
import { ScenarioService } from '../../services/scenario.service';

enum ScenarioTabs {
  CONFIG,
  RESULTS,
}

@UntilDestroy()
@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss'],
})
export class CreateScenariosComponent implements OnInit {
  @ViewChild(MatStepper) stepper: MatStepper | undefined;
  selectedTab = ScenarioTabs.CONFIG;
  generatingScenario: boolean = false;
  scenarioId?: string | null;
  planId?: string | null;
  plan$ = new BehaviorSubject<Plan | null>(null);
  existingScenarioNames: string[] = [];
  forms: FormGroup = this.fb.group({});

  project_area_upload_enabled = this.featureService.isFeatureEnabled(
    'upload_project_area'
  );

  // this value gets updated once we load the scenario result.
  scenarioState: ScenarioResultStatus = 'NOT_STARTED';
  scenarioResults: ScenarioResult | null = null;
  priorities: string[] = [];
  scenarioChartData: any[] = [];
  tabAnimationOptions: Record<'on' | 'off', string> = {
    on: '500ms',
    off: '0ms',
  };

  tabAnimation = this.tabAnimationOptions.off;

  @ViewChild(SetPrioritiesComponent, { static: true })
  prioritiesComponent!: SetPrioritiesComponent;

  @ViewChild(ConstraintsPanelComponent, { static: true })
  constraintsPanelComponent!: ConstraintsPanelComponent;

  constructor(
    private fb: FormBuilder,
    private planStateService: PlanStateService,
    private scenarioService: ScenarioService,
    private router: Router,
    private matSnackBar: MatSnackBar,
    private featureService: FeatureService
  ) {}

  createForms() {
    this.forms = this.fb.group({
      scenarioName: [null, Validators.required],
      priorities: this.prioritiesComponent.createForm(),
      constrains: this.constraintsPanelComponent.createForm(),
      projectAreas: this.fb.group({
        generateAreas: [''],
        uploadedArea: [''],
      }),
    });
  }

  ngOnInit(): void {
    this.createForms();
    // Get plan details and current config ID from plan state, then load the config.
    this.planStateService.planState$
      .pipe(untilDestroyed(this))
      .subscribe((planState) => {
        this.plan$.next(planState.all[planState.currentPlanId!]);
        this.scenarioId = planState.currentScenarioId;
        this.planId = planState.currentPlanId;
        if (this.plan$.getValue()?.region) {
          this.planStateService.setPlanRegion(this.plan$.getValue()?.region!);
        }
      });

    if (this.scenarioId) {
      // Has to be outside service subscription or else will cause infinite loop
      this.scenarioState = 'LOADING';
      this.loadConfig();
      this.pollForChanges();
      // if we have an id go to the results tab.
      this.selectedTab = ScenarioTabs.RESULTS;
    } else {
      // enable animation
      this.tabAnimation = this.tabAnimationOptions.on;
    }

    // When an area is uploaded, issue an event to draw it on the map.
    // If the "generate areas" option is selected, remove any drawn areas.
    this.projectAreasForm?.valueChanges.subscribe((_) => {
      const generateAreas = this.forms
        .get('projectAreas')
        ?.get('generateAreas');
      const uploadedArea = this.projectAreasForm?.get('uploadedArea');
      if (generateAreas?.value) {
        this.drawShapes(null);
      } else {
        this.drawShapes(uploadedArea?.value);
      }
    });

    if (typeof this.planId === 'string') {
      this.scenarioService
        .getScenariosForPlan(this.planId)
        .pipe(take(1))
        .subscribe((scenarios) => {
          this.existingScenarioNames = scenarios.map((s) => s.name);
        });
    }
  }

  checkExistingNames() {
    const scenarioNameValue = this.forms.get('scenarioName')?.value;
    return this.existingScenarioNames.includes(scenarioNameValue);
  }

  pollForChanges() {
    interval(POLLING_INTERVAL)
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        // only poll when scenario is pending or running
        if (
          this.scenarioState === 'PENDING' ||
          this.scenarioState === 'RUNNING'
        ) {
          this.loadConfig();
        }
      });
  }

  loadConfig(): void {
    this.planStateService
      .getScenario(this.scenarioId!)
      .subscribe((scenario) => {
        // if we have the same state do nothing.
        if (this.scenarioState === scenario.scenario_result?.status) {
          return;
        }

        this.disableForms();
        if (scenario.scenario_result) {
          this.scenarioResults = scenario.scenario_result;
          this.scenarioState = scenario.scenario_result?.status;
          this.priorities =
            scenario.configuration.treatment_question?.scenario_priorities ||
            [];

          this.selectedTab = ScenarioTabs.RESULTS;
          if (this.scenarioState == 'SUCCESS') {
            this.processScenarioResults(scenario);
          }
          // enable animation
          this.tabAnimation = this.tabAnimationOptions.on;
        }

        //setting name
        if (scenario.name) {
          this.scenarioNameFormField?.setValue(scenario.name);
        }
        // setting treatment question
        if (scenario.configuration.treatment_question) {
          this.prioritiesComponent.setFormData(
            scenario.configuration.treatment_question
          );
        }
        // setting constraints
        this.constraintsPanelComponent.setFormData(scenario.configuration);
      });
  }

  private formValueToScenario(): Scenario {
    return {
      name: this.scenarioNameFormField?.value,
      planning_area: this.planId || '', // nope I should have planID
      configuration: {
        ...this.constraintsPanelComponent.getFormData(),
        ...this.prioritiesComponent.getFormData(),
      },
    };
  }

  /** Creates the scenario */
  // TODO Add support for uploaded Project Area shapefiles
  createScenario(): void {
    this.forms.markAllAsTouched();
    if (this.forms.invalid) {
      return;
    }
    this.generatingScenario = true;
    this.planStateService
      .createScenario(this.formValueToScenario())
      .pipe(
        catchError((error) => {
          this.generatingScenario = false;
          this.matSnackBar.open(error.message, 'Dismiss', SNACK_ERROR_CONFIG);
          return NEVER;
        })
      )
      .subscribe(() => {
        this.matSnackBar.dismiss();
        this.scenarioState = 'PENDING';
        this.disableForms();
        this.selectedTab = ScenarioTabs.RESULTS;
        this.pollForChanges();
      });

    // this.createUploadedProjectAreas()
    //   .pipe(
    //     take(1),
    //     concatMap(() => {
    //       return this.planService.createScenario(
    //         this.formValueToProjectConfig()
    //       );
    //     }),

    // TODO Implement more specific error catching (currently raises shapefile error message for any thrown error)
    // catchError(() => {
    //   this.matSnackBar.open(
    //     '[Error] Project area shapefile should only include polygons or multipolygons',
    //     'Dismiss',
    //     {
    //       duration: 10000,
    //       panelClass: ['snackbar-error'],
    //       verticalPosition: 'top',
    //     }
    //   );
    //   return throwError(
    //     () => new Error('Problem creating uploaded project areas')
    //   );
    // })
    // )
    // .subscribe(() => {
    //   // Navigate to scenario confirmation page
    //   const planId = this.plan$.getValue()?.id;
    //   this.router.navigate(['scenario-confirmation', planId]);
    // });
  }

  disableForms() {
    this.scenarioNameFormField?.disable();
    this.prioritiesForm?.disable();
    this.constrainsForm?.disable();
  }

  // createUploadedProjectAreas() {
  //   const uploadedArea = this.formGroups[2].get('uploadedArea')?.value;
  //   if (this.scenarioConfigId && uploadedArea) {
  //     return this.planService.bulkCreateProjectAreas(
  //       this.scenarioConfigId,
  //       this.convertSingleGeoJsonToGeoJsonArray(uploadedArea)
  //     );
  //   }
  //   return of(null);
  // }

  /**
   * Processes Scenario Results into ChartData format and updates PlanService State with Project Area shapes
   */
  processScenarioResults(scenario: Scenario) {
    var scenario_output_fields_paths =
      scenario?.configuration.treatment_question?.scenario_output_fields_paths!;
    var labels: string[][] = [];
    if (scenario && this.scenarioResults) {
      this.planStateService
        .getMetricData(scenario_output_fields_paths)
        .pipe(take(1))
        .subscribe((metric_data) => {
          for (let metric in metric_data) {
            var displayName = metric_data[metric]['display_name'];
            var dataUnits =
              metric_data[metric]['output_units'] ||
              metric_data[metric]['data_units'];
            var metricLayer = metric_data[metric]['raw_layer'];
            var metricName = metric_data[metric]['metric_name'];
            var metricData: string[] = [];
            this.scenarioResults?.result.features.map((featureCollection) => {
              const props = featureCollection.properties;
              metricData.push(props[metric]);
            });
            labels.push([
              displayName,
              dataUnits,
              metricLayer,
              metricData,
              metricName,
            ]);
          }
          this.scenarioChartData = labels.map((label, _) => ({
            label: label[0],
            measurement: label[1],
            metric_layer: label[2],
            values: label[3],
            key: label[4],
          }));
        });
      this.planStateService.updateStateWithShapes(
        this.scenarioResults?.result.features
      );
    }
  }

  /**
   * Converts each feature found in a GeoJSON into individual GeoJSONs, else
   * returns the original GeoJSON, which may result in an error upon project area creation.
   * Only polygon or multipolygon feature types are expected in the uploaded shapefile.
   */
  convertSingleGeoJsonToGeoJsonArray(
    original: GeoJSON.GeoJSON
  ): GeoJSON.GeoJSON[] {
    const geometries: GeoJSON.GeoJSON[] = [];
    if (original.type === 'FeatureCollection' && original.features) {
      original.features.forEach((feat) => {
        geometries.push({
          type: 'FeatureCollection',
          features: [feat],
        });
      });
    } else {
      geometries.push(original);
    }
    return geometries;
  }

  private drawShapes(shapes: any | null): void {
    this.planStateService.updateStateWithShapes(shapes);
  }

  goBackToPlanning() {
    this.router.navigate(['plan', this.plan$.value?.id]);
  }

  get projectAreasForm(): FormGroup {
    return this.forms.get('projectAreas') as FormGroup;
  }

  get scenarioNameFormField() {
    return this.forms.get('scenarioName');
  }

  get prioritiesForm() {
    return this.forms.get('priorities');
  }

  get constrainsForm() {
    return this.forms.get('constrains');
  }
}
