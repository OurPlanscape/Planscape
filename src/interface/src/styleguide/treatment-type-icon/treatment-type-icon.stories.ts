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
    treatmentColor: 'none',
  },
};
export const TreatmentNone: Story = {
  args: {
    treatmentColor: 'none',
  },
};
export const TreatmentBlue: Story = {
  args: {
    treatmentColor: 'blue',
  },
};
export const TreatmentPurple: Story = {
  args: {
    treatmentColor: 'purple',
  },
};
export const TreatmentOrange: Story = {
  args: {
    treatmentColor: 'orange',
  },
};
export const TreatmentYellow: Story = {
  args: {
    treatmentColor: 'yellow',
  },
};
export const TreatmentJungleGreen: Story = {
  args: {
    treatmentColor: 'junglegreen',
  },
};
export const TreatmentLimeGreen: Story = {
  args: {
    treatmentColor: 'limegreen',
  },
};
export const TreatmentRed: Story = {
  args: {
    treatmentColor: 'red',
  },
};
export const TreatmentBrown: Story = {
  args: {
    treatmentColor: 'brown',
  },
};

export const TreatmentPink: Story = {
  args: {
    treatmentColor: 'pink',
  },
};
