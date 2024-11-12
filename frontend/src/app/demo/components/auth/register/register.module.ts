import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationComponent } from './register.component';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { RegistrationRoutingModule } from './register-routing.module';

@NgModule({
  declarations: [RegistrationComponent],
  imports: [
    CommonModule,
    FormsModule,
    PasswordModule,
    InputTextModule,
    ButtonModule,
    RouterModule,
    RegistrationRoutingModule
  ]
})
export class RegistrationModule {}
