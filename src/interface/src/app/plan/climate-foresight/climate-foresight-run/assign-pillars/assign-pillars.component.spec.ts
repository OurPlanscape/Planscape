import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignPillarsComponent } from './assign-pillars.component';
import { MockDeclarations } from 'ng-mocks';
import { ButtonComponent, SectionComponent } from '@styleguide';

describe('AssignPillarsComponent', () => {
  let component: AssignPillarsComponent;
  let fixture: ComponentFixture<AssignPillarsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignPillarsComponent],
      declarations: [MockDeclarations(SectionComponent, ButtonComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignPillarsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
