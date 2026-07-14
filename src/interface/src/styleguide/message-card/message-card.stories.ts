import {
  argsToTemplate,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';

const meta: Meta<MessageCardComponent> = {
  title: 'Cards/Message Card',
  component: MessageCardComponent,
  tags: ['autodocs'],

  decorators: [
    moduleMetadata({
      imports: [MessageCardComponent, BrowserAnimationsModule],
    }),
  ],
  args: {
    cardTitle: 'Message Details',
  },
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-message-card ${argsToTemplate(args)}>
  This is the projected content of the message card.
</sg-message-card>`,
  }),
};

export default meta;

type Story = StoryObj<MessageCardComponent>;

export const Default: Story = {};

export const Error: Story = {
  args: {
    cardTitle: 'Something went wrong',
    cardType: 'error',
  },
};

export const RichContent: Story = {
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-message-card ${argsToTemplate(args)}>
  <div>You can project any markup here:</div>
  <ul>
    <li>A list item</li>
    <li>Another item</li>
  </ul>
</sg-message-card>`,
  }),
};

export const NoBorders: Story = {
  args: {
    cardTitle: 'Something went wrong',
    cardType: 'error',
    withBorders: false,
  },
};
