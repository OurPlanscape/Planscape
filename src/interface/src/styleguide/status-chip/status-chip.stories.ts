import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { StatusChipComponent } from '@styleguide';

const meta: Meta<StatusChipComponent> = {
  title: 'Components/Status Chip',
  component: StatusChipComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<div style='width: 500px;
    white-space: nowrap;
    display: flex;
    gap: 16px;
    align-items: center;'>Some Title or Important thing  <sg-status-chip ${argsToTemplate(args)}></sg-status-chip></div>`,
  }),
};

export default meta;
type Story = StoryObj<StatusChipComponent>;

export const Default: Story = {
  args: {},
};

export const InProgress: Story = {
  args: {
    status: 'inProgress',
  },
};
export const Success: Story = {
  args: {
    status: 'success',
  },
};
export const Failed: Story = {
  args: {
    status: 'failed',
  },
};
export const Running: Story = {
  args: {
    status: 'running',
  },
};

export const AnyLabel: Story = {
  args: {
    status: 'success',
    label: 'done deal',
  },
};

export const WithIcon: Story = {
  args: {
    status: 'inProgress',
    icon: 'hexagon',
  },
};

export const VeryLongOne: Story = {
  args: {
    status: 'inProgress',
    icon: 'hexagon',
    label:
      'Select a stand to get stand level effects that will be displayed on a chart next to other things',
  },
};
