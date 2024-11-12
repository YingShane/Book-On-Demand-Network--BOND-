import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddUserInfoComponent } from './add-user-info.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AddUserInfoRoutingModule } from './add-user-info-routing.module';

@NgModule({
  declarations: [AddUserInfoComponent],
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    AddUserInfoRoutingModule
  ],
  exports: [AddUserInfoComponent] // Export if used outside
})
export class AddUserInfoModule { }