import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { TreatmentCardComponent } from './treatment-card.component';

const meta: Meta<TreatmentCardComponent> = {
  title: 'Components/Treatment Card',
  component: TreatmentCardComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<sg-treatment-card ${argsToTemplate(args)}></sg-treatment-card>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentCardComponent>;

export const Default: Story = {
  args: {
    name: 'Treatment plan name',
    status: 'Done',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};

export const Running: Story = {
  args: {
    name: 'Treatment plan that is running',
    status: 'Running',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};
