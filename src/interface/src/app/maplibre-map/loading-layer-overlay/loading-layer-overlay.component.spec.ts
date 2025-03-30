import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingLayerOverlayComponent } from './loading-layer-overlay.component';

describe('LoadingLayerOverlayComponent', () => {
  let component: LoadingLayerOverlayComponent;
  let fixture: ComponentFixture<LoadingLayerOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingLayerOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingLayerOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
