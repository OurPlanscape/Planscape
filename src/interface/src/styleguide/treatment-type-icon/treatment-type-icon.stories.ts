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
    sequenceNum: 1,
  },
};
export const Sequence1: Story = {
  args: {
    sequenceNum: 1,
  },
};
export const Sequence2: Story = {
  args: {
    sequenceNum: 2,
  },
};
export const Sequence3: Story = {
  args: {
    sequenceNum: 3,
  },
};
export const Sequence4: Story = {
  args: {
    sequenceNum: 4,
  },
};
export const Sequence5: Story = {
  args: {
    sequenceNum: 5,
  },
};
export const Sequence6: Story = {
  args: {
    sequenceNum: 6,
  },
};
export const Sequence7: Story = {
  args: {
    sequenceNum: 7,
  },
};
export const Sequence8: Story = {
  args: {
    sequenceNum: 8,
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
