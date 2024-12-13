import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BorrowedBooksComponent } from './borrowed-books.component';
import { TableModule } from 'primeng/table';

@NgModule({
	imports: [RouterModule.forChild([
		{ path: '', component: BorrowedBooksComponent }
	])],
	exports: [RouterModule]
})
export class BorrowedBooksRoutingModule { }
