import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { BannerComponent } from './banner.component';

const meta: Meta<BannerComponent> = {
  title: 'Components/Banner',
  component: BannerComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<sg-banner ${argsToTemplate(args)}>A notification</sg-banner>`,
  }),
};

export default meta;
type Story = StoryObj<BannerComponent>;

export const Default: Story = {
  args: {
    type: 'info',
    dismissible: false,
  },
};

export const Info: Story = {
  args: {
    type: 'info',
  },
};
export const Success: Story = {
  args: {
    type: 'success',
  },
};
export const Error: Story = {
  args: {
    type: 'error',
  },
};
export const Warning: Story = {
  args: {
    type: 'warning',
  },
};
