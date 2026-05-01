import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentEffectsHomeComponent } from './treatment-effects-home.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('TreatmentEffectsHomeComponent', () => {
  let component: TreatmentEffectsHomeComponent;
  let fixture: ComponentFixture<TreatmentEffectsHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TreatmentEffectsHomeComponent],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentEffectsHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
