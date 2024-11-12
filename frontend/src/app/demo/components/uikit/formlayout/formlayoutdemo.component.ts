import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { MessageService } from 'primeng/api';


@Component({
    templateUrl: './formlayoutdemo.component.html',
    styleUrls: ['./formlayoutdemo.component.css'] ,
    providers: [MessageService]
})
export class FormLayoutDemoComponent {
    apiUrl = environment.apiUrl;
    book: any;
    user: any;

    constructor(private http: HttpClient, private messageService: MessageService ) {
    }

    ngOnInit() {
        // Any initialization logic can go here
        this.fetchBooksData();
    }

    viewResource(id: number) {
        // Logic to view resource details
        console.log('Viewing resource with ID:', id);
    }

    deleteResource(id: number) {
        // Logic to delete a resource
        console.log('Deleting resource with ID:', id);
    }

    async fetchBooksData(): Promise<void> {
        try {
            const response = await this.http.get(`${this.apiUrl}/public_books`).toPromise();
            this.book = Array.isArray(response) ? response : []; // Ensure book is an array
        } catch (error) {
            console.error('Error fetching book data:', error);
        }
    }

    async borrowBook(bookId: number): Promise<void> {
        try {
            // Send the request to the API to borrow the book
            const response: any = await this.http.post(`${this.apiUrl}/borrow`, { bookId }).toPromise();
    
            // Ensure the response contains the updated records
            if (response && response.updatedProfileBook && response.updatedBook) {
                // Retrieve the updated status from the response
                const updatedProfileBookStatus = response.updatedProfileBook.status;
                const updatedBookStatus = response.updatedBook.status;
    
                console.log('Updated Profile Book Status:', updatedProfileBookStatus);
                console.log('Updated Book Status:', updatedBookStatus);
    
                // Optionally, update the local book status in the `this.book` array
                const borrowedBook = this.book.find((b: any) => b.id === bookId);
                if (borrowedBook) {
                    borrowedBook.status = updatedBookStatus; // Update the status locally for the book
                }
    
                // Display a success message
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Book borrowed successfully!',
                });
            } else {
                // Handle case where response doesn't have the expected structure
                console.error('Unexpected response structure:', response);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to borrow book: No updated data returned.',
                });
            }
        } catch (error) {
            console.error('Error borrowing book:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to borrow book.',
            });
        }
    }
    
    
    
}
