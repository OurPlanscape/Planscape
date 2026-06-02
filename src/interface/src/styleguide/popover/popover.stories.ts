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
import { ButtonComponent } from '@styleguide/button/button.component';
import { ModalComponent } from '@styleguide/modal/modal.component';

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
        ModalComponent,
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

/**
 * With `modal`, the popover hosts interactive content (e.g. an `sg-modal`): it
 * stays open while you interact and closes only via `close()`. Projecting the
 * modal as content, grab a reference with `#ref="sgPopover"` and wire it to the
 * modal's actions.
 */
export const Modal: Story = {
  render: () => ({
    template: `
      <div ${containerStyle}>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="color: black;">Click the icon -> </span>
          <sg-popover [modal]="true" icon="info" #pop="sgPopover">
            <sg-modal
              title="Modal popover"
              width="xsmall"
              (clickedClose)="pop.close()"
              (clickedPrimary)="pop.close()"
              (clickedSecondary)="pop.close()">
              <div modalBodyContent>
                Opens like a popover but behaves like a modal — stays open while
                you interact, closes via its own actions.
              </div>
            </sg-modal>
          </sg-popover>
        </div>
      </div>
    `,
  }),
};

/**
 * `contentTemplate` lets several popovers share ONE template instead of
 * repeating it. The template gets a `{ close }` context to dismiss the popover,
 * and `(opened)` fires on click — use it to populate which content to show
 * before the panel opens. Here both icons reuse the same template.
 */
export const ModalSharedTemplate: Story = {
  render: () => ({
    props: { activeName: '' },
    template: `
      <ng-template #tip let-close="close">
        <sg-modal
          [title]="activeName"
          width="xsmall"
          (clickedClose)="close()"
          (clickedPrimary)="close()"
          (clickedSecondary)="close()">
          <div modalBodyContent>Showing info for: {{ activeName }}</div>
        </sg-modal>
      </ng-template>

      <div ${containerStyle}>
        <div style="display:flex; align-items:center; gap:16px;">
          <span style="color: black;">Carbon</span>
          <sg-popover
            [modal]="true"
            icon="info"
            [contentTemplate]="tip"
            (opened)="activeName = 'Carbon'"></sg-popover>

          <span style="color: black;">Water</span>
          <sg-popover
            [modal]="true"
            icon="info"
            [contentTemplate]="tip"
            (opened)="activeName = 'Water'"></sg-popover>
        </div>
      </div>
    `,
  }),
};
