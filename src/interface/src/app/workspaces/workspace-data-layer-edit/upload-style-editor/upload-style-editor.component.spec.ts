import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StyleJson } from '@types';
import { UploadStyleEditorComponent } from './upload-style-editor.component';
import {
  createStyleForm,
  fillStyleForm,
  MAX_STYLE_ENTRIES,
  UploadStyleForm,
} from './upload-style-form';
import { STYLE_PALETTES } from './upload-style-palettes';

const STYLE: StyleJson = {
  map_type: 'RAMP',
  entries: [
    { value: 0, color: '#000000' },
    { value: 10, color: '#ffffff' },
  ],
};

describe('UploadStyleEditorComponent', () => {
  let fixture: ComponentFixture<UploadStyleEditorComponent>;
  let component: UploadStyleEditorComponent;
  let form: UploadStyleForm;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadStyleEditorComponent, NoopAnimationsModule],
    }).compileComponents();

    form = createStyleForm();
    fillStyleForm(form, STYLE, true);
    fixture = TestBed.createComponent(UploadStyleEditorComponent);
    component = fixture.componentInstance;
    component.form = form;
    component.range = { min: 0, max: 100 };
    fixture.detectChanges();
  });

  it('shows a row per break', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('hides every control while the custom style is off', () => {
    fillStyleForm(form, STYLE, false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.style-fields')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Using the automatic color scale'
    );
  });

  it('resets to the automatic color scale', () => {
    const automatic: StyleJson = {
      map_type: 'RAMP',
      entries: [
        { value: 1, color: '#111111' },
        { value: 2, color: '#222222' },
        { value: 3, color: '#333333' },
      ],
    };
    component.automaticStyle = automatic;
    form.controls.map_type.setValue('VALUES');
    component.removeEntry(0);

    component.reset();

    expect(form.controls.map_type.value).toBe('RAMP');
    expect(form.getRawValue().entries.map((e) => e.value)).toEqual([1, 2, 3]);
    expect(form.controls.custom.value).toBeTrue();
    expect(form.dirty).toBeTrue();
  });

  it('hides Reset without an automatic color scale', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).map((b) => b.textContent?.trim());
    expect(labels).not.toContain('Reset');
  });

  it('recolors the breaks with a palette', () => {
    component.applyPalette(STYLE_PALETTES[1]);

    expect(form.controls.entries.at(0).controls.color.value).toBe('#440154');
    expect(form.controls.entries.at(1).controls.color.value).toBe('#fde725');
    expect(form.dirty).toBeTrue();
  });

  it('highlights the palette the breaks are colored with', () => {
    const viridis = STYLE_PALETTES.find((p) => p.name === 'Viridis')!;
    component.applyPalette(viridis);
    fixture.detectChanges();

    const active = fixture.nativeElement.querySelectorAll('.palette.active');
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('aria-label')).toContain('Viridis');

    form.controls.entries.at(0).controls.color.setValue('#123456');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.palette.active')).toBeNull();
  });

  it('shows the raster value range', () => {
    component.range = { min: 5, max: 23652 };
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Values in this layer range from 5 to 23,652.'
    );
  });

  it('spreads breaks over the raster range', () => {
    component.applyEvenBreaks();

    expect(form.getRawValue().entries.map((e) => e.value)).toEqual([0, 100]);
  });

  it('adds a break after the last one', () => {
    component.addEntry();

    expect(form.controls.entries.length).toBe(3);
    expect(form.controls.entries.at(2).controls.value.value).toBe(20);
    expect(form.valid).toBeTrue();
  });

  it('keeps at least two breaks', () => {
    component.removeEntry(0);

    expect(form.controls.entries.length).toBe(2);
  });

  it('removes a break', () => {
    component.addEntry();
    component.removeEntry(0);

    expect(form.getRawValue().entries.map((e) => e.value)).toEqual([10, 20]);
  });

  it('stops adding at the maximum', () => {
    for (let i = 0; i < MAX_STYLE_ENTRIES + 3; i++) {
      component.addEntry();
    }
    expect(form.controls.entries.length).toBe(MAX_STYLE_ENTRIES);
  });

  it('explains out-of-order values', () => {
    form.controls.entries.at(1).controls.value.setValue(-5);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Values must go from lowest to highest.'
    );
  });
});
