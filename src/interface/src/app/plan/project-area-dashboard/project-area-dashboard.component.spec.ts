import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreaDashboardComponent } from './project-area-dashboard.component';

describe('ProjectAreaDashboardComponent', () => {
  let component: ProjectAreaDashboardComponent;
  let fixture: ComponentFixture<ProjectAreaDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreaDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProjectAreaDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
