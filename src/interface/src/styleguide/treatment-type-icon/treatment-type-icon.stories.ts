import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { TreatmentTypeIconComponent } from './treatment-type-icon.component';

const meta: Meta<TreatmentTypeIconComponent> = {
  title: 'Components/Treatment Type Icon',
  component: TreatmentTypeIconComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<sg-treatment-type-icon ${argsToTemplate(args)}></sg-treatment-type-icon>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentTypeIconComponent>;

export const Default: Story = {
  args: {
    treatment: null,
  },
};

export const TreatmentNone: Story = {
  args: {
    treatment: null,
  },
};
export const TreatmentBlue: Story = {
  args: {
    treatment: 'MODERATE_THINNING_BIOMASS',
  },
};
export const TreatmentPurple: Story = {
  args: {
    treatment: 'HEAVY_THINNING_BIOMASS',
  },
};
export const TreatmentOrange: Story = {
  args: {
    treatment: 'HEAVY_THINNING_BIOMASS',
  },
};
export const TreatmentYellow: Story = {
  args: {
    treatment: 'HEAVY_THINNING_BURN',
  },
};
export const TreatmentJungleGreen: Story = {
  args: {
    treatment: 'MODERATE_MASTICATION',
  },
};
export const TreatmentLimeGreen: Story = {
  args: {
    treatment: 'HEAVY_MASTICATION',
  },
};
export const TreatmentRed: Story = {
  args: {
    treatment: 'RX_FIRE',
  },
};
export const TreatmentBrown: Story = {
  args: {
    treatment: 'HEAVY_THINNING_RX_FIRE',
  },
};

export const TreatmentPink: Story = {
  args: {
    treatment: 'MASTICATION_RX_FIRE',
  },
};
