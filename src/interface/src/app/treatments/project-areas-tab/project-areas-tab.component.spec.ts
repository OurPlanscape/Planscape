import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreasTabComponent } from './project-areas-tab.component';
import { MockProvider } from 'ng-mocks';
import { TreatmentsState } from '../treatments.state';
import { RouterTestingModule } from '@angular/router/testing';

describe('ProjectAreasTabComponent', () => {
  let component: ProjectAreasTabComponent;
  let fixture: ComponentFixture<ProjectAreasTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreasTabComponent, RouterTestingModule],
      providers: [MockProvider(TreatmentsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreasTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
