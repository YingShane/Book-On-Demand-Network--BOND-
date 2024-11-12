import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormLayoutDemoComponent } from './formlayoutdemo.component';
import { TableModule } from 'primeng/table';

@NgModule({
	imports: [RouterModule.forChild([
		{ path: '', component: FormLayoutDemoComponent }
	])],
	exports: [RouterModule]
})
export class FormLayoutDemoRoutingModule { }
