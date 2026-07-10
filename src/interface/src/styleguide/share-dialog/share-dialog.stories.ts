import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';

import { ShareDialogComponent } from './share-dialog.component';

/**
 * `sg-share-dialog` is the share modal chrome: header, email chip input,
 * invalid-email banner, the access list and footer. It owns the email entry
 * behaviour and emits the list through `emailsChange`.
 *
 * The access list is driven by `[people]`: pass `{ name, role }[]` with
 * `[showRoles]` for an editable role list, or `string[]` for plain names.
 */
const meta: Meta<ShareDialogComponent> = {
  title: 'Components/Share Dialog',
  component: ShareDialogComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [ShareDialogComponent] }),
    (story) => {
      const s = story();
      return {
        ...s,
        template: `
          <div style="padding: 40px; background: #eef1f4;">
            <div style="width: 538px; margin: 0 auto; background: #fff;
                        border-radius: 8px; overflow: hidden;
                        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);">
              ${s.template}
            </div>
          </div>
        `,
      };
    },
  ],
};

export default meta;

type Story = StoryObj<ShareDialogComponent>;

const roles = ['Viewer', 'Collaborator', 'Owner'];

const peopleWithRoles = [
  { name: 'John Plans', role: 'Creator', editable: false },
  { name: 'Jane Doe (You)', role: 'Owner', editable: false },
  { id: 1, name: 'michael@gmail.com', role: 'Viewer', editable: true },
];

/** Plan share: role selector, help button, and a "People with access" list with roles. */
export const WithRoles: Story = {
  args: {
    title: 'Share My Planning Area',
    showRoles: true,
    roles,
    people: peopleWithRoles,
    peopleLabel: 'People with access',
    showMessage: true,
    showHelpButton: true,
    allowStartOver: true,
    hideBodyWhileComposing: true,
    primaryLabel: 'INVITE',
    idleLabel: 'DONE',
  },
  render: (args) => ({
    props: args,
    template: `
      <sg-share-dialog
        [title]="title"
        [showRoles]="showRoles"
        [roles]="roles"
        [people]="people"
        [peopleLabel]="peopleLabel"
        [showMessage]="showMessage"
        [showHelpButton]="showHelpButton"
        [allowStartOver]="allowStartOver"
        [hideBodyWhileComposing]="hideBodyWhileComposing"
        [primaryLabel]="primaryLabel"
        [idleLabel]="idleLabel">
        <div shareDialogHelp style="margin: 24px 16px;">
          <h4 style="font-size: 14px; font-weight: 600; margin: 24px 0 0;">
            What can I do as an Owner?
          </h4>
          <p style="margin: 0 0 8px;">
            Full administrative control across all features.
          </p>
        </div>
      </sg-share-dialog>
    `,
  }),
};

/** The access list while it loads. */
export const Loading: Story = {
  args: {
    title: 'Share My Planning Area',
    showRoles: true,
    roles,
    peopleLoading: true,
    peopleLabel: 'People with access',
    primaryLabel: 'INVITE',
    idleLabel: 'DONE',
  },
};

/** Funding share: Copy Link + plain "Report summary sent to:" list, no roles. */
export const WithShareableLink: Story = {
  args: {
    title: 'Send "My Scenario" Summary Link',
    showCopyLink: true,
    people: ['pablo@asd.com', 'richard@as.com'],
    peopleLabel: 'Report summary sent to:',
    peopleEmptyText: "This report hasn't been shared yet.",
    primaryLabel: 'Send',
  },
};
