import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { FileUploadFieldComponent } from './file-upload-field.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<FileUploadFieldComponent> = {
  title: 'Components/File Upload Field',
  component: FileUploadFieldComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-file-upload ${argsToTemplate(args)}></sg-file-upload>`,
  }),
};

export default meta;
type Story = StoryObj<FileUploadFieldComponent>;

export const Default: Story = {
  args: { uploadStatus: 'default' },
};

export const InProgress: Story = {
  args: { uploadStatus: 'running' },
};

export const Error: Story = {
  args: { uploadStatus: 'failed' },
};

// TODO...
export const Disabled: Story = {
  args: {
    disabled: true,
    uploadStatus: 'default',
  },
};

export const Done: Story = {
  args: { uploadStatus: 'success' },
};
