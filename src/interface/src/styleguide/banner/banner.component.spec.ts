import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BannerComponent, BannerType } from './banner.component';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';

@Component({
  template: `
    <sg-banner
      [type]="type"
      [dismissible]="dismissible"
      (dismiss)="onDismiss()"></sg-banner>
  `,
})
class TestHostComponent {
  type: BannerType = 'info';
  dismissible = false;
  dismissed = false;

  onDismiss() {
    this.dismissed = true;
  }
}

describe('BannerComponent', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatIconModule, NoopAnimationsModule, BannerComponent],
      declarations: [TestHostComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default inputs', () => {
    expect(component.type).toBe('info');
    expect(component.dismissible).toBe(false);
  });

  it('should apply correct class based on type input', () => {
    const bannerElement = fixture.debugElement.nativeElement;
    component.type = 'warning';
    fixture.detectChanges();
    expect(bannerElement.classList).toContain('warning');

    component.type = 'error';
    fixture.detectChanges();
    expect(bannerElement.classList).toContain('error');

    component.type = 'success';
    fixture.detectChanges();
    expect(bannerElement.classList).toContain('success');
  });

  it('should display dismiss icon when dismissible is true', () => {
    hostComponent.dismissible = true;
    hostFixture.detectChanges();
    const dismissIcon = hostFixture.debugElement.query(By.css('.close'));
    expect(dismissIcon).toBeTruthy();
  });

  it('should emit dismiss event when dismiss icon is clicked', () => {
    hostComponent.dismissible = true;
    hostFixture.detectChanges();
    const dismissIcon = hostFixture.debugElement.query(By.css('.close'));
    dismissIcon.triggerEventHandler('click', null);
    expect(hostComponent.dismissed).toBe(true);
  });
});
