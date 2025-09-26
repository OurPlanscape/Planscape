import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Step4Component } from './step4.component';
import { FeaturesModule } from 'src/app/features/features.module';

describe('Step4LegacyComponent', () => {
  let component: Step4Component;
  let fixture: ComponentFixture<Step4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        BrowserAnimationsModule,
        NgxMaskModule.forRoot(),
        Step4Component,
        FeaturesModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
