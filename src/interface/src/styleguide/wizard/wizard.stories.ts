import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';

import { provideAnimations } from '@angular/platform-browser/animations';

import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormWizardComponent,
  StepComponent,
  StepConfig,
} from './wizard.component';

interface Demo {
  name: string;
  age: string;
}

@Component({
  selector: 'sg-step-demo-1',
  standalone: true,
  template: `
    <div>
      Demo.
      <button (click)="valid = true">Make valid</button>
      <div *ngIf="errors">Oh no errors!</div>
    </div>
  `,
  imports: [NgIf],
})
export class MyStep1Component implements StepComponent<Demo> {
  valid = false;
  errors = false;

  isValid(): boolean {
    return this.valid;
  }

  showErrors() {
    this.errors = true;
  }

  getData() {
    return {};
  }
}

@Component({
  selector: 'sg-step-demo-2',
  standalone: true,
  template: `
    <div>
      Page two.
      <button (click)="valid = true">Make valid</button>
      <div *ngIf="errors">Oh no errors!</div>
    </div>
  `,
  imports: [NgIf],
})
export class MyStep2Component implements StepComponent<Demo> {
  valid = false;
  errors = false;

  isValid(): boolean {
    return this.valid;
  }

  showErrors() {
    this.errors = true;
  }

  getData() {
    return { name: 'will' };
  }
}

const steps: StepConfig<Demo>[] = [
  { label: 'One', component: MyStep1Component },
  { label: 'Two', component: MyStep2Component },
];

const meta: Meta<FormWizardComponent<Demo>> = {
  title: 'Components/Wizard',
  component: FormWizardComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({
      imports: [CommonModule, MyStep1Component, FormWizardComponent],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-form-wizard  ${argsToTemplate(args)}>
</sg-form-wizard>`,
  }),
};

export default meta;
type Story = StoryObj<FormWizardComponent<Demo>>;

export const Default: Story = {
  args: {
    steps: steps,
  },
};
