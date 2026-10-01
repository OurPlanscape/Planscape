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

function makeConstraint(
  partial: Partial<NamedConstraint> = {}
): NamedConstraint {
  return {
    datalayer: 1,
    operator: 'gt',
    value: '10',
    name: 'Test Layer One: > 10',
    ...partial,
  } as unknown as NamedConstraint;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AdvStandLevelConstraintsComponent],
  template: `<form [formGroup]="parentForm">
    <app-adv-stand-level-constraints
      [keyName]="keyName"></app-adv-stand-level-constraints>
  </form>`,
})
class HostComponent {
  parentForm = new FormGroup({});
  keyName = 'advStandLevelConstraints';
}

describe('AdvStandLevelConstraintsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let component: AdvStandLevelConstraintsComponent;
  let dataLayerState: DataLayersStateService;

  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let mapModuleServiceSpy: jasmine.SpyObj<MapModuleService>;

  let currentScenario$: Subject<unknown>;
  let currentPlan$: Subject<unknown>;
  let advConstraints$: BehaviorSubject<Constraint[] | null>;

  /** Makes the next dialog.open() close immediately with the given result. */
  const closeDialogWith = (result: { action: string; payload: unknown }) =>
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);

  const dialogData = () =>
    (
      dialogSpy.open.calls.mostRecent().args[1] as {
        data: Record<string, unknown>;
      }
    ).data;

  const select = (...constraints: NamedConstraint[]) =>
    component.selectedConstraints$.next(constraints);

  const selected = () => component.selectedConstraints$.value;

  beforeEach(async () => {
    currentScenario$ = new Subject();
    currentPlan$ = new Subject();
    advConstraints$ = new BehaviorSubject<Constraint[] | null>(null);

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    mapModuleServiceSpy = jasmine.createSpyObj(
      'MapModuleService',
      ['loadMapModule'],
      { datasets$: new BehaviorSubject({ main_datasets: [] }) }
    );
    mapModuleServiceSpy.loadMapModule.and.returnValue(of(null) as any);

    const moduleServiceSpy = jasmine.createSpyObj('ModuleService', [
      'getModule',
    ]);
    moduleServiceSpy.getModule.and.returnValue(
      of({ options: { datalayers: [layerOne, layerTwo] } })
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
        { provide: NewScenarioState, useValue: { advConstraints$ } },
        {
          provide: PlanState,
          useValue: { currentPlan$, planningAreaGeometry$: new Subject() },
        },
      ],
    })
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
    host = fixture.componentInstance;

    const child = fixture.debugElement.query(
      By.directive(AdvStandLevelConstraintsComponent)
    );
    component = child.componentInstance;
    dataLayerState = child.injector.get(DataLayersStateService);
    spyOn(dataLayerState, 'addSelectedLayer');
    spyOn(dataLayerState, 'removeSelectedLayer');
  });

  describe('before init', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  });

  describe('after init', () => {
    beforeEach(() => fixture.detectChanges());

    describe('lifecycle', () => {
      it('keeps the form control in sync with selectedConstraints$', () => {
        const constraint = makeConstraint();
        select(constraint);
        expect(component.form.controls.constraints.value).toEqual([constraint]);
      });

      it('removes its control from the parent form on destroy', () => {
        fixture.destroy();
        expect(host.parentForm.get('advStandLevelConstraints')).toBeNull();
      });
    });

    describe('map module loading', () => {
      it('loads the map module with the plan geometry once scenario and plan resolve', () => {
        expect(mapModuleServiceSpy.loadMapModule).not.toHaveBeenCalled();

        currentScenario$.next({ id: 99 });
        currentPlan$.next({ geometry: { type: 'Polygon' } });

        expect(mapModuleServiceSpy.loadMapModule).toHaveBeenCalledOnceWith({
          type: 'Polygon',
        });
      });
    });

    describe('mapConfigToUI', () => {
      beforeEach(() => component.mapConfigToUI());

      it('clears selections when there is no configured constraint', () => {
        select(makeConstraint());
        advConstraints$.next(null);
        expect(selected()).toEqual([]);
      });

      it('keeps only constraints on known layers, names them, and selects their layer', () => {
        advConstraints$.next([
          makeConstraint({ datalayer: 1 }),
          makeConstraint({ datalayer: 42 }), // unknown layer, dropped
        ]);

        expect(selected().length).toBe(1);
        expect(selected()[0].datalayer).toBe(1);
        expect(selected()[0].name).toContain('Test Layer One');
        expect(dataLayerState.addSelectedLayer).toHaveBeenCalledWith(layerOne);
      });
    });

    describe('handleConstraintAdded', () => {
      it('appends a new constraint and selects its layer', () => {
        const constraint = makeConstraint();

        component.handleConstraintAdded(constraint);

        expect(selected()).toEqual([constraint]);
        expect(dataLayerState.addSelectedLayer).toHaveBeenCalledWith(layerOne);
      });

      it('replaces an existing constraint with the same name', () => {
        const updated = makeConstraint({ value: '15' });
        select(makeConstraint({ value: '10' }));

        component.handleConstraintAdded(updated);

        expect(selected()).toEqual([updated]);
      });
    });

    describe('handleUpdateConstraint', () => {
      it('merges into the constraint with the same datalayer id', () => {
        select(makeConstraint({ datalayer: 1, value: '10' }));

        component.handleUpdateConstraint(
          makeConstraint({ datalayer: 1, value: '99' })
        );

        expect(selected()[0].value).toBe('99');
      });

      it('does nothing when no constraint matches the datalayer id', () => {
        const original = makeConstraint({ datalayer: 1 });
        select(original);

        component.handleUpdateConstraint(makeConstraint({ datalayer: 2 }));

        expect(selected()).toEqual([original]);
      });
    });

    describe('removal', () => {
      it('removeSelectionById removes the constraint and deselects its layer', () => {
        select(
          makeConstraint({ datalayer: 1 }),
          makeConstraint({ datalayer: 2 })
        );

        component.removeSelectionById(1);

        expect(selected().map((c) => c.datalayer)).toEqual([2]);
        expect(dataLayerState.removeSelectedLayer).toHaveBeenCalledWith(
          layerOne
        );
      });

      it('removeSelectionById does not deselect anything for an unknown layer', () => {
        select(makeConstraint({ datalayer: 999 }));

        component.removeSelectionById(999);

        expect(selected()).toEqual([]);
        expect(dataLayerState.removeSelectedLayer).not.toHaveBeenCalled();
      });

      it('handleConstraintRemoved removes by name', () => {
        select(
          makeConstraint({ datalayer: 1, name: 'A' }),
          makeConstraint({ datalayer: 2, name: 'B' })
        );

        component.handleConstraintRemoved('A');

        expect(selected().map((c) => c.name)).toEqual(['B']);
      });
    });

    describe('handleSelectedLayer', () => {
      it('removes an already-selected layer without opening a dialog', () => {
        select(makeConstraint({ datalayer: 1 }));

        component.handleSelectedLayer(layerOne);

        expect(selected()).toEqual([]);
        expect(dialogSpy.open).not.toHaveBeenCalled();
      });

      it('opens the dialog for an unselected layer and adds the result on SAVE', () => {
        const newConstraint = makeConstraint({ name: 'Slope: > 10' });
        closeDialogWith({ action: 'SAVE', payload: newConstraint });

        component.handleSelectedLayer(layerOne);

        expect(dialogSpy.open).toHaveBeenCalled();
        expect(selected()).toEqual([newConstraint]);
      });

      it('removes by id on DELETE', () => {
        select(makeConstraint({ datalayer: 1 }));
        closeDialogWith({ action: 'DELETE', payload: 1 });

        component.handleSelectedLayer(layerTwo);

        expect(selected()).toEqual([]);
      });
    });

    describe('toggleLayersSection', () => {
      it('flips showLayersPanel on each call', () => {
        expect(component.showLayersPanel).toBeFalse();
        component.toggleLayersSection();
        expect(component.showLayersPanel).toBeTrue();
        component.toggleLayersSection();
        expect(component.showLayersPanel).toBeFalse();
      });
    });

    describe('handleConstraintChipClicked', () => {
      it('sets activeConstraint$ but opens no dialog when the layer is unknown', () => {
        const constraint = makeConstraint({ datalayer: 999 });

        component.handleConstraintChipClicked(constraint);

        expect(component.activeConstraint$.value).toEqual(constraint);
        expect(dialogSpy.open).not.toHaveBeenCalled();
      });

      it('opens the dialog in EDIT mode for a simple operator', () => {
        closeDialogWith({ action: 'CANCEL', payload: null });

        component.handleConstraintChipClicked(
          makeConstraint({ operator: 'gt', value: '10' })
        );

        expect(dialogData()).toEqual(
          jasmine.objectContaining({
            mode: 'EDIT',
            dataLayerName: 'Test Layer One',
            operator: 'gt',
            valueOne: '10',
            valueTwo: null,
          })
        );
      });

      it('splits and sorts a "btw" value regardless of input order', () => {
        closeDialogWith({ action: 'CANCEL', payload: null });

        component.handleConstraintChipClicked(
          makeConstraint({ operator: 'btw', value: '20,5' })
        );

        expect(dialogData()['valueOne']).toBe('5');
        expect(dialogData()['valueTwo']).toBe('20');
      });

      it('applies the update and clears activeConstraint$ on SAVE', () => {
        select(makeConstraint({ value: '10' }));
        closeDialogWith({
          action: 'SAVE',
          payload: makeConstraint({ value: '50' }),
        });

        component.handleConstraintChipClicked(makeConstraint({ value: '10' }));

        expect(component.activeConstraint$.value).toBeNull();
        expect(selected()[0].value).toBe('50');
      });

      it('removes by payload.id and clears activeConstraint$ on DELETE', () => {
        select(makeConstraint({ datalayer: 1 }));
        closeDialogWith({ action: 'DELETE', payload: { id: 1 } });

        component.handleConstraintChipClicked(makeConstraint({ datalayer: 1 }));

        expect(selected()).toEqual([]);
        expect(component.activeConstraint$.value).toBeNull();
      });
    });
  });
});
