import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';

import { ShareDialogComponent } from './share-dialog.component';

/**
 * `ShareDialogComponent` is the share modal chrome shared by the plan-share and
 * funding-report-share dialogs: header, email chip input, invalid-email banner
 * and footer. It owns the email entry behaviour and emits the list through
 * `emailsChange`.
 *
 * The parts that differ between the two dialogs are supplied through
 * content-projection slots (`[shareDialogRoleSelector]`, `[shareDialogMessage]`,
 * `[shareDialogBody]`, `[shareDialogHelp]`). Because projected content is styled
 * by the host component, the samples below are styled inline to approximate the
 * real plan/funding dialogs.
 */
const meta: Meta<ShareDialogComponent> = {
  title: 'Components/Share Dialog',
  component: ShareDialogComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ShareDialogComponent],
    }),
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

/**
 * The "with roles" variant, as used by the plan share dialog: a role selector
 * next to the chip input, a help button, and a "People with access" list.
 */
export const WithRoles: Story = {
  render: () => ({
    template: `
      <app-share-dialog
        title="Share My Planning Area"
        [twoColumnForm]="true"
        [showHelpButton]="true"
        [allowStartOver]="true"
        [hideBodyWhileComposing]="true"
        primaryLabel="DONE">
        <div shareDialogRoleSelector style="justify-self: start;">
          <button
            type="button"
            style="display: inline-flex; align-items: center; gap: 8px;
                   height: 40px; padding: 0 8px 0 12px; background: #fff;
                   border: 1px solid #767676; border-radius: 4px;
                   font-size: 14px; cursor: pointer;">
            <span>Viewer</span>
            <span style="font-size: 10px;">&#9662;</span>
          </button>
        </div>

        <div
          shareDialogBody
          style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
          <h3 style="margin: 0; font-size: 14px; color: #767676;">
            People with access
          </h3>
          <div
            style="display: flex; align-items: center;
                   justify-content: space-between; font-size: 14px;">
            <span>Jane Doe <span style="color: #9e9e9e;">(You)</span></span>
            <span style="color: #767676;">Owner</span>
          </div>
          <div
            style="display: flex; align-items: center;
                   justify-content: space-between; font-size: 14px;">
            <span>michael&#64;gmail.com</span>
            <span style="color: #767676;">Viewer &#9662;</span>
          </div>
        </div>

        <div shareDialogHelp style="margin: 24px 16px;">
          <h4 style="font-size: 14px; font-weight: 600; margin: 24px 0 0;">
            What can I do as an Owner?
          </h4>
          <p style="margin: 0 0 8px;">
            Full administrative control. You can manage planning area
            permissions, and have unrestricted rights to create, edit, or delete
            content across all features.
          </p>
        </div>
      </app-share-dialog>
    `,
  }),
};

/**
 * The "no roles" variant, as used by the funding report share dialog: a Copy
 * Link action in the footer and a "Report summary sent to:" list, with no role
 * selector and no help panel.
 */
export const WithShareableLink: Story = {
  render: () => ({
    props: {
      emails: ['michael@gmail.com', 'sam@gmail.com'],
    },
    template: `
      <app-share-dialog
        title='Send "My Scenario" Summary Link'
        [emails]="emails"
        [showCopyLink]="true"
        primaryLabel="Send">
        <section
          shareDialogBody
          style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
          <h3 style="margin: 0; font-size: 14px; color: #767676;">
            Report summary sent to:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #767676;">
            This report hasn't been shared yet.
          </p>
        </section>
      </app-share-dialog>
    `,
  }),
};
