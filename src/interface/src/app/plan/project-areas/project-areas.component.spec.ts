import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectAreasComponent } from './project-areas.component';

describe('ProjectAreasComponent', () => {
  let component: ProjectAreasComponent;
  let fixture: ComponentFixture<ProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectAreasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreasComponent);
    component = fixture.componentInstance;
    component.areas = [
      { id: 1, acres: 123, percentTotal: 12, estimatedCost: '$12k', score: 12 },
    ];
    component.total = {
      acres: 983,
      percentTotal: 32.2,
      estimatedCost: '$432k',
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
