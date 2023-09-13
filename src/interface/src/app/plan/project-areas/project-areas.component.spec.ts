import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreasComponent } from './project-areas.component';

describe('ProjectAreasComponent', () => {
  let component: ProjectAreasComponent;
  let fixture: ComponentFixture<ProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectAreasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
