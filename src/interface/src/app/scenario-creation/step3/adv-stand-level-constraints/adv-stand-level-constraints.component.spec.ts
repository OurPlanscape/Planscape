import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { AdvStandLevelConstraintsComponent } from './adv-stand-level-constraints.component';
import { AdvStandLevelConstraintsModalComponent } from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AdvStandLevelConstraintsComponent],
  template: `
    <form [formGroup]="form">
      <app-adv-stand-level-constraints
        formGroupName="advStandLevelConstraints"
        [constraintLayers]="constraintLayers"
        keyName="advStandLevelConstraints"></app-adv-stand-level-constraints>
    </form>
  `,
})
class TestHostComponent {
  form = new FormGroup({
    advStandLevelConstraints: new FormGroup({}),
  });
  constraintLayers = [];
}

describe('AdvStandLevelConstraintsComponent', () => {
  let component: AdvStandLevelConstraintsComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        TestHostComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        {
          provide: MatDialog,
          useValue: AdvStandLevelConstraintsModalComponent,
        },
        MockProvider(NewScenarioState, {
          constraints$: of([]),
        }),
      ],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    component = hostFixture.debugElement.query(
      By.directive(AdvStandLevelConstraintsComponent)
    ).componentInstance;
    hostFixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
