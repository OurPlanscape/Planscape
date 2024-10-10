import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { TreatmentExpanderComponent } from './treatment-expander.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

const meta: Meta<TreatmentExpanderComponent> = {
  title: 'Components/Treatment Expander',
  component: TreatmentExpanderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><div style="width:400px;"><sg-treatment-expander ${argsToTemplate(args)}></sg-treatment-expander></div>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentExpanderComponent>;

export const Default: Story = {
  args: {
    action: 'MODERATE_THINNING_BURN',
    treatmentType: 'SINGLE',
    standCount: '11',
  },
};

export const Sequence1: Story = {
  args: {
    treatmentType: 'SEQUENCE',
    action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
    standCount: '1/11',
  },
};
export const Sequence5: Story = {
  args: {
    treatmentType: 'SEQUENCE',
    action: 'RX_FIRE_PLUS_RX_FIRE',
    standCount: '5/11',
  },
};

export const TreatmentModerateMastication: Story = {
  args: {
    action: 'MODERATE_MASTICATION',
    treatmentType: 'SINGLE',
    standCount: '8',
  },
};

export const TreatmentHeavyMastication: Story = {
  args: {
    action: 'HEAVY_MASTICATION',
    treatmentType: 'SINGLE',
    standCount: '600',
  },
};

export const TreatmentHeavyThinning: Story = {
  args: {
    action: 'HEAVY_THINNING_BURN',
    treatmentType: 'SINGLE',
    standCount: '5',
  },
};

export const TreatmentMasticationAndFireSelected: Story = {
  args: {
    action: 'MASTICATION_RX_FIRE',
    treatmentType: 'SINGLE',
    standCount: '5',
    selected: true,
  },
};

export const OverriddenTitle: Story = {
  args: {
    title: 'Special Title',
    action: 'MODERATE_THINNING_BURN',
    treatmentType: 'SINGLE',
    standCount: '11',
  },
};
