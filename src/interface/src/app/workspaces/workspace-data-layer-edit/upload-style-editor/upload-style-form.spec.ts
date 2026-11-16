import { StyleJson } from '@types';
import {
  createStyleEntry,
  createStyleForm,
  draftStyle,
  fillStyleForm,
  setCustomStyle,
  stylePayload,
} from './upload-style-form';
import {
  evenBreaks,
  paletteColors,
  STYLE_PALETTES,
} from './upload-style-palettes';

const STYLE: StyleJson = {
  map_type: 'RAMP',
  no_data: { values: ['nan'], color: undefined, opacity: 0, label: '' },
  entries: [
    { value: 0, color: '#000000', opacity: 1, label: '0.0' },
    { value: 5, color: '#777777', opacity: 1, label: 'Middle' },
    { value: 10, color: '#ffffff', opacity: 1, label: '10' },
  ],
};

describe('upload style form', () => {
  it('fills from a saved style, hiding labels that repeat the value', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, true);

    expect(form.getRawValue()).toEqual({
      custom: true,
      map_type: 'RAMP',
      entries: [
        { value: 0, color: '#000000', label: '' },
        { value: 5, color: '#777777', label: 'Middle' },
        { value: 10, color: '#ffffff', label: '' },
      ],
    });
    expect(form.pristine).toBeTrue();
  });

  it('disables the editor while the custom style is off', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, false);

    expect(form.controls.entries.disabled).toBeTrue();
    expect(form.controls.map_type.disabled).toBeTrue();
    expect(form.controls.custom.enabled).toBeTrue();

    setCustomStyle(form, true);
    expect(form.controls.entries.enabled).toBeTrue();
  });

  it('keeps edits when turned off and on again', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, true);
    form.controls.entries.at(0).controls.color.setValue('#123456');

    setCustomStyle(form, false);
    setCustomStyle(form, true);

    expect(form.controls.entries.at(0).controls.color.value).toBe('#123456');
  });

  it('requires values from lowest to highest for ramps', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, true);
    form.controls.entries.at(2).controls.value.setValue(1);

    expect(form.hasError('unorderedValues')).toBeTrue();
  });

  it('requires unique values for VALUES, in any order', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, true);
    form.controls.map_type.setValue('VALUES');
    form.controls.entries.at(2).controls.value.setValue(1);
    expect(form.valid).toBeTrue();

    form.controls.entries.at(2).controls.value.setValue(5);
    expect(form.hasError('duplicateValues')).toBeTrue();
  });

  it('needs between 2 and 20 breaks', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, true);
    form.controls.entries.clear();
    form.controls.entries.push(createStyleEntry(1, '#000000'));

    expect(form.controls.entries.hasError('tooFewEntries')).toBeTrue();
  });

  it('is valid while off, whatever the editor holds', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, true);
    form.controls.entries.at(2).controls.value.setValue(-1);
    setCustomStyle(form, false);

    expect(form.valid).toBeTrue();
  });

  it('builds the API payload and the draft the map draws', () => {
    const form = createStyleForm();
    fillStyleForm(form, STYLE, true);

    expect(stylePayload(form).entries[1]).toEqual({
      value: 5,
      color: '#777777',
      label: 'Middle',
    });
    const draft = draftStyle(form, STYLE.no_data);
    expect(draft.no_data).toEqual(STYLE.no_data);
    expect(draft.entries[0]).toEqual({
      value: 0,
      color: '#000000',
      opacity: 1,
      label: '0',
    });
  });
});

describe('upload style palettes', () => {
  it('spreads a palette over any number of breaks', () => {
    const viridis = STYLE_PALETTES.find((p) => p.name === 'Viridis')!;
    const colors = paletteColors(viridis, 3);

    expect(colors.length).toBe(3);
    expect(colors[0]).toBe('#440154');
    expect(colors[2]).toBe('#fde725');
    colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
  });

  it('spaces breaks evenly over the range', () => {
    expect(evenBreaks(0, 100, 5)).toEqual([0, 25, 50, 75, 100]);
    expect(evenBreaks(0, 1, 3)).toEqual([0, 0.5, 1]);
    expect(evenBreaks(2, 2, 2)).toEqual([2, 2]);
  });
});
