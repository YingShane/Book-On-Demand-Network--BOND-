import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { MessageService, SelectItem } from 'primeng/api';
import { MapCommonComponent } from 'src/app/map-common/map-common.component';
import { ActivatedRoute } from '@angular/router';

@Component({
    templateUrl: './uploaded-books.component.html',
    styleUrls: ['./uploaded-books.component.css'] ,
    providers: [MessageService]
})

export class UploadedBooksComponent implements OnInit {
    
    @ViewChild(MapCommonComponent) mapCommon: MapCommonComponent;

    books: any[] = [];
    allBooks: any[] = [];
    apiUrl = environment.apiUrl;
    userId: string | null = null;
    sortOptions: SelectItem[] = [];
    selectedLocation: string | null = null;
    displayMapDialog: boolean = false;
    sortOrder: number = 0;
    sortField: string = '';
    searchCriterion: string = 'title';

    constructor(private http: HttpClient, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            this.userId = params.get('id');
            this.http.get<any[]>(`${this.apiUrl}/public_books`).subscribe((data) => {
                this.allBooks = data;
                this.books = [...this.allBooks];
            });
        });

        this.sortOptions = [
            { label: 'Title Ascending', value: 'title' },
            { label: 'Title Descending', value: '!title' },
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

    onFilter(event: KeyboardEvent): void {
        const searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
        if (!searchTerm) {
            this.books = [...this.allBooks]; // Reset to show all books
        } else {
            this.books = this.allBooks.filter((book) =>
                book[this.searchCriterion]?.toLowerCase().includes(searchTerm)
            );
        }
    }
    
    // Add the logic to open the map popup and use addDistanceLayer
    openMapPopup(book: any): void {
        this.displayMapDialog = true;

        // Ensure map is initialized when dialog is opened
        setTimeout(() => {
            if (this.mapCommon) {
              const addresses = [
                { meeting_location: book.meeting_location, user_id: book.user_id },
            ];
                this.mapCommon.initializeMap().then(async () => {
                    await this.mapCommon.fetchUserAddressData();
                    await this.mapCommon.addDistanceLayer(addresses);
                    this.mapCommon.setupRecenterButton();
                });
            }
        }, 500); // Short delay to ensure DOM is updated
    }

    closeMapPopup(): void {
        this.displayMapDialog = false;
    }

}
