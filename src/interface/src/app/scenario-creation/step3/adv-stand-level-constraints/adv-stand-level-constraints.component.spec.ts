import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { AdvStandLevelConstraintsComponent } from './adv-stand-level-constraints.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { MAX_SELECTED_DATALAYERS } from '@app/data-layers/data-layers/max-selected-datalayers.token';
import { PlanState } from '@app/plan/plan.state';
import { ScenarioState } from '@app/scenario/scenario.state';
import { MapModuleService } from '@app/services/map-module.service';
import { MAP_MODULE_NAME } from '@app/services/map-module.token';
import { ModuleService } from '@app/services/module.service';
import { SELECTION_MODE } from '@app/data-layers/data-layers/selection-mode.token';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { DataLayer, Constraint } from '@app/types';
import { NamedConstraint } from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';

const layerOne = { id: 1, name: 'Test Layer One' } as unknown as DataLayer;
const layerTwo = { id: 2, name: 'Test Layer Two' } as unknown as DataLayer;

function makeConstraint(partial: Partial<Constraint>): Constraint {
  return {
    datalayer: 1,
    operator: 'gt',
    value: '10',
    ...partial,
  } as unknown as Constraint;
}

function makeNamedConstraint(
  partial: Partial<NamedConstraint>
): NamedConstraint {
  return {
    ...makeConstraint(partial as Partial<Constraint>),
    name: 'Slope: > 10',
    ...partial,
  } as unknown as NamedConstraint;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AdvStandLevelConstraintsComponent],
  template: `<form [formGroup]="parentForm">
    <app-adv-stand-level-constraints
      [keyName]="keyName"
      [constraintLayers]="constraintLayers"></app-adv-stand-level-constraints>
  </form>`,
})
class HostComponent {
  parentForm = new FormGroup({});
  keyName = 'advStandLevelConstraints';
  constraintLayers: unknown[] = [];
}

describe('AdvStandLevelConstraintsComponent', () => {
  let component: AdvStandLevelConstraintsComponent;
  let hostComponent: HostComponent;
  let fixture: ComponentFixture<HostComponent>;

  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let mapModuleServiceSpy: jasmine.SpyObj<MapModuleService>;
  let moduleServiceSpy: jasmine.SpyObj<ModuleService>;
  let dataLayerState: DataLayersStateService;

  let currentScenario$: Subject<unknown>;
  let currentPlan$: Subject<unknown>;
  let planningAreaGeometry$: Subject<unknown>;
  let advStandLevelConstraints$: Subject<Constraint[] | null>;
  let mapDatasets$: BehaviorSubject<{ main_datasets: unknown[] }>;

  let parentFormGroup: FormGroup;
  let afterClosed$: Subject<{ action: string; payload: unknown }>;

  beforeEach(async () => {
    currentScenario$ = new Subject();
    currentPlan$ = new Subject();
    planningAreaGeometry$ = new Subject();
    advStandLevelConstraints$ = new BehaviorSubject<Constraint[] | null>(null);
    afterClosed$ = new Subject();
    mapDatasets$ = new BehaviorSubject<{ main_datasets: unknown[] }>({
      main_datasets: [],
    });

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({
      afterClosed: () => afterClosed$,
    } as any);

    mapModuleServiceSpy = jasmine.createSpyObj(
      'MapModuleService',
      ['loadMapModule'],
      { datasets$: mapDatasets$ }
    );
    mapModuleServiceSpy.loadMapModule.and.returnValue(of(null) as any);

    moduleServiceSpy = jasmine.createSpyObj('ModuleService', ['getModule']);
    moduleServiceSpy.getModule.and.returnValue(
      of({ options: { datalayers: [layerOne, layerTwo] } } as any)
    );

    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ModuleService, useValue: moduleServiceSpy },
        { provide: ScenarioState, useValue: { currentScenario$ } },
        { provide: NewScenarioState, useValue: { advStandLevelConstraints$ } },
        {
          provide: PlanState,
          useValue: { currentPlan$, planningAreaGeometry$ },
        },
      ],
    })
      // MapModuleService is registered as a component-level provider in
      // @Component, so TestBed's module providers above can't reach it —
      // override the component instead. DataLayersStateService is left as
      // the real implementation: the real DataLayersComponent nested in the
      // template also injects it and expects its full API, which a partial
      // mock can't provide.
      .overrideComponent(AdvStandLevelConstraintsComponent, {
        set: {
          providers: [
            DataLayersStateService,
            { provide: SELECTION_MODE, useValue: 'MANUAL' },
            {
              provide: MAX_SELECTED_DATALAYERS,
              useValue: Number.POSITIVE_INFINITY,
            },
            { provide: MapModuleService, useValue: mapModuleServiceSpy },
            {
              provide: MAP_MODULE_NAME,
              useValue: 'advanced_stand_level_constraint',
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    hostComponent = fixture.componentInstance;
    parentFormGroup = hostComponent.parentForm;
    const childDebugElement = fixture.debugElement.query(
      By.directive(AdvStandLevelConstraintsComponent)
    );
    component = childDebugElement.componentInstance;
    dataLayerState = childDebugElement.injector.get(DataLayersStateService);
    spyOn(dataLayerState, 'addSelectedLayer');
    spyOn(dataLayerState, 'removeSelectedLayer');
  });

  afterEach(() => {
    currentScenario$.complete();
    currentPlan$.complete();
    planningAreaGeometry$.complete();
    advStandLevelConstraints$.complete();
    afterClosed$.complete();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('constructor pipeline', () => {
    it('loads the map module once the current plan resolves after the current scenario', () => {
      fixture.detectChanges();
      expect(mapModuleServiceSpy.loadMapModule).not.toHaveBeenCalled();

      currentScenario$.next({ id: 99 });
      currentPlan$.next({ geometry: { type: 'Polygon' } });

      expect(mapModuleServiceSpy.loadMapModule).toHaveBeenCalledOnceWith({
        type: 'Polygon',
      });
    });
  });

  describe('constraintLayers$ / layersLoaded$', () => {
    it('populates knownLayers via getFullLayerById once loaded', (done) => {
      fixture.detectChanges();
      component.constraintLayers$.subscribe(() => {
        expect(component.getFullLayerById(1)).toEqual(layerOne);
        expect(component.getFullLayerById(999)).toBeNull();
        done();
      });
    });
  });

  describe('ngOnInit / ngOnDestroy', () => {
    it('attaches the internal form to the parent form group under keyName', () => {
      fixture.detectChanges();
      expect(parentFormGroup.get('advStandLevelConstraints')).toBe(
        component.form
      );
    });

    it('uses a custom keyName when provided', () => {
      hostComponent.keyName = 'customKey';
      fixture.detectChanges();
      expect(parentFormGroup.get('customKey')).toBe(component.form);
      expect(parentFormGroup.get('advStandLevelConstraints')).toBeNull();
    });

    it('keeps the form control in sync with selectedConstraints$', () => {
      fixture.detectChanges();
      const constraint = makeNamedConstraint({ datalayer: 1 });

      component.selectedConstraints$.next([constraint]);

      expect(component.form.controls.constraints.value).toEqual([constraint]);
    });

    it('removes the control from the parent form and completes destroy$ on destroy', () => {
      fixture.detectChanges();
      const destroyNextSpy = spyOn(
        (component as unknown as { destroy$: Subject<void> }).destroy$,
        'next'
      ).and.callThrough();
      const destroyCompleteSpy = spyOn(
        (component as unknown as { destroy$: Subject<void> }).destroy$,
        'complete'
      ).and.callThrough();

      fixture.destroy();

      expect(parentFormGroup.get('advStandLevelConstraints')).toBeNull();
      expect(destroyNextSpy).toHaveBeenCalled();
      expect(destroyCompleteSpy).toHaveBeenCalled();
    });
  });

  describe('mapConfigToUI', () => {
    it('clears selectedConstraints$ when there are no configured constraints', () => {
      fixture.detectChanges();
      component.selectedConstraints$.next([makeNamedConstraint({})]);

      component.mapConfigToUI();
      advStandLevelConstraints$.next(null);

      expect(component.selectedConstraints$.value).toEqual([]);
    });

    it('keeps only constraints matching a known Adv Stand Level Constraint layer, names them, and selects the layer', () => {
      fixture.detectChanges();

      component.mapConfigToUI();
      advStandLevelConstraints$.next([
        makeConstraint({ datalayer: 1, operator: 'gt', value: '10' }),
        makeConstraint({ datalayer: 42, operator: 'gt', value: '5' }), // unknown layer, dropped
      ]);

      const result = component.selectedConstraints$.value;
      expect(result.length).toBe(1);
      expect(result[0].datalayer).toBe(1);
      expect(result[0].name).toContain('Test Layer One');
      expect(dataLayerState.addSelectedLayer).toHaveBeenCalledWith(layerOne);
    });

    it('formats a "btw" constraint as a sorted min-max range', () => {
      fixture.detectChanges();

      component.mapConfigToUI();
      advStandLevelConstraints$.next([
        makeConstraint({ datalayer: 1, operator: 'btw', value: '20,5' }),
      ]);

      expect(component.selectedConstraints$.value[0].name).toBe(
        'Test Layer One: 5-20'
      );
    });
  });

  describe('handleConstraintAdded', () => {
    it('appends a new constraint and selects its layer', () => {
      fixture.detectChanges();
      const constraint = makeNamedConstraint({
        datalayer: 1,
        name: 'Test Layer One: > 10',
      });

      component.handleConstraintAdded(constraint);

      expect(component.selectedConstraints$.value).toEqual([constraint]);
      expect(dataLayerState.addSelectedLayer).toHaveBeenCalledWith(layerOne);
    });

    it('replaces an existing constraint with the same name', () => {
      fixture.detectChanges();
      const original = makeNamedConstraint({
        datalayer: 1,
        name: 'Test Layer One: > 10',
        value: '10',
      });
      const updated = makeNamedConstraint({
        datalayer: 1,
        name: 'Test Layer One: > 10',
        value: '15',
      });
      component.selectedConstraints$.next([original]);

      component.handleConstraintAdded(updated);

      expect(component.selectedConstraints$.value).toEqual([updated]);
    });
  });

  describe('handleUpdateConstraint', () => {
    it('merges into the existing constraint matched by datalayer id', () => {
      fixture.detectChanges();
      const original = makeNamedConstraint({ datalayer: 1, value: '10' });
      component.selectedConstraints$.next([original]);

      component.handleUpdateConstraint(
        makeNamedConstraint({ datalayer: 1, value: '99' })
      );

      expect(component.selectedConstraints$.value[0].value).toBe('99');
    });

    it('is a no-op when no constraint matches the datalayer id', () => {
      fixture.detectChanges();
      const original = makeNamedConstraint({ datalayer: 1, value: '10' });
      component.selectedConstraints$.next([original]);

      component.handleUpdateConstraint(
        makeNamedConstraint({ datalayer: 2, value: '99' })
      );

      expect(component.selectedConstraints$.value).toEqual([original]);
    });
  });

  describe('removeSelectionById', () => {
    it('removes the matching constraint and deselects its layer', () => {
      fixture.detectChanges();
      component.selectedConstraints$.next([
        makeNamedConstraint({ datalayer: 1 }),
        makeNamedConstraint({ datalayer: 2 }),
      ]);

      component.removeSelectionById(1);

      expect(
        component.selectedConstraints$.value.map((c) => c.datalayer)
      ).toEqual([2]);
      expect(dataLayerState.removeSelectedLayer).toHaveBeenCalledWith(layerOne);
    });

    it('does not call removeSelectedLayer for an unknown layer id', () => {
      fixture.detectChanges();
      component.selectedConstraints$.next([
        makeNamedConstraint({ datalayer: 999 }),
      ]);

      component.removeSelectionById(999);

      expect(dataLayerState.removeSelectedLayer).not.toHaveBeenCalled();
    });
  });

  describe('handleSelectedLayer', () => {
    it('removes the layer directly when it is already selected, without opening a dialog', () => {
      fixture.detectChanges();
      component.selectedConstraints$.next([
        makeNamedConstraint({ datalayer: 1 }),
      ]);

      component.handleSelectedLayer(layerOne);

      expect(component.selectedConstraints$.value).toEqual([]);
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('opens the add-constraint dialog for an unselected layer and adds it on SAVE', () => {
      fixture.detectChanges();
      const newConstraint = makeNamedConstraint({
        datalayer: 1,
        name: 'Slope: > 10',
      });

      component.handleSelectedLayer(layerOne);
      afterClosed$.next({ action: 'SAVE', payload: newConstraint });

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(component.selectedConstraints$.value).toEqual([newConstraint]);
    });

    it('removes by id on DELETE from the dialog', () => {
      fixture.detectChanges();
      component.selectedConstraints$.next([
        makeNamedConstraint({ datalayer: 1 }),
      ]);

      component.handleSelectedLayer(layerOne);
      afterClosed$.next({ action: 'DELETE', payload: 1 });

      expect(component.selectedConstraints$.value).toEqual([]);
    });
  });

  describe('toggleLayersSection', () => {
    it('flips showLayersPanel each call', () => {
      fixture.detectChanges();
      expect(component.showLayersPanel).toBeFalse();

      component.toggleLayersSection();
      expect(component.showLayersPanel).toBeTrue();

      component.toggleLayersSection();
      expect(component.showLayersPanel).toBeFalse();
    });
  });

  describe('handleConstraintChipClicked', () => {
    it('sets activeConstraint$ but does nothing further when the layer is unknown', () => {
      fixture.detectChanges();
      const constraint = makeNamedConstraint({ datalayer: 999 });

      component.handleConstraintChipClicked(constraint);

      expect(component.activeConstraint$.value).toEqual(constraint);
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('opens the edit dialog in EDIT mode for a simple operator', () => {
      fixture.detectChanges();
      const constraint = makeNamedConstraint({
        datalayer: 1,
        operator: 'gt',
        value: '10',
      });

      component.handleConstraintChipClicked(constraint);

      expect(dialogSpy.open).toHaveBeenCalled();
      const dialogArgs = dialogSpy.open.calls.mostRecent().args[1] as {
        data: Record<string, unknown>;
      };
      expect(dialogArgs.data).toEqual(
        jasmine.objectContaining({
          mode: 'EDIT',
          dataLayerName: 'Test Layer One',
          operator: 'gt',
          valueOne: '10',
          valueTwo: null,
        })
      );
    });

    it('splits and sorts a "btw" value into valueOne/valueTwo regardless of input order', () => {
      fixture.detectChanges();
      const constraint = makeNamedConstraint({
        datalayer: 1,
        operator: 'btw',
        value: '20,5',
      });

      component.handleConstraintChipClicked(constraint);

      const dialogArgs = dialogSpy.open.calls.mostRecent().args[1] as {
        data: Record<string, unknown>;
      };
      expect(dialogArgs.data['valueOne']).toBe('5');
      expect(dialogArgs.data['valueTwo']).toBe('20');
    });

    it('clears activeConstraint$ and applies the update on SAVE', () => {
      fixture.detectChanges();
      component.selectedConstraints$.next([
        makeNamedConstraint({ datalayer: 1, value: '10' }),
      ]);
      const clicked = makeNamedConstraint({ datalayer: 1, value: '10' });

      component.handleConstraintChipClicked(clicked);
      afterClosed$.next({
        action: 'SAVE',
        payload: makeNamedConstraint({ datalayer: 1, value: '50' }),
      });

      expect(component.activeConstraint$.value).toBeNull();
      expect(component.selectedConstraints$.value[0].value).toBe('50');
    });

    it('removes by payload.id on DELETE', () => {
      fixture.detectChanges();
      component.selectedConstraints$.next([
        makeNamedConstraint({ datalayer: 1 }),
      ]);
      const clicked = makeNamedConstraint({ datalayer: 1 });

      component.handleConstraintChipClicked(clicked);
      afterClosed$.next({ action: 'DELETE', payload: { id: 1 } });

      expect(component.selectedConstraints$.value).toEqual([]);
      expect(component.activeConstraint$.value).toBeNull();
    });
  });
});
