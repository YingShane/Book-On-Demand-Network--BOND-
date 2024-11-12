import { Component, ElementRef, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LayoutService } from "./service/app.layout.service";
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html'
})
export class AppTopBarComponent {

    items!: MenuItem[];
    apiUrl = environment.apiUrl;

    @ViewChild('menubutton') menuButton!: ElementRef;

    @ViewChild('topbarmenubutton') topbarMenuButton!: ElementRef;

    @ViewChild('topbarmenu') menu!: ElementRef;

    constructor(public layoutService: LayoutService, private http: HttpClient, private router: Router) { }
    
    logout() {
        this.http.post(`${this.apiUrl}/logout`, {}).subscribe(
          response => {
            console.log('Logout successful', response);
            // Optionally, clear any local storage or tokens
            // localStorage.removeItem('user'); // If applicable
            this.router.navigate(['auth/login']); // Redirect to login after logout
          },
          error => {
            console.error('Logout error', error);
          }
        );
      }
}
