import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenariosEmptyListComponent } from './scenarios-empty-list.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// import { UploadProjectAreasModalComponent } from '@app/plan/upload-project-areas-modal/upload-project-areas-modal.component';
import { ScenarioSetupModalComponent } from '@app/scenario/scenario-setup-modal/scenario-setup-modal.component';
import { Plan } from '@app/types';
import { MOCK_GEOJSON, MOCK_PLAN } from '@app/services/mocks';
import { of } from 'rxjs';

describe('ScenariosEmptyListComponent', () => {
  let component: ScenariosEmptyListComponent;
  let fixture: ComponentFixture<ScenariosEmptyListComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  const plan: Plan = { ...MOCK_PLAN, id: 24, geometry: MOCK_GEOJSON };

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      imports: [ScenariosEmptyListComponent, MatDialogModule],
      providers: [{ provide: MatDialog, useValue: dialogSpy }],
    }).compileComponents();
  });

  describe('when plan is not provided', () => {
    it('throws because plan is a required input', () => {
      fixture = TestBed.createComponent(ScenariosEmptyListComponent);
      // deliberately NOT setting component.plan here
      expect(() => fixture.detectChanges()).toThrow();
    });
  });

  describe('when plan is provided', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(ScenariosEmptyListComponent);
      component = fixture.componentInstance;
      component.plan = plan;
      fixture.detectChanges();
    });

    it('returns true when the plan permits adding scenarios', () => {
      const planThatAllows: Plan = { ...plan, permissions: ['add_scenario'] };
      component.plan = planThatAllows;
      expect(component.canAddScenarios).toBe(true);
    });

    it('returns false when the plan does not permit adding scenarios', () => {
      const planThatBlocks: Plan = {
        ...plan,
        permissions: ['nothing_relevant_here'],
      };
      component.plan = planThatBlocks;
      expect(component.canAddScenarios).toBe(false);
    });

    it('passes plan id into the scenario setup dialog', () => {
      component.openScenarioSetupDialog('PRESET');
      expect(dialogSpy.open).toHaveBeenCalledWith(
        ScenarioSetupModalComponent,
        jasmine.objectContaining({
          maxWidth: '560px',
          data: { planId: plan.id, fromClone: false, type: 'PRESET' },
        })
      );
    });
  });
});
