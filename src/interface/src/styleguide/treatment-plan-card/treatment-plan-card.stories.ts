import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { TreatmentPlanCardComponent } from './treatment-plan-card.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<TreatmentPlanCardComponent> = {
  title: 'Components/Treatment Plan Card',
  component: TreatmentPlanCardComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<sg-treatment-plan-card ${argsToTemplate(args)}></sg-treatment-plan-card>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentPlanCardComponent>;

export const Default: Story = {
  args: {
    name: 'Treatment plan name',
    status: 'PENDING',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};

export const Success: Story = {
  args: {
    ...Default.args,
    status: 'SUCCESS',
  },
};

export const Running: Story = {
  args: {
    ...Default.args,
    name: 'Treatment plan that is running',
    status: 'RUNNING',
  },
};

export const Queued: Story = {
  args: {
    ...Default.args,
    name: 'Treatment plan that is running',
    status: 'QUEUED',
  },
};

export const Failed: Story = {
  args: {
    ...Default.args,
    name: 'Treatment plan that failed',
    status: 'FAILURE',
  },
};

export const WithCreatorPermissions: Story = {
  args: {
    ...Default.args,
    userCanDelete: true,
    userCanDuplicate: true,
  },
};

export const WithViewerPermissions: Story = {
  args: {
    ...Default.args,
    creator: 'Someone Not the Person Viewing',
    userCanDelete: false,
    userCanDuplicate: false,
  },
};

export const WrappingAndOverflow: Story = {
  args: {
    name: 'Here is an unnecessarily long name that probably exceeds the database column size',
    status: 'FAILURE',
    creator: 'Here is an unnecessarily long creator name',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};
