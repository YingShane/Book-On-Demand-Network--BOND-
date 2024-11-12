import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RegistrationComponent } from './register.component';

@NgModule({
  imports: [RouterModule.forChild([
    { path: '', component: RegistrationComponent }
  ])],
  exports: [RouterModule]
})
export class RegistrationRoutingModule {}
