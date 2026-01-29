import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapActionButtonComponent } from './map-action-button.component';
import { MockDeclarations } from 'ng-mocks';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('MapActionButtonComponent', () => {
  let component: MapActionButtonComponent;
  let fixture: ComponentFixture<MapActionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapActionButtonComponent, NoopAnimationsModule],
      declarations: MockDeclarations(ControlComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapActionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits when handleClick is called', () => {
    const emitSpy = spyOn(component.clickedActionButton, 'emit');

    component.handleClick();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('emits when the button is clicked', () => {
    const emitSpy = spyOn(component.clickedActionButton, 'emit');
    const button = fixture.nativeElement.querySelector('button');

    button.click();

    expect(emitSpy).toHaveBeenCalled();
  });
});
