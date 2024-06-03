import type { Meta, StoryObj } from '@storybook/angular';
import { PaginatorComponent } from './paginator.component';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
// import { provideAnimations } from '@angular/platform-browser/animations';

@Component({
  selector: 'sg-demo-form',
  standalone: true,
  imports: [
    MatIconModule,
    CommonModule,
    MatInputModule,
    MatFormFieldModule,
    PaginatorComponent,
  ],

  template: `
    <h3>Demo of pagination</h3>
    <div>Total pages: {{ pageCount }}</div>
    <div>Total records per page: {{ defaultRecordsPerPage }}</div>
    <div>Current selected page: {{ curPage }}</div>
    <sg-paginator
      currentPage="{{ curPage }}"
      pageCount="{{ pageCount }}"
      defaultRecordsPerPage="{{ defaultRecordsPerPage }}"
      (pageChanged)="setCurrentPage($event)"></sg-paginator>
  `,
})
export class DemoResultsComponent {
  /*
   * Examples of ineracting with the paginator
   */
  curPage = 5;
  pageCount = 12;
  defaultRecordsPerPage = 20;

  setCurrentPage(selectedPage: number): void {
    this.curPage = selectedPage;
  }
}

const meta: Meta<DemoResultsComponent> = {
  title: 'Components/Results Demo',
  component: DemoResultsComponent,
  tags: [''],
};

export default meta;
type Story = StoryObj<DemoResultsComponent>;

export const Default: Story = {
  args: {},
};
