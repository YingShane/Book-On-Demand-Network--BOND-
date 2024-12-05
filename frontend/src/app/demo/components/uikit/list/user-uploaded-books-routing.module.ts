import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserUploadedBooksComponent } from './user-uploaded-books.component';

@NgModule({
	imports: [RouterModule.forChild([
		{ path: '', component: UserUploadedBooksComponent }
	])],
	exports: [RouterModule]
})
export class UserUploadedBooksRoutingModule { }
