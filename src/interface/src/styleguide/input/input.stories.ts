import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';
import { InputComponent } from './input.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

/**
 *Inputs
 * Status: <sg-status status="inProgress"></sg-status>
 */
const meta: Meta<InputComponent> = {
  title: 'Components/Input',
  component: InputComponent,
  tags: ['autodocs'],

  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({ imports: [MatInputModule, MatFormFieldModule] }),
  ],
  render: (args) => ({
    props: args,
    template: `
     <sg-input ${argsToTemplate(args)}>
     <input matInput value='12' placeholder='12'>
</sg-input>`,
  }),
};

export default meta;
type Story = StoryObj<InputComponent>;

export const Default: Story = {
  args: {
    disabled: false,
    error: false,
    leadingIcon: 'add_box',
    placeholder: 'Some placeholder',
    suffix: '',
    supportMessage: 'Enter whatever you like',
    trailingIcon: '',
    value: 'Some text',
  },
};

export const JustLabel: Story = {
  args: {
    disabled: false,
    error: false,
    placeholder: 'Some placeholder',
    supportMessage: 'Enter whatever you like',
  },
};

@Component({
  selector: 'sg-demo-form',
  standalone: true,
  imports: [
    MatIconModule,
    CommonModule,
    MatInputModule,
    MatFormFieldModule,
    InputComponent,
  ],
  template: ` <form>
    <sg-input placeholder="one"></sg-input>
    <sg-input placeholder="two"></sg-input>
  </form>`,
})
export class DemoFormComponent {}
