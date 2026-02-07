import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

import { Step1CustomComponent } from './step1-custom.component';
import { ProcessOverviewComponent } from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { STAND_SIZE } from '@plan/plan-helpers';

@Component({ selector: 'sg-process-overview', template: '', standalone: true })
class MockProcessOverviewComponent {
  @Input() steps: any;
}

@Component({
  selector: 'app-stand-size-selector',
  template: '',
  standalone: true,
})
class MockStandSizeSelectorComponent {
  control = new FormControl<STAND_SIZE | null>(null);
}

describe('Step1CustomComponent', () => {
  let component: Step1CustomComponent;
  let fixture: ComponentFixture<Step1CustomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1CustomComponent, NoopAnimationsModule],
    })
      .overrideComponent(Step1CustomComponent, {
        remove: {
          imports: [ProcessOverviewComponent, StandSizeSelectorComponent],
        },
        add: {
          imports: [
            MockProcessOverviewComponent,
            MockStandSizeSelectorComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Step1CustomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
