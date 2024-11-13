import { Component, OnInit } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ActivatedRoute } from '@angular/router';

@Component({
    templateUrl: './listdemo.component.html'
})
export class ListDemoComponent implements OnInit {

    books: any[] = [];
    apiUrl = environment.apiUrl;
    userId: string | null = null;
    sortOptions: SelectItem[] = [];

    sortOrder: number = 0;

    sortField: string = '';

    constructor(private http: HttpClient, private route: ActivatedRoute) { }

    ngOnInit(): void {
        // Access userId from the route
        this.route.paramMap.subscribe(params => {

          this.userId = params.get('id');
          console.log('User ID:', this.userId);
          
          // Optionally, fetch data for this user if needed
          if (this.userId) {
            this.http.get<any[]>(`${this.apiUrl}/books-available/${this.userId}`).subscribe(data => {
              this.books = data;
              console.log(this.books);
            });
          } else {
            // If userId is not available, fetch books without the user filter
            this.http.get<any[]>(`${this.apiUrl}/books-available`).subscribe(data => {
              this.books = data;
              console.log(this.books);
            });
          }
        });
    
        this.sortOptions = [
          { label: 'Title Ascending', value: 'title' },
          { label: 'Title Descending', value: '!title' }
        ];
      }

    onSortChange(event: any) {
        const value = event.value;

        if (value.indexOf('!') === 0) {
            this.sortOrder = -1;
            this.sortField = value.substring(1, value.length);
        } else {
            this.sortOrder = 1;
            this.sortField = value;
        }
    }

    onFilter(dv: any, event: Event) {
        dv.filter((event.target as HTMLInputElement).value);
    }
}
