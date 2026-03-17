import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ScenarioCardComponent } from './scenario-card.component';

describe('ScenarioCardComponent', () => {
  let component: ScenarioCardComponent;
  let fixture: ComponentFixture<ScenarioCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioCardComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('returns chip status and label for known statuses', () => {
    component.resultStatus = 'SUCCESS';

    expect(component.getChipStatus()).toBe('success');
    expect(component.getChipLabel()).toBe('Done');

    component.resultStatus = 'FAILURE';
    expect(component.getChipStatus()).toBe('failed');
    expect(component.getChipLabel()).toBe('Failed');
  });

  it('computes status helpers correctly', () => {
    component.resultStatus = 'RUNNING';
    expect(component.isRunning()).toBeTrue();
    expect(component.isDone()).toBeFalse();
    expect(component.hasFailed()).toBeFalse();

    component.resultStatus = 'FAILURE';
    expect(component.hasFailed()).toBeTrue();
    expect(component.isRunning()).toBeFalse();
    expect(component.isDone()).toBeFalse();
  });

  it('applies host bindings for disabled state', () => {
    component.resultStatus = 'RUNNING';
    fixture.detectChanges();

    expect(component.disabledContent).toBeTrue();
  });

  it('renders status chip only for system-origin results', () => {
    component.origin = 'SYSTEM';
    component.resultStatus = 'SUCCESS';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('sg-status-chip')).toBeTruthy();

    component.origin = 'USER';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('sg-status-chip')).toBeFalsy();
  });
});
