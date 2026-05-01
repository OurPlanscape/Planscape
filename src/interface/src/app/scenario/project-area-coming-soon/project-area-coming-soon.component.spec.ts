import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreaComingSoonComponent } from './project-area-coming-soon.component';

describe('ProjectAreaComingSoonComponent', () => {
  let component: ProjectAreaComingSoonComponent;
  let fixture: ComponentFixture<ProjectAreaComingSoonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreaComingSoonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreaComingSoonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
