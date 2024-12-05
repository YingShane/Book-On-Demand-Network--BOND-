import { Component, OnInit, ViewChild } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { MapCommonComponent } from 'src/app/map-common/map-common.component';

@Component({
    templateUrl: './user-uploaded-books.component.html',
})
export class UserUploadedBooksComponent implements OnInit {
    @ViewChild(MapCommonComponent) mapCommon: MapCommonComponent;

    books: any[] = [];
    apiUrl = environment.apiUrl;
    userId: string | null = null;
    sortOptions: SelectItem[] = [];
    selectedLocation: string | null = null;
    displayMapDialog: boolean = false;
    sortOrder: number = 0;
    sortField: string = '';

    constructor(private http: HttpClient, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            this.userId = params.get('id');
            console.log('User ID:', this.userId);

            if (this.userId) {
                this.http.get<any[]>(`${this.apiUrl}/books-available/${this.userId}`).subscribe((data) => {
                    this.books = data;
                    console.log(this.books);
                });
            } else {
                this.http.get<any[]>(`${this.apiUrl}/books-available`).subscribe((data) => {
                    this.books = data;
                    console.log(this.books);
                });
            }
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

    onFilter(dv: any, event: Event) {
        dv.filter((event.target as HTMLInputElement).value);
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
