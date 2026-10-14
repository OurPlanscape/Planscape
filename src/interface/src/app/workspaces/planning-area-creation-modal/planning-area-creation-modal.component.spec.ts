import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaCreationModalComponent } from './planning-area-creation-modal.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { PlanService } from '@app/services';
import {
  FileUploadFieldComponent,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('PlanningAreaCreationModalComponent', () => {
  let component: PlanningAreaCreationModalComponent;
  let fixture: ComponentFixture<PlanningAreaCreationModalComponent>;
  let dialogRef: { close: jasmine.Spy };
  let router: { routerState: any; navigate: jasmine.Spy };

  /** Route tree the router would expose while inside a workspace. */
  const routerStateWith = (workspaceId?: string) => ({
    snapshot: {
      root: {
        pathFromRoot: [],
        firstChild: {
          paramMap: new Map(workspaceId ? [['workspaceId', workspaceId]] : []),
          firstChild: null,
        },
      },
    },
  });

  beforeEach(async () => {
    dialogRef = { close: jasmine.createSpy('close') };
    router = {
      routerState: routerStateWith(),
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [PlanningAreaCreationModalComponent],
      declarations: [
        MockDeclarations(
          ModalComponent,
          ModalInfoComponent,
          InputFieldComponent,
          FileUploadFieldComponent
        ),
      ],
      providers: [
        MockProvider(PlanService),
        MockProvider(MatSnackBar),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: Router, useValue: router },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: {} } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaCreationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('after creating the planning area', () => {
    function upload() {
      spyOn(TestBed.inject(PlanService), 'createPlan').and.returnValue(
        of({ id: 5 } as any)
      );
      component.geometry = { type: 'Polygon' };
      component.planningAreaForm.setValue({ name: 'North', file: 'uploaded' });

      component.submit();
    }

    it('closes with the new planning area id', () => {
      upload();

      expect(dialogRef.close).toHaveBeenCalledWith(5);
    });

    it('goes to the planning area dashboard, flagged as uploaded', () => {
      upload();

      expect(router.navigate).toHaveBeenCalledWith(['/plan/5'], {
        state: { planningAreaCreated: 'uploaded' },
      });
    });

    it('keeps the workspace prefix when inside a workspace', () => {
      router.routerState = routerStateWith('2');

      upload();

      expect(router.navigate).toHaveBeenCalledWith(['/workspace/2/plan/5'], {
        state: { planningAreaCreated: 'uploaded' },
      });
    });
  });
});
