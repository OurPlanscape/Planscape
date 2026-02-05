import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { TreatmentCardComponent } from './treatment-card.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<TreatmentCardComponent> = {
  title: 'Components/Treatment Card',
  component: TreatmentCardComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
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
    status: 'PENDING',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};

export const Success: Story = {
  args: {
    name: 'Treatment plan name',
    status: 'SUCCESS',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};

export const Running: Story = {
  args: {
    name: 'Treatment plan that is running',
    status: 'RUNNING',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};

export const Queued: Story = {
  args: {
    name: 'Treatment plan that is running',
    status: 'QUEUED',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};

export const Failed: Story = {
  args: {
    name: 'Treatment plan that failed',
    status: 'FAILURE',
    creator: 'John Doe',
    createdAt: '2024-04-23T13:19:31.019747Z',
  },
};

export const WithCreatorPermissions: Story = {
  ...Default,
  args: {
    userCanDelete: true,
    userCanDuplicate: true,
  },
};

export const WithViewerPermissions: Story = {
  ...Default,
  args: {
    userCanDelete: false,
    userCanDuplicate: false,
  },
};
