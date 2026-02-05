import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverlayLoaderComponent } from './overlay-loader.component';

describe('OverlayLoaderComponent', () => {
  let component: OverlayLoaderComponent;
  let fixture: ComponentFixture<OverlayLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverlayLoaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OverlayLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
