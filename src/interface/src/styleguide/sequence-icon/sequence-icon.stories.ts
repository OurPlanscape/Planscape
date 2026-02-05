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
    action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
  },
};
export const Sequence1: Story = {
  args: {
    action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
  },
};
export const Sequence2: Story = {
  args: {
    action: 'MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN',
  },
};
export const Sequence3: Story = {
  args: {
    action: 'HEAVY_THINNING_BURN_PLUS_RX_FIRE',
  },
};
export const Sequence4: Story = {
  args: {
    action: 'HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN',
  },
};
export const Sequence5: Story = {
  args: {
    action: 'RX_FIRE_PLUS_RX_FIRE',
  },
};
export const Sequence6: Story = {
  args: {
    action: 'MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION',
  },
};
export const Sequence7: Story = {
  args: {
    action: 'HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE',
  },
};
export const Sequence8: Story = {
  args: {
    action: 'MODERATE_MASTICATION_PLUS_RX_FIRE',
  },
};
