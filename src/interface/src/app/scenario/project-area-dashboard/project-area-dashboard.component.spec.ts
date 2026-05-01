import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProjectAreaDashboardComponent } from './project-area-dashboard.component';
import { ActivatedRoute } from '@angular/router';

describe('ProjectAreaDashboardComponent', () => {
  let component: ProjectAreaDashboardComponent;
  let fixture: ComponentFixture<ProjectAreaDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ProjectAreaDashboardComponent],
      providers: [{ provide: ActivatedRoute, useValue: { firstChild: {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreaDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
