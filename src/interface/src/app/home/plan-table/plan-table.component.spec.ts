import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { PlanPreview, Region } from 'src/app/types';

import { AuthService } from '../../services/auth.service';
import { PlanService } from '../../services/plan.service';
import { DeletePlanDialogComponent } from './delete-plan-dialog/delete-plan-dialog.component';
import { PlanTableComponent } from './plan-table.component';

describe('PlanTableComponent', () => {
  const fakePlan: PlanPreview = {
    id: 'temp',
    name: 'somePlan',
    region: Region.SIERRA_NEVADA,
  };

  let component: PlanTableComponent;
  let fixture: ComponentFixture<PlanTableComponent>;
  let loader: HarnessLoader;
  let fakeAuthService: AuthService;
  let loggedInStatus$: BehaviorSubject<boolean>;
  let fakePlanService: PlanService;
  let routerStub = () => ({ navigate: (array: string[]) => ({}) });

  beforeEach(async () => {
    loggedInStatus$ = new BehaviorSubject(false);
    fakeAuthService = jasmine.createSpyObj(
      'AuthService',
      {},
      {
        isLoggedIn$: loggedInStatus$,
      }
    );
    fakePlanService = jasmine.createSpyObj('PlanService', {
      deletePlan: of('1'),
      listPlansByUser: of([fakePlan]),
    });

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        MaterialModule,
        ReactiveFormsModule,
      ],
      declarations: [PlanTableComponent],
      providers: [
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
        { provide: PlanService, useValue: fakePlanService },
        { provide: Router, useFactory: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanTableComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should fetch plans from the DB', () => {
      expect(fakePlanService.listPlansByUser).toHaveBeenCalledTimes(2);
      expect(component.datasource.data).toEqual([
        {
          ...fakePlan,
          selected: false,
        },
      ]);
    });
  });

  describe('create', () => {
    it('create button should navigate to explore', async () => {
      const routerStub: Router = fixture.debugElement.injector.get(Router);
      spyOn(routerStub, 'navigate').and.callThrough();
      const button = await loader.getHarness(MatButtonHarness);

      await button.click();

      expect(routerStub.navigate).toHaveBeenCalledOnceWith(['map']);
    });
  });

  describe('refresh', () => {
    it('should fetch plans from the DB', () => {
      component.refresh();
      expect(fakePlanService.listPlansByUser).toHaveBeenCalledTimes(3);
      expect(component.datasource.data).toEqual([
        {
          ...fakePlan,
          selected: false,
        },
      ]);
    });
  });

  describe('delete', () => {
    it('should open a dialog with a single ID to delete', () => {
      const dialogSpy: MatDialog = fixture.debugElement.injector.get(MatDialog);
      spyOn(dialogSpy, 'open').and.callThrough();

      component.delete('1');

      expect(dialogSpy.open).toHaveBeenCalledOnceWith(
        DeletePlanDialogComponent,
        {
          data: ['1'],
        }
      );
    });

    it('should open a dialog with multiple IDs to delete', () => {
      const dialogSpy: MatDialog = fixture.debugElement.injector.get(MatDialog);
      spyOn(dialogSpy, 'open').and.callThrough();

      component.datasource.data = [
        {
          ...fakePlan,
          id: '1',
          selected: true,
        },
        {
          ...fakePlan,
          id: '2',
          selected: true,
        },
        {
          ...fakePlan,
          id: '3',
          selected: false,
        },
      ];
      component.delete();

      expect(dialogSpy.open).toHaveBeenCalledOnceWith(
        DeletePlanDialogComponent,
        {
          data: ['1', '2'],
        }
      );
    });

    it('when dialog is closed with value true, call service to delete', () => {
      const fakeDialogRef: MatDialogRef<DeletePlanDialogComponent> =
        jasmine.createSpyObj('MatDialogRef<DeletePlanDialogComponent>', {
          afterClosed: of(true),
        });
      const dialogSpy: MatDialog = fixture.debugElement.injector.get(MatDialog);
      spyOn(dialogSpy, 'open').and.returnValue(fakeDialogRef);

      component.delete('1');

      expect(fakePlanService.deletePlan).toHaveBeenCalledOnceWith(['1']);
    });

    it('when dialog is closed with value false, do nothing', () => {
      const fakeDialogRef: MatDialogRef<DeletePlanDialogComponent> =
        jasmine.createSpyObj('MatDialogRef<DeletePlanDialogComponent>', {
          afterClosed: of(false),
        });
      const dialogSpy: MatDialog = fixture.debugElement.injector.get(MatDialog);
      spyOn(dialogSpy, 'open').and.returnValue(fakeDialogRef);

      component.delete('1');

      expect(fakePlanService.deletePlan).toHaveBeenCalledTimes(0);
    });
  });

  it('when logged in status changes, refresh plans', () => {
    expect(fakePlanService.listPlansByUser).toHaveBeenCalledTimes(2);

    loggedInStatus$.next(true);

    expect(fakePlanService.listPlansByUser).toHaveBeenCalledTimes(3);
  });
});
