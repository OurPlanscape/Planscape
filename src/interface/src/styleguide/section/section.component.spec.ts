import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionComponent } from '@styleguide/section/section.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CollapsiblePanelComponent', () => {
  let component: SectionComponent;
  let fixture: ComponentFixture<SectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
