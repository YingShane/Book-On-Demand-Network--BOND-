import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { MessageService, SelectItem } from 'primeng/api';
import { MapCommonComponent } from 'src/app/map-common/map-common.component';
import { ActivatedRoute } from '@angular/router';

@Component({
    templateUrl: './uploaded-books.component.html',
    styleUrls: ['./uploaded-books.component.css'],
    providers: [MessageService],
})
export class UploadedBooksComponent implements OnInit {
    @ViewChild(MapCommonComponent) mapCommon: MapCommonComponent;

    books: any[] = [];
    allBooks: any[] = [];
    genreOptions: SelectItem[] = [];
    apiUrl = environment.apiUrl;
    userId: string | null = null;
    sortOptions: SelectItem[] = [];
    selectedGenre: string | null = null;
    displayMapDialog: boolean = false;
    sortOrder: number = 0;
    sortField: string = '';
    searchCriterion: string = 'title';
    selectedGenres: string[] = [];
    showGenrePopup: boolean = false;

    // Advanced Search Variables
    showAdvancedSearchPopup: boolean = false;
    advancedSearchInput: string = '';
    advancedSortField: string = '';
    advancedSearchCriterion: string = 'title'; // Default criterion for advanced search
    filterByOptions: SelectItem[] = []; // Options for filtering (Author or Title)

    constructor(private http: HttpClient, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            this.userId = params.get('id');
            this.http
                .get<any[]>(`${this.apiUrl}/public_books`)
                .subscribe((data) => {
                    this.allBooks = data;
                    this.books = [...this.allBooks];
                    this.updateGenreOptions();
                });
        });

        this.sortOptions = [
            { label: 'Title Ascending', value: 'title' },
            { label: 'Title Descending', value: '!title' },
        ];

        // Initialize filter options
        this.filterByOptions = [
            { label: 'Title', value: 'title' },
            { label: 'Author', value: 'author' },
        ];
    }

    updateGenreOptions(): void {
        const genres = Array.from(
            new Set(this.allBooks.map((book) => book.genre))
        );
        this.genreOptions = genres.map((genre) => ({
            label: genre,
            value: genre,
        }));
    }

    toggleGenreSelection(genre: string): void {
        if (this.selectedGenres.includes(genre)) {
            this.selectedGenres = this.selectedGenres.filter(
                (selected) => selected !== genre
            );
        } else {
            this.selectedGenres.push(genre);
        }
    }

    onFilterGenres(): void {
        if (this.selectedGenres.length === 0) {
            this.books = [...this.allBooks];
        } else {
            this.books = this.allBooks.filter((book) =>
                this.selectedGenres.includes(book.genre)
            );
        }
        this.resetAdvancedSearch();
        this.showGenrePopup = false;
    }

    onSortChange(event: any): void {
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
        const searchTerm = (event.target as HTMLInputElement).value
            .trim()
            .toLowerCase();

        if (!searchTerm) {
            this.books = [...this.allBooks]; // Reset to show all books
        } else {
            this.books = this.allBooks.filter((book) =>
                book[this.searchCriterion]?.toLowerCase().includes(searchTerm)
            );
        }
        this.resetAdvancedSearch();

    }

    onSearchCriterionChange($event): void {
        this.searchCriterion = $event.value;
        this.resetAdvancedSearch();
        console.log('Selected Criterion:', this.searchCriterion);
    }
    onAdvancedSearchCriterionChange($event): void {
        this.advancedSearchCriterion = $event.value;
    }

    onApplyAdvancedSearch(): void {
        let filteredBooks = [...this.allBooks];

        // Apply search input
        if (this.advancedSearchInput.trim()) {
            const searchTerm = this.advancedSearchInput.trim().toLowerCase();
            filteredBooks = filteredBooks.filter((book) =>
                book[this.advancedSearchCriterion]
                    ?.toLowerCase()
                    .includes(searchTerm)
            );
        }

        // Apply genre filters
        if (this.selectedGenres.length > 0) {
            filteredBooks = filteredBooks.filter((book) =>
                this.selectedGenres.includes(book.genre)
            );
        }

        // Apply sorting
        if (this.advancedSortField) {
            const sortField = this.advancedSortField.replace('!', '');
            const sortOrder = this.advancedSortField.startsWith('!') ? -1 : 1;

            filteredBooks.sort(
                (a, b) => a[sortField].localeCompare(b[sortField]) * sortOrder
            );
        }

        this.books = filteredBooks; // Update the displayed books
        this.showAdvancedSearchPopup = false; // Close the popup
    }

    openMapPopup(book: any): void {
        this.displayMapDialog = true;

        setTimeout(() => {
            if (this.mapCommon) {
                const addresses = [
                    {
                        meeting_location: book.meeting_location,
                        user_id: book.user_id,
                    },
                ];
                this.mapCommon.initializeMap().then(async () => {
                    await this.mapCommon.fetchUserAddressData();
                    await this.mapCommon.addDistanceLayer(addresses);
                    this.mapCommon.setupRecenterButton();
                });
            }
        }, 500);
    }

    closeMapPopup(): void {
        this.displayMapDialog = false;
    }

    resetAdvancedSearch(): void {
        this.advancedSearchInput = '';
        this.advancedSearchCriterion = null;
        
        this.advancedSortField = null;
    }


    
}
