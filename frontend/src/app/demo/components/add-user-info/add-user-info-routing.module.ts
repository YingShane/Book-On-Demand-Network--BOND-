import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AddUserInfoComponent } from './add-user-info.component';

@NgModule({
  imports: [RouterModule.forChild([
    { path: '', component: AddUserInfoComponent }
  ])],
  exports: [RouterModule]
})
export class AddUserInfoRoutingModule { }
