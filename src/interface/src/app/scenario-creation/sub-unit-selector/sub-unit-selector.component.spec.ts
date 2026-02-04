import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SubUnitSelectorComponent } from './sub-unit-selector.component';
import { FormControl, FormGroup } from '@angular/forms';

describe('SubUnitSelectorComponent', () => {
  let component: SubUnitSelectorComponent;
  let fixture: ComponentFixture<SubUnitSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, SubUnitSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubUnitSelectorComponent);
    component = fixture.componentInstance;
    component.form = new FormGroup({
      subunit: new FormControl<number | undefined>(undefined),
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
