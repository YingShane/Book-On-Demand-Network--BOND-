import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styles: [`
    /* Add any styles you need here */
  `]
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  registerEmail: string = '';
  registerPassword: string = '';
  isRegistering: boolean = false; // Default to login form
  errorMessage: string = '';
  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router, public layoutService: LayoutService) { }

  // Method to handle login
  // Method to handle login
    login() {
        this.http.post(`${this.apiUrl}/login`, { email: this.email, password: this.password })
        .subscribe(
            (response: any) => {
            // Handle successful login
            console.log('Login successful', response);
            
            // Store user info or token if needed (e.g., in local storage)
            // localStorage.setItem('user', JSON.stringify(response.user)); // Example
            if (response.isFirstLogin) {
              this.router.navigate(['/add-user-info']); 

            } else {
              this.router.navigate(['/dashboard']); 
            }
            },
            (error) => {
            // Handle login error
            this.errorMessage = error.error?.message || 'Login failed. Please try again.';
            console.error('Login error', error);
            }
        );
    }
  
}
