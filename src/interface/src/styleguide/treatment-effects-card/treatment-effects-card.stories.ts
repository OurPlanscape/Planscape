import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { TreatmentEffectsCardComponent } from './treatment-effects-card.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<TreatmentEffectsCardComponent> = {
  title: 'Components/Treatment Effects Card',
  component: TreatmentEffectsCardComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<sg-treatment-effects-card ${argsToTemplate(args)}></sg-treatment-effects-card>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentEffectsCardComponent>;

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
