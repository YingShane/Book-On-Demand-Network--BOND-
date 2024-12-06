import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UploadedBooksComponent } from './uploaded-books.component';

@NgModule({
	imports: [RouterModule.forChild([
		{ path: '', component: UploadedBooksComponent }
	])],
	exports: [RouterModule]
})
export class UploadedBooksRoutingModule { }
