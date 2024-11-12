import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { MessageService } from 'primeng/api';

@Component({
    templateUrl: './inputdemo.component.html',
    styleUrls: ['./inputdemo.component.css'] ,
    providers: [MessageService]
})
export class InputDemoComponent implements OnInit {
    
    apiUrl = environment.apiUrl;
    book: any;
    user: any;

    constructor(private http: HttpClient, private messageService: MessageService ) {
    }

    ngOnInit() {
        // Any initialization logic can go here
        this.fetchBooksBorrowedData();
    }

    viewResource(id: number) {
        // Logic to view resource details
        console.log('Viewing resource with ID:', id);
    }

    deleteResource(id: number) {
        // Logic to delete a resource
        console.log('Deleting resource with ID:', id);
    }

    async fetchBooksBorrowedData(): Promise<void> {
        try {
            const response = await this.http.get(`${this.apiUrl}/books_borrowed`).toPromise();
            this.book = Array.isArray(response) ? response : []; // Ensure book is an array
            console.log(this.book);
        } catch (error) {
            console.error('Error fetching book data:', error);
        }
    }


}
