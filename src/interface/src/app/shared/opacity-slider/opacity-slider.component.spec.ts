import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

import { OpacitySliderComponent } from './opacity-slider.component';

describe('OpacitySliderComponent', () => {
  let component: OpacitySliderComponent;
  let fixture: ComponentFixture<OpacitySliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyMaterialModule],
      declarations: [OpacitySliderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OpacitySliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should convert decimal opacity to percentage', () => {
    component.opacity = 0.6;
    component.ngOnChanges();

    expect(component.opacityPercentage).toEqual(60);
  });

  it('should emit event when opacity value changes', () => {
    spyOn(component.changeOpacity, 'emit');

    component.onChange(35);

    expect(component.changeOpacity.emit).toHaveBeenCalledOnceWith(0.35);
  });
});
