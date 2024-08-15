import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrescriptionActionsComponent } from './prescription-actions.component';
import { MockProvider } from 'ng-mocks';
import { LookupService } from '@services/lookup.service';

describe('PrescriptionActionsComponent', () => {
  let component: PrescriptionActionsComponent;
  let fixture: ComponentFixture<PrescriptionActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrescriptionActionsComponent],
      providers: [MockProvider(LookupService)],
    }).compileComponents();

    fixture = TestBed.createComponent(PrescriptionActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
