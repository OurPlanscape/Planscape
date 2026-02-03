import {
  argsToTemplate,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

import { PopoverComponent } from './popover.component';
import { ButtonComponent } from '../button/button.component';

const meta: Meta<PopoverComponent> = {
  title: 'Components/Info Popover',
  component: PopoverComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        BrowserAnimationsModule,
        MatMenuModule,
        MatIconModule,
        ButtonComponent,
        PopoverComponent,
      ],
    }),
  ],
  render: ({ ...args }) => ({
    props: args,
    template: `
      <div ${containerStyle}>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="color: black;">Click the icon -> </span>
          <sg-popover ${argsToTemplate(args)}></sg-popover>
        </div>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<PopoverComponent>;

const containerStyle = `style="
  height: 220px;
  align-content: center;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 24px;
"`;

export const Default: Story = {
  args: {
    content: 'This is a simple popover content.',
  },
};

export const RichContent: Story = {
  args: {
    content: `
      <div>
        <strong>Adapt & Protect</strong>
        <p>
          A scaled metric (0-100) that reflects a continuum of climate resilience strategies.
        </p>
        <ul>
          <li><strong>Monitor</strong>: closer to 0</li>
          <li><strong>Adapt & Protect</strong>: intermediate</li>
          <li><strong>Transform</strong>: closer to 100</li>
        </ul>
      </div>
    `,
  },
};

export const ColoredIcon: Story = {
  args: {
    iconColor: 'black',
    content: 'The icon has black color',
  },
};

export const CustomIcon: Story = {
  args: {
    icon: 'help',
    content: 'The icon has black color',
  },
};
