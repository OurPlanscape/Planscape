import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreasEmptyListComponent } from './project-areas-empty-list.component';

describe('ProjectAreasEmptyListComponent', () => {
  let component: ProjectAreasEmptyListComponent;
  let fixture: ComponentFixture<ProjectAreasEmptyListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreasEmptyListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectAreasEmptyListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
