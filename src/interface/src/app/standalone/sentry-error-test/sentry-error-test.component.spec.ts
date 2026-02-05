import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SentryErrorTestComponent } from './sentry-error-test.component';

describe('SentryErrorTestComponent', () => {
  let component: SentryErrorTestComponent;
  let fixture: ComponentFixture<SentryErrorTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SentryErrorTestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SentryErrorTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
