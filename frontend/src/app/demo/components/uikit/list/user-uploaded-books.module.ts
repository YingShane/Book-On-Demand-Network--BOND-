import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserUploadedBooksComponent } from './user-uploaded-books.component';
import { UserUploadedBooksRoutingModule } from './user-uploaded-books-routing.module';
import { DataViewModule } from 'primeng/dataview';
import { PickListModule } from 'primeng/picklist';
import { OrderListModule } from 'primeng/orderlist';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { RatingModule } from 'primeng/rating';
import { ButtonModule } from 'primeng/button';
import { MapCommonComponent } from 'src/app/map-common/map-common.component';
import { DialogModule } from 'primeng/dialog';

@NgModule({
	imports: [
		CommonModule,
		FormsModule,
		UserUploadedBooksRoutingModule,
		DataViewModule,
		PickListModule,
		OrderListModule,
		InputTextModule,
		DropdownModule,
		RatingModule,
		ButtonModule,
		MapCommonComponent,
		DialogModule
	],
	declarations: [UserUploadedBooksComponent]
})
export class UserUploadedBooksModule { }
