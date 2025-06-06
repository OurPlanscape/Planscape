import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import {
  PlanCreateDialogComponent,
  PlanCreateDialogData,
} from './plan-create-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { PlanService, SessionService } from '@services';
import { BehaviorSubject, of } from 'rxjs';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { DialogModule } from '@angular/cdk/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Region, regionToString } from '@types';
import { Geometry } from 'geojson';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MockProvider } from 'ng-mocks';
import { AnalyticsService } from '@services/analytics.service';

describe('PlanCreateDialogComponent', () => {
  let component: PlanCreateDialogComponent;
  let fixture: ComponentFixture<PlanCreateDialogComponent>;
  const fakeGeometry: Geometry = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [10, 20],
          [10, 30],
          [15, 15],
        ],
      ],
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        LegacyMaterialModule,
        DialogModule,
        NoopAnimationsModule,
      ],
      declarations: [PlanCreateDialogComponent],
      providers: [
        MockProvider(AnalyticsService),
        {
          provide: PlanService,
          useValue: {
            planNameExists: () => of(false),
            createPlan: () => new BehaviorSubject({ result: { id: 'planId' } }),
          },
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            shape: fakeGeometry,
            totalArea: 1000,
          } as PlanCreateDialogData,
        },
        {
          provide: SessionService,
          useValue: { region$: new BehaviorSubject(Region.SIERRA_NEVADA) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent() {
    fixture = TestBed.createComponent(PlanCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  describe('submit', () => {
    beforeEach(() => createComponent());

    it('should submit if there is a plan name', fakeAsync(() => {
      const dialogRef = TestBed.inject(MatDialogRef<PlanCreateDialogComponent>);
      spyOn(dialogRef, 'close');
      component.planForm.setValue({
        planName: 'some plan',
      });

      const saveBtn = fixture.debugElement.query(
        By.css('[data-id="save"]')
      ).nativeElement;
      saveBtn.click();
      tick();
      expect(dialogRef.close).toHaveBeenCalledTimes(1);
    }));
    it('should not submit if there is not a plan name', () => {
      const dialogRef = TestBed.inject(MatDialogRef<PlanCreateDialogComponent>);
      spyOn(dialogRef, 'close');

      const saveBtn = fixture.debugElement.query(
        By.css('[data-id="save"]')
      ).nativeElement;
      saveBtn.click();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not submit if a plan already has the same name', () => {
      const dialogRef = TestBed.inject(MatDialogRef<PlanCreateDialogComponent>);
      spyOn(dialogRef, 'close');
      const service = TestBed.inject(PlanService);
      spyOn(service, 'planNameExists').and.returnValue(of(true));

      const saveBtn = fixture.debugElement.query(
        By.css('[data-id="save"]')
      ).nativeElement;
      saveBtn.click();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should save plan', fakeAsync(() => {
      const dialogRef = TestBed.inject(MatDialogRef<PlanCreateDialogComponent>);
      spyOn(dialogRef, 'close');
      component.planForm.setValue({
        planName: 'some plan',
      });
      const planService = TestBed.inject(PlanService);
      spyOn(planService, 'createPlan').and.callThrough();

      const saveBtn = fixture.debugElement.query(
        By.css('[data-id="save"]')
      ).nativeElement;
      saveBtn.click();
      tick();
      expect(planService.createPlan).toHaveBeenCalledWith({
        name: 'some plan',
        region_name: regionToString(Region.SIERRA_NEVADA),
        geometry: fakeGeometry,
      });
    }));
  });

  describe('total area warning', () => {
    it('should show warning if total area is not valid', async () => {
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: { shape: fakeGeometry, totalArea: 99 },
      });
      createComponent();

      const info = fixture.debugElement.query(
        By.css('[data-id="totalAreaError"]')
      );

      expect(info).toBeTruthy();
    });

    it('should not show warning if total area is valid', () => {
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: { shape: fakeGeometry, totalArea: 100 },
      });
      createComponent();
      const info = fixture.debugElement.query(
        By.css('[data-id="totalAreaError"]')
      );

      expect(info).toBeNull();
    });
  });
});
