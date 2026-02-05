import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignPillarsComponent } from '@app/plan/climate-foresight/climate-foresight-run/assign-pillars/assign-pillars.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { ButtonComponent, SectionComponent } from '@styleguide';
import { MatDialogModule } from '@angular/material/dialog';
import { ClimateForesightService } from '@services';
import { BehaviorSubject } from 'rxjs';
import { DataLayer } from '@types';

describe('AssignPillarsComponent', () => {
  let component: AssignPillarsComponent;
  let fixture: ComponentFixture<AssignPillarsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignPillarsComponent, MatDialogModule],
      declarations: [MockDeclarations(SectionComponent, ButtonComponent)],
      providers: [
        MockProvider(ClimateForesightService, {
          getDataLayers: () => new BehaviorSubject([] as DataLayer[]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignPillarsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
