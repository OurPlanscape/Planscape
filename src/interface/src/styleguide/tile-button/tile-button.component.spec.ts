import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileButtonComponent } from '@styleguide/tile-button/tile-button.component';

describe('TileButtonComponent', () => {
  let component: TileButtonComponent;
  let fixture: ComponentFixture<TileButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TileButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit tileClick event when clicked and not disabled', () => {
    spyOn(component.tileClick, 'emit');
    const event = new MouseEvent('click');
    component.handleClick(event);
    expect(component.tileClick.emit).toHaveBeenCalled();
  });

  it('should not emit tileClick event when disabled', () => {
    component.disabled = true;
    spyOn(component.tileClick, 'emit');
    const event = new MouseEvent('click');
    component.handleClick(event);
    expect(component.tileClick.emit).not.toHaveBeenCalled();
  });
});
