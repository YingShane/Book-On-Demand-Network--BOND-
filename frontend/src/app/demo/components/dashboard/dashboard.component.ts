import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Product } from '../../api/product';
import { ProductService } from '../../service/product.service';
import { Subscription, debounceTime } from 'rxjs';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { MapCommonComponent } from 'src/app/map-common/map-common.component';

@Component({
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
    providers: [MessageService]
})
export class DashboardComponent implements OnInit, OnDestroy {
    @ViewChild(MapCommonComponent) mapCommon: MapCommonComponent;

    apiUrl = environment.apiUrl;
    previewImage: string | null = null;
    editPreviewImage: string | null = null;
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
    markerSet: boolean = false;
    markers: Map<string, mapboxgl.Marker> = new Map();
    displayEditUserDialog: boolean = false;
    editableUser: any = {};
    bookTitle: string = '';
    selectedFile: File | null = null;

    data: any;

    items!: MenuItem[];

    products!: Product[];

    chartData: any;

    chartOptions: any;

    subscription!: Subscription;

    addBookStage: number = 1; // 1 for form, 2 for map
    editBookStage: number = 1;
    searchQuery: string = '';

    constructor(private productService: ProductService, public layoutService: LayoutService, private http: HttpClient, private messageService: MessageService) {
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
            const meetingCoordinates = await this.mapCommon.getCoordinatesFromAddress(this.searchQuery);
            const meetingLocation = this.searchQuery;
            const [longitude, latitude] = meetingCoordinates;

            // Include meeting_location in the data sent to the backend
            const response = await this.http.post(`${this.apiUrl}/newBook`, {
                ...this.newBook,  // Include the rest of the book data
                meeting_location: meetingLocation,
                meeting_coordinates: [longitude, latitude]
            }).toPromise();

            // Ensure that the response is what you expect
            if (response) {
                this.book.push(response); // Update local data array with the new book
                
                
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Book added successfully!' });

            }
            this.displayAddDialog = false; // Close the dialog
            await this.fetchBooksData(); // Refresh the data
            console.log(this.book);
            this.uploadBookCover(this.book[this.book.length - 1].id);

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

            const meetingCoordinates = await this.mapCommon.getCoordinatesFromAddress(this.searchQuery);
            const meetingLocation = this.searchQuery;
            const [longitude, latitude] = meetingCoordinates; // Destructure after awaiting the promise

            const response = await this.http.put(`${this.apiUrl}/editBook/${bookId}`, {
                ...this.selectedBook,  // Include the rest of the book data
                meeting_location: meetingLocation,
                meeting_coordinates: [longitude, latitude]
            }).toPromise();

            // Ensure that the response is what you expect
            if (response) {
                // Update local book array with the updated book
                const index = this.book.findIndex(book => book.id === bookId);
                if (index !== -1) {
                    this.book[index] = response; // Update with the response data
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Book updated successfully!'
                });
            }

            this.displayEditDialog = false; // Close the dialog
            this.fetchBooksData(); // Refresh the book data

            this.messageService.add({ severity: 'success', summary: 'Location Found', detail: 'Location updated on map!' });



        } catch (error) {
            console.error('Error updating book:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update book: ' + (error.message || 'Unknown error')
            });
        }
    }


    proceedToEditMap() {
        this.editBookStage = 2;
    }

    goBackToEditDetails() {
        this.editBookStage = 1;
    }

    // updateBookWithLocation() {
    //     const mapInstance = document.getElementById('map-container');
    //     const selectedCoordinates = this.mapCommon.getCoordinatesFromAddress(this.searchQuery); // Implement the logic in this helper function

    //     if (selectedCoordinates) {
    //         // Update the location property of the selected book
    //         this.selectedBook.location = this.convertCoordinatesToAddress(selectedCoordinates);

    //         // Call the editBook function with the updated book details
    //         this.editBook(this.selectedBook.id);

    //         // Close the dialog and reset relevant properties
    //         this.displayEditDialog = false;
    //         this.editBookStage = 1; // Return to the first stage
    //         this.resetEditBookDialog();
    //     } else {
    //         alert('Please select a location on the map.');
    //     }
    // }

    resetEditBookDialog() {
        this.selectedBook = {};
        this.markerSet = false;
        this.searchQuery = '';
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

    openViewDialog(book: any) {
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



    // Method to move to map stage
    proceedToMap() {
        if (this.isFormValid()) {
            this.addBookStage = 2;
        } else {
            alert("Please fill all required fields!");
        }
    }

    // Method to validate the form
    isFormValid(): boolean {
        return this.newBook.title && this.newBook.author && this.newBook.genre &&
            this.newBook.publisher && this.newBook.publication_year;
    }

    // Method to go back to the form stage
    goBackToDetails() {
        this.addBookStage = 1;
    }

    // Method to finalize the book addition
    // submitBookWithLocation() {
    //     const mapInstance = document.getElementById('map');
    //     const selectedCoordinates = this.getSelectedCoordinatesFromMap(mapInstance); // Define this logic
    //     if (selectedCoordinates) {
    //         this.newBook.location = this.convertCoordinatesToAddress(selectedCoordinates);
    //         this.addBook();
    //         this.displayAddDialog = false;
    //         this.resetAddBookDialog();
    //     } else {
    //         alert("Please select a location on the map.");
    //     }
    // }

    // Reset the dialog state after closing
    resetAddBookDialog() {
        this.addBookStage = 1;
        this.newBook = {
            title: '',
            author: '',
            genre: '',
            publisher: '',
            publication_year: null,
            location: ''
        };
    }

    searchLocation(): void {
        if (this.searchQuery) {
            this.mapCommon.goToAddress(this.searchQuery);
        }
    }

    toggleMarker(): void {
        if (!this.searchQuery.trim()) {
            console.error('Please enter a valid address.');
            return;
        }

        if (this.markerSet) {
            // Remove the marker
            this.mapCommon.removeMarker(this.searchQuery);
            this.markerSet = false;
        } else {
            // Set the marker
            this.mapCommon.setMarkerAtAddress(this.searchQuery);
            this.markerSet = true;
        }
    }

    onImageUpload(event: any): void {
        this.selectedFile = event.target.files[0];
        if (this.selectedFile) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.previewImage = e.target.result;
            };
            reader.readAsDataURL(this.selectedFile);
        } else {
            this.previewImage = null;
        }
    }

    onEditImageUpload(event: any): void {
        this.selectedFile = event.target.files[0];
        if (this.selectedFile) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.editPreviewImage = e.target.result; // Update the preview image
                this.selectedBook.image = this.selectedFile; // Store the file if needed
            };
            reader.readAsDataURL(this.selectedFile);
        } else {
            this.editPreviewImage = null;
        }
    }

    uploadBookCover(bookId: string): void {
        if (this.selectedFile) {

            const formData = new FormData();
            formData.append('image', this.selectedFile); // The selected file from the input
            formData.append('bookId', bookId); // Pass the book ID for backend association
        
            // Send the data to your backend
            this.http.post(`${this.apiUrl}/upload-cover`, formData).subscribe({
                next: (response) => {
                    console.log('Upload successful:', response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Book cover uploaded successfully!',
                    });
                },
                error: (error) => {
                    console.error('Upload failed:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to upload book cover!',
                    });
                },
            });
        } else {
            console.error('No file selected for upload!');
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select a file to upload!',
            });
        }
    }
    
    
    
    updateBookCover(bookId: string): void {
        if (this.selectedFile) {
            const formData = new FormData();
            formData.append('image', this.selectedFile); // The updated file from the input
            formData.append('bookId', bookId); // Pass the book ID for backend association
    
            this.http.put(`${this.apiUrl}/update-cover/${bookId}`, formData).subscribe({
                next: (response) => {
                    console.log('Cover update successful:', response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Book cover updated successfully!',
                    });
                    this.fetchBooksData(); // Refresh the book data
                },
                error: (error) => {
                    console.error('Failed to update book cover:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update book cover!',
                    });
                },
            });
        } else {
            console.error('No file selected for upload!');
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select a file to update!',
            });
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


