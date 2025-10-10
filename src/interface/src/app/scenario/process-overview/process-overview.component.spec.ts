import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessOverviewComponent } from './process-overview.component';
import { MockDeclaration } from 'ng-mocks';
import { SectionComponent } from '@styleguide';

describe('ProcessOverviewComponent', () => {
  let component: ProcessOverviewComponent;
  let fixture: ComponentFixture<ProcessOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MockDeclaration(SectionComponent)],
      imports: [ProcessOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
