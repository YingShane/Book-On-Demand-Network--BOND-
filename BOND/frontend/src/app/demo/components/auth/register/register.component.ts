import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-registration',
  templateUrl: './register.component.html',
  styles: []
})
export class RegistrationComponent {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, public router: Router) {}

  register() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.http.post(`${this.apiUrl}/register`, {
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName
    })
    .subscribe(
      (response: any) => {
        console.log('Registration successful', response);
        this.router.navigate(['auth/login']); // Redirect to login after registration
      },
      (error) => {
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        console.error('Registration error', error);
      }
    );
  }
}