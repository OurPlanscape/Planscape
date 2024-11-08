import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintableTxFooterComponent } from './printable-tx-footer.component';

describe('PrintableTxFooterComponent', () => {
  let component: PrintableTxFooterComponent;
  let fixture: ComponentFixture<PrintableTxFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintableTxFooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintableTxFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
