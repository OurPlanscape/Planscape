import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreasMetricsComponent } from './project-areas-metrics.component';

describe('ProjectAreasMetricsComponent', () => {
  let component: ProjectAreasMetricsComponent;
  let fixture: ComponentFixture<ProjectAreasMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectAreasMetricsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreasMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
