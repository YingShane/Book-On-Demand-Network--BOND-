import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Product } from '../../api/product';
import { ProductService } from '../../service/product.service';
import { Subscription, debounceTime } from 'rxjs';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs'; 

@Component({
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'] ,
    providers: [MessageService]
})
export class DashboardComponent implements OnInit, OnDestroy {
    apiUrl = environment.apiUrl;
    displayAddDialog: boolean = false; 
    displayEditDialog: boolean = false;
    displayDetailDialog: boolean = false;
    book: any;
    books: any[] = [];
    newBook: any = {};
    selectedBook: any = {};
    user: any;
    admin = {
        name: 'Yeo Ying Sheng',
        email: 'yeousm@student.usm.my',
        status: 'Active'
    };

    displayEditUserDialog: boolean = false;
    editableUser: any = {};

    data: any;

    items!: MenuItem[];

    products!: Product[];

    chartData: any;

    chartOptions: any;

    subscription!: Subscription;

    constructor(private productService: ProductService, public layoutService: LayoutService, private http: HttpClient, private messageService: MessageService ) {
        this.subscription = this.layoutService.configUpdate$
        .pipe(debounceTime(25))
        .subscribe((config) => {
            this.initChart();
        });
    }

    ngOnInit() {
        this.initChart();
        this.productService.getProductsSmall().then(data => this.products = data);

        this.items = [
            { label: 'Add New', icon: 'pi pi-fw pi-plus' },
            { label: 'Remove', icon: 'pi pi-fw pi-minus' }
        ];
        this.fetchUserData();
        this.fetchBooksData();
    }

    initChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        this.chartData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [
                {
                    label: 'First Dataset',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    fill: false,
                    backgroundColor: documentStyle.getPropertyValue('--bluegray-700'),
                    borderColor: documentStyle.getPropertyValue('--bluegray-700'),
                    tension: .4
                },
                {
                    label: 'Second Dataset',
                    data: [28, 48, 40, 19, 86, 27, 90],
                    fill: false,
                    backgroundColor: documentStyle.getPropertyValue('--green-600'),
                    borderColor: documentStyle.getPropertyValue('--green-600'),
                    tension: .4
                }
            ]
        };

        this.chartOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                }
            }
        };
    }

    async fetchBooksData(): Promise<void> {
        try {
            const response = await this.http.get(`${this.apiUrl}/books`).toPromise(); 
            this.book = response; // Assign the fetched data to the data property
        } catch (error) {
            console.error('Error fetching book data:', error);
        }
    }

    async fetchUserData(): Promise<void> {
        try {
            const response = await this.http.get(`${this.apiUrl}/user`).toPromise();
            this.user = response[0];
        } catch (error) {
            console.error('Error fetching user data: ', error);
        }
    }

    //Manage Books
    async addBook() {
        try {
            const response = await this.http.post(`${this.apiUrl}/newBook`, this.newBook).toPromise();
            
            // Ensure that the response is what you expect
            if (response) {
                this.book.push(response); // Update local data array with the new book
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Book added successfully!' });
            }
    
            this.displayAddDialog = false; // Close the dialog
            this.fetchBooksData(); // Refresh the data
        } catch (error) {
            console.error('Error adding book:', error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add book: ' + (error.message || 'Unknown error') });
        }
    }

    async deleteBook(bookId: string) {
        try {
            const response = await this.http.delete(`${this.apiUrl}/deleteBook/${bookId}`).toPromise();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Book deleted successfully!' });
            
            // Optionally remove the book from local data array
            this.book = this.book.filter(book => book.id !== bookId); // Adjust this based on your book object structure
        } catch (error) {
            console.error('Error deleting book:', error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete book: ' + (error.message || 'Unknown error') });
        }
    }    
    
    async editBook(bookId: string) {
      try {
        const response = await this.http.put(`${this.apiUrl}/editBook/${bookId}`, this.selectedBook).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Book updated successfully!' });

        // Update the local book array
        const index = this.book.findIndex(book => book.id === bookId);
        if (index !== -1) {
          this.book[index] = response; // Assuming the response returns the updated book
        }

        this.displayEditDialog = false; // Close the dialog
        this.fetchBooksData();
      } catch (error) {
        console.error('Error updating book:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update book: ' + (error.message || 'Unknown error') });
      }
    }

    getBookById(bookId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/books/${bookId}`);
    }

    viewBookDetails(bookId: string) {
        this.getBookById(bookId).subscribe(
          (response) => {
            console.log('Book details:', response);
            this.book = response; // Assign the fetched book details to the variable
            this.displayDetailDialog = true; // Show the dialog
          },
          (error) => {
            console.error('Error fetching book details:', error);
          }
        );
    }

    openAddBookDialog() {
        this.newBook = {}; // Reset the new book object
        this.displayAddDialog = true; // Show the dialog
    }

    openEditDialog(book: any) {
        this.selectedBook = { ...book }; // Create a copy of the book object to edit
        this.displayEditDialog = true; // Show the edit dialog
    }
    
    openViewDialog(book:any) {
        this.selectedBook = { ...book };
        this.displayDetailDialog = true;
    }

    openEditUserDialog() {
        // Create a copy of the user data for editing
        this.editableUser = { ...this.user };
        this.displayEditUserDialog = true;
    }

    async saveUserInfo() {
        try {
            
            console.log(this.editableUser);
            this.http.put(`${this.apiUrl}/update-user`, this.editableUser).toPromise();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User updated successfully!' });

            // Update the local book array
            // const index = this.book.findIndex(book => book.id === bookId);
            // if (index !== -1) {
            //     this.book[index] = response; // Assuming the response returns the updated book
            // }

            this.displayEditUserDialog = false; // Close the dialog
            this.fetchUserData();
        } catch {

        }
        


      }

    showSuccess() {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Book added successfully!' });
    }
    
    showError() {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add book.' });
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}


