import { DeletePlanDialogComponent } from './delete-plan-dialog/delete-plan-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { PlanPreview, Region } from 'src/app/types';

import { PlanService } from './../../services/plan.service';
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
  let fakeService: PlanService;
  let routerStub = () => ({ navigate: (array: string[]) => ({}) });

  beforeEach(async () => {
    fakeService = jasmine.createSpyObj('PlanService', {
      deletePlan: of('1'),
      listPlansByUser: of([fakePlan]),
    });

    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MaterialModule],
      declarations: [PlanTableComponent],
      providers: [
        { provide: PlanService, useValue: fakeService },
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
      expect(fakeService.listPlansByUser).toHaveBeenCalledTimes(1);
      expect(component.datasource.data).toEqual([
        {
          ...fakePlan,
          selected: false,
        },
      ]);
    });
  });

  describe('create', () => {
    it('create button should navigate to region selection', async () => {
      const routerStub: Router = fixture.debugElement.injector.get(Router);
      spyOn(routerStub, 'navigate').and.callThrough();
      const button = await loader.getHarness(MatButtonHarness);

      await button.click();

      expect(routerStub.navigate).toHaveBeenCalledOnceWith(['region']);
    });
  });

  describe('refresh', () => {
    it('should fetch plans from the DB', () => {
      component.refresh();
      expect(fakeService.listPlansByUser).toHaveBeenCalledTimes(2);
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

      expect(fakeService.deletePlan).toHaveBeenCalledOnceWith(['1']);
    });

    it('when dialog is closed with value false, do nothing', () => {
      const fakeDialogRef: MatDialogRef<DeletePlanDialogComponent> =
        jasmine.createSpyObj('MatDialogRef<DeletePlanDialogComponent>', {
          afterClosed: of(false),
        });
      const dialogSpy: MatDialog = fixture.debugElement.injector.get(MatDialog);
      spyOn(dialogSpy, 'open').and.returnValue(fakeDialogRef);

      component.delete('1');

      expect(fakeService.deletePlan).toHaveBeenCalledTimes(0);
    });
  });
});
