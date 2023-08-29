import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerInfoCardComponent } from './layer-info-card.component';

describe('LayerInfoCardComponent', () => {
  let component: LayerInfoCardComponent;
  let fixture: ComponentFixture<LayerInfoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LayerInfoCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LayerInfoCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
