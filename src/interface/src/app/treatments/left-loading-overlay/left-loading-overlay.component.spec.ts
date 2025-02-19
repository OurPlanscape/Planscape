import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftLoadingOverlayComponent } from './left-loading-overlay.component';

describe('LeftLoadingOverlayComponent', () => {
  let component: LeftLoadingOverlayComponent;
  let fixture: ComponentFixture<LeftLoadingOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftLoadingOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LeftLoadingOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
