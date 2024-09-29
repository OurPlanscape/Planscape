import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreaTreatmentsTabComponent } from './treatments-tab.component';

describe('ProjectAreaTreatmentsTabComponent', () => {
  let component: ProjectAreaTreatmentsTabComponent;
  let fixture: ComponentFixture<ProjectAreaTreatmentsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreaTreatmentsTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreaTreatmentsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
