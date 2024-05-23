import { AuthService, PlanService } from '@services';
import { BehaviorSubject, of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteDialogComponent } from '../../standalone/delete-dialog/delete-dialog.component';
import { FeaturesModule } from '../../features/features.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MOCK_PLAN } from '@services/mocks';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { MockComponent } from 'ng-mocks';
import { Plan } from '@types';
import { PlanTableComponent } from './plan-table.component';
import { Router } from '@angular/router';
import { SectionLoaderComponent } from '@shared';

describe('PlanTableComponent', () => {
  const fakePlan1: Plan = MOCK_PLAN;
  const fakePlan2: Plan = { ...MOCK_PLAN, id: 2 };

  let component: PlanTableComponent;
  let fixture: ComponentFixture<PlanTableComponent>;
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
      listPlansByUser: of([fakePlan1, fakePlan2]),
    });

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        LegacyMaterialModule,
        ReactiveFormsModule,
        FeaturesModule,
      ],
      declarations: [PlanTableComponent, MockComponent(SectionLoaderComponent)],
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('refresh', () => {
    it('should fetch plans from the DB', () => {
      component.refresh();
      expect(fakePlanService.listPlansByUser).toHaveBeenCalledTimes(2);
      expect(component.datasource.data).toEqual([fakePlan1, fakePlan2]);
    });
  });

  describe('delete', () => {
    it('should open a dialog with a single ID to delete', () => {
      const dialogSpy: MatDialog = fixture.debugElement.injector.get(MatDialog);
      spyOn(dialogSpy, 'open').and.callThrough();
      component.selectedPlan = fakePlan1;
      component.deletePlan();

      expect(dialogSpy.open).toHaveBeenCalledOnceWith(DeleteDialogComponent, {
        data: { name: `"${MOCK_PLAN.name}"` },
      });
    });
  });
});
