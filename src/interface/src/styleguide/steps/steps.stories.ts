import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';

import { provideAnimations } from '@angular/platform-browser/animations';
import { StepsComponent } from './steps.component';
import { MatStepperModule } from '@angular/material/stepper';
import { CommonModule } from '@angular/common';
import { StepTemplateDirective } from './step.directive';

const meta: Meta<StepsComponent> = {
  title: 'Components/Steps',
  component: StepsComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({
      imports: [MatStepperModule, CommonModule, StepTemplateDirective],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-steps ${argsToTemplate(args)}>
     <ng-template sgStep='Step 1'>Step 1 content</ng-template>
      <ng-template sgStep='Step 2'>Step 2 content</ng-template>
      <ng-template sgStep='Step 3'>Step 2 content</ng-template>
      <ng-template sgStep='Step 4'>Step 2 content</ng-template>
</sg-steps>`,
  }),
};

export default meta;
type Story = StoryObj<StepsComponent>;

export const Default: Story = {
  args: {},
};
