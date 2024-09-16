import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { SequenceIconComponent } from './sequence-icon.component';

const meta: Meta<SequenceIconComponent> = {
  title: 'Components/Sequence Icon',
  component: SequenceIconComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<sg-sequence-icon ${argsToTemplate(args)}></sg-sequence-icon>`,
  }),
};

export default meta;
type Story = StoryObj<SequenceIconComponent>;

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
