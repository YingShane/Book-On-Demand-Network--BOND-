import { AfterViewInit, Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as turf from '@turf/turf';

@Component({
    selector: 'app-map-common',
    standalone: true,
    templateUrl: './map-common.component.html',
    styleUrls: ['./map-common.component.css'],
    providers: [MessageService],
    imports: [FormsModule],
})
export class MapCommonComponent implements AfterViewInit {
    map: mapboxgl.Map;
    address: string = '';
    apiUrl = environment.apiUrl;
    userAddress: any;
    currentUserAddress: any;
    distance: any;
    userInfoByAddress: any;
    userInfoById: any;
    markers: Map<string, mapboxgl.Marker[]> = new Map();
    meetingLocation: any;
    meetingLocations: any;
    searchQuery: string = '';
    N: number = 5;
    distanceFeatures: any[] = [];

    constructor(
        private http: HttpClient,
        private router: Router,
        private messageService: MessageService
    ) {}
    ngAfterViewInit(): void {
        try {
            this.initializeMap().then(async () => {
                // Additional operations after map initialization
                await this.fetchUserAddressData();
                await this.fetchAllAddressData();
                this.addIsochroneLayer();

                const response = await this.http
                    .get(`${this.apiUrl}/all-meeting-locations`)
                    .toPromise();
                const meetingLocations = response['meeting_locations'] || [];

                if (meetingLocations.length === 0) {
                    console.error('No valid meeting locations found.');
                    return;
                }

                this.addDistanceLayer(meetingLocations);
                this.setupRecenterButton();
            });
        } catch (error) {
            console.error('Error during map setup or data fetching:', error);
        }
    }

    // New function to initialize the map
    async initializeMap(): Promise<void> {
        try {
            // Set up the Mapbox access token
            (mapboxgl as any).accessToken =
                'pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg';

            // Initialize the map
            this.map = new mapboxgl.Map({
                container: 'map', // container ID
                style: 'mapbox://styles/mapbox/streets-v12', // style URL
                center: [-74.5, 40], // starting position [lng, lat]
                zoom: 9, // starting zoom
            });

            // Wait for the map to be fully loaded before proceeding
            await new Promise<void>((resolve) => {
                this.map.on('load', () => {
                    console.log('Map is fully loaded!');
                    resolve(); // Resolve the promise once the map is loaded
                });
            });
        } catch (error) {
            console.error('Error initializing the map:', error);
            throw error;
        }
    }
    

    async goToAddress(address: string) {
        try {
            const coordinates = await this.getCoordinatesFromAddress(address);

            if (coordinates) {
                const [longitude, latitude] = coordinates;
                this.map.flyTo({
                    center: [longitude, latitude],
                    zoom: 13, // Adjust the zoom level as needed
                });

                return [longitude, latitude];
            } else {
                console.error('Address not found');
                return null;
            }
        } catch (error) {
            console.error('Error fetching location:', error);
            return null;
        }
    }

    setMarkerAtAddress(address: string, markerColor: string = 'blue', user_id: string = null): void {

        // Fetch geocoding data from Mapbox API
        fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                address
            )}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
        )
            .then((response) => response.json()) // Parse JSON data
            .then((data) => {
                if (data.features.length > 0) {
                    const [longitude, latitude] = data.features[0].center;

                    // Function to create and add marker with popup
                    const addMarker = (
                        markerColor: string,
                        popupContent?: string
                    ) => {
                        const marker = new mapboxgl.Marker({
                            color: markerColor,
                        })
                            .setLngLat([longitude, latitude])
                            .addTo(this.map);

                        // Create and attach the popup
                        if (popupContent) {
                            const popup = new mapboxgl.Popup({ offset: 25 })
                                .setLngLat([longitude, latitude])
                                .setHTML(popupContent)
                                .addTo(this.map);
                            marker.setPopup(popup);
                        }

                        // Attach click event
                        marker.getElement().addEventListener('click', () => {
                            this.handleMarkerClick(user_id, [
                                longitude,
                                latitude,
                            ]);
                        });

                        // Store marker in the markers map
                        if (!this.markers.has(address)) {
                            this.markers.set(address, []);
                        }
                        this.markers.get(address)?.push(marker); // Add the marker to the array
                    };

                    // Check if this is the user's current address
                    if (address === this.currentUserAddress[0]?.address) {
                        addMarker('red', "<strong>You're Here</strong>");
                    } else {
                        addMarker(markerColor); // Use the specified or default color
                    }
                } else {
                    console.error('Address not found');
                }
            })
            .catch((error) => {
                console.error('Error fetching address data:', error);
            });
    }

    removeMarker(address: string): void {
        const markers = this.markers.get(address); // Get the array of markers for the address
        if (markers && markers.length > 0) {
            const markerToRemove = markers[0]; // Get the first marker from the array (or choose based on your logic)
            markerToRemove.remove(); // Remove this marker from the map
            // After removing the marker, you can either delete the array or leave it to hold other markers
            markers.splice(0, 1); // Remove the first marker from the array
            if (markers.length === 0) {
                this.markers.delete(address); // Remove the address entry from the map if no markers remain
            }
        } else {
            console.error(`No markers found for address: ${address}`);
        }
    }

    async handleMarkerClick(
        user_id: string,
        coordinates: [number, number]
    ): Promise<void> {
        try {
            // Fetch user information based on the address
            await this.fetchUserInfoById(user_id);
            // Show user information in the popup
            this.showUserInfoPopup(coordinates);
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }

    async fetchUserInfoById(user_id: string): Promise<any> {
      try {
          const response = await this.http
              .get(`${this.apiUrl}/user-id-info`, {
                  params: { user_id },
              })
              .toPromise();

          this.userInfoById = response;
      } catch (error) {
          console.error('Error fetching user info:', error);
          throw error;
      }
  }

    async fetchUserInfoByAddress(address: string): Promise<any> {
        try {
            const response = await this.http
                .get(`${this.apiUrl}/user-info-address`, {
                    params: { address },
                })
                .toPromise();

            this.userInfoByAddress = response;
        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    }

    async showUserInfoPopup(coordinates: [number, number]): Promise<void> {
        const popupContent = `
      <div style="font-size: 14px; padding: 10px;">
        <strong>Name:</strong> ${
            this.userInfoById.first_name +
                ' ' +
                this.userInfoById.last_name || 'N/A'
        }<br>
        <strong>Email:</strong> ${this.userInfoById.email || 'N/A'}<br>
        <strong>Address:</strong> ${this.userInfoById.address || 'N/A'}<br>
        <strong>Phone:</strong> ${this.userInfoById.phone_no || 'N/A'}<br>
        <button id="view-details-button">View Full Profile</button>
      </div>
    `;

        const popup = new mapboxgl.Popup({ offset: 25 })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(this.map);

        // Use a timeout to ensure the button exists in the DOM
        setTimeout(() => {
            const button = document.getElementById('view-details-button');
            if (button) {
                button.addEventListener('click', () => {
                    // Use Angular Router to navigate to 'list' page with the user ID
                    this.router.navigate(['/list', this.userInfoById.id]);
                });
            }
        }, 0);
    }

    async getCoordinatesFromAddress(
        address: string
    ): Promise<[number, number] | null> {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                    address
                )}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
            );
            const data = await response.json();

            console.log(data)

            if (data.features && data.features.length > 0) {
                const [longitude, latitude] = data.features[0].center;
                return [longitude, latitude];
            } else {
                console.error('Address not found');
                return null;
            }
        } catch (error) {
            console.error('Error fetching coordinates:', error);
            return null;
        }
    }

    async fetchAllAddressData(): Promise<void> {
        try {
            const response = await this.http
                .get(`${this.apiUrl}/address`)
                .toPromise();
            this.userAddress = response;

            if (this.userAddress && this.userAddress.length > 0) {
                for (let i = 0; i < this.userAddress.length; i++) {
                    const address = this.userAddress[i].address;
                }
            }
        } catch (error) {
            console.error('Error fetching address data:', error);
        }
    }

    async fetchUserAddressData(): Promise<void> {
        try {
            const response = await this.http
                .get(`${this.apiUrl}/user-address`)
                .toPromise();
            this.currentUserAddress = response;
            this.goToAddress(this.currentUserAddress[0].address);
            this.setMarkerAtAddress(this.currentUserAddress[0].address);
        } catch (error) {
            console.error('Error fetching user address data:', error);
        }
    }

    async fetchMeetingLocationData(): Promise<void> {
        try {
            const response = await this.http
                .get(`${this.apiUrl}/meeting-location`)
                .toPromise();
            this.meetingLocation = response;
            if (this.meetingLocation && this.meetingLocation.length > 0) {
                for (let i = 0; i < this.meetingLocation.length; i++) {
                    const address = this.meetingLocation[i].meeting_location;

                    this.setMarkerAtAddress(address, 'yellow');
                }
            }
        } catch (error) {}
    }

    async addDistanceLayer(addresses: any[], user_id: string = null, topN: number = 3): Promise<void> {

        this.distanceFeatures = [];

        let coordinates1: any[] = await this.getCoordinatesFromAddress(
            this.currentUserAddress[0].address
        );

        // Ensure coordinates1 is valid (should be a [lat, lng] tuple)
        if (!coordinates1 || coordinates1.length !== 2) {
            console.error('Invalid coordinates for coordinates1.');
            return;
        }

        // Create an array to store distance and corresponding feature
        const distances: any[] = [];

        // Create an array to store destination coordinates for Matrix API
        const destinations: number[][] = [];

        // Loop through all addresses and collect destination coordinates
        for (let i = 0; i < addresses.length; i++) {
            let coordinates2: any[] = await this.getCoordinatesFromAddress(
                addresses[i].meeting_location
            );

            // Ensure coordinates2 is valid (should be a [lat, lng] tuple)
            if (!coordinates2 || coordinates2.length !== 2) {
                continue; // Skip if invalid coordinates
            }

            // Skip if coordinates1 and coordinates2 are the same (i.e., same address)
            if (
                (coordinates1[0] !== coordinates2[0] ||
                    coordinates1[1] !== coordinates2[1]) &&
                Array.isArray(coordinates2)
            ) {
                destinations.push(coordinates2); // Store valid destinations
            }
        }
        // Get travel times from Mapbox Matrix API (one origin and multiple destinations)
        const travelTimes = await this.calculateTravelTimesWithMatrixAPI(
            coordinates1,
            destinations
        );
        // Loop through all addresses and calculate the distance, skipping the current user address
        for (let i = 0; i < addresses.length; i++) {
            const coordinates2 = destinations[i];
            const feature = await this.calculateDistance(
                coordinates1,
                coordinates2
            ); // Wait for the distance feature

            if (feature) {
                const distance = parseFloat(
                    feature.properties.distance.replace(' km', '')
                );
                const timeData = travelTimes[i]; // Time array: [drivingTime, cyclingTime, walkingTime]

                // Ensure timeData is correctly populated
                if (timeData && timeData.length === 3) {
                    // Add travelTime to feature properties
                    feature.properties.travelTime = timeData;
                    distances.push({
                        feature,
                        distance,
                        travelTime: timeData,
                        address: addresses[i].meeting_location,
                        id: addresses[i].user_id
                    });
                }
            }
        }
        // Sort the distances by ascending order (nearest first)
        distances.sort((a: any, b: any) => a.distance - b.distance);

        // Select top N nearest addresses
        const topNearestDistances = distances.slice(0, topN);

        // Push the top N features into the distanceFeatures array
        topNearestDistances.forEach((distanceData: any) => {
            this.distanceFeatures.push(distanceData.feature);
            this.setMarkerAtAddress(distanceData.address, 'green', distanceData.id); // Set marker color to green
        });

        // Create unique source and layer IDs based on timestamp or index
        const layerId = `distanceLinesLayer_${new Date().getTime()}`; // Use timestamp for unique layer ID
        const sourceId = `distanceLinesSource_${new Date().getTime()}`; // Use timestamp for unique source ID

        // Add distance features as GeoJSON source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: this.distanceFeatures,
            },
        });

        // Add line layer to display the route
        this.map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': '#FF5733', // Customize line color here if needed
                'line-width': 3,
                'line-dasharray': [4, 2],
                'line-opacity': 0.7,
            },
        });

        // Add symbol layer for labels (Initially hidden)
        this.map.addLayer({
            id: `${layerId}_labels`, // Use a unique ID for label layer
            type: 'symbol',
            source: sourceId,
            layout: {
                'symbol-placement': 'line',
                'text-field': ['get', 'distance'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 14,
                'text-anchor': 'top',
                'text-offset': [0, 0.5],
            },
            paint: {
                'text-color': '#FFFFFF',
                'text-halo-color': '#000000',
                'text-halo-width': 2,
                'text-opacity': 0, // Initially hide text
            },
        });

        this.map.addLayer({
            id: `${layerId}_labels_travel_time`, // Unique ID for the travel time label layer
            type: 'symbol',
            source: sourceId,
            layout: {
                'symbol-placement': 'line',
                'text-field': [
                    'concat',
                    'Driving: ',
                    [
                        'coalesce',
                        [
                            'to-string',
                            ['floor', ['at', 0, ['get', 'travelTime']]],
                        ],
                        'N/A',
                    ],
                    ' min, ', // Ensure value is a string
                    'Cycling: ',
                    [
                        'coalesce',
                        [
                            'to-string',
                            ['floor', ['at', 1, ['get', 'travelTime']]],
                        ],
                        'N/A',
                    ],
                    ' min, ', // Ensure value is a string
                    'Walking: ',
                    [
                        'coalesce',
                        [
                            'to-string',
                            ['floor', ['at', 2, ['get', 'travelTime']]],
                        ],
                        'N/A',
                    ],
                    ' min', // Ensure value is a string
                ],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 12,
                'text-anchor': 'top',
                'text-offset': [0, 1],
            },
            paint: {
                'text-color': '#FFFF00', // Yellow color for text
                'text-halo-color': '#000000', // Black text halo
                'text-halo-width': 2,
                'text-opacity': 0, // Initially hide text
            },
        });

        // Add event listeners for mouse hover to show distance labels
        this.map.on('mouseenter', layerId, (e) => {
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: [layerId],
            });

            if (features.length > 0) {
                this.map.setPaintProperty(
                    `${layerId}_labels`,
                    'text-opacity',
                    1
                ); // Show distance label
                this.map.setPaintProperty(
                    `${layerId}_labels_travel_time`,
                    'text-opacity',
                    1
                );
            }
        });

        this.map.on('mouseleave', layerId, () => {
            this.map.setPaintProperty(`${layerId}_labels`, 'text-opacity', 0); // Hide distance label
            this.map.setPaintProperty(
                `${layerId}_labels_travel_time`,
                'text-opacity',
                0
            );
        });
    }

    // Function to calculate travel times for different modes using Mapbox Matrix API with a single origin
    async calculateTravelTimesWithMatrixAPI(
        origin: number[],
        destinations: number[][]
    ): Promise<any[]> {
        const travelModes = ['driving', 'cycling', 'walking'];
        const travelTimes: any[] = [];

        for (const mode of travelModes) {
            const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/${mode}/${origin.join(
                ','
            )};${destinations
                .map((dest) => dest.join(','))
                .join(
                    ';'
                )}?sources=0&annotations=distance,duration&access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`;
            const response = await fetch(matrixUrl);
            const data = await response.json();

            // Remove the first value (origin to itself) from the distances and durations arrays
            const modeTravelTimes = data.durations[0]
                .slice(1)
                .map((duration: number) => duration / 60); // Convert seconds to minutes, skipping first element
            travelTimes.push(modeTravelTimes);
        }

        // Transpose the results to match the structure for each destination
        const transposedTimes = travelTimes[0].map((_, i) =>
            travelModes.map((_, j) => travelTimes[j][i])
        );

        return transposedTimes; // Array of arrays containing [driving, cycling, walking] times for each destination
    }

    async calculateDistance(
        coordinates1: any,
        coordinates2: any
    ): Promise<any> {
        try {
            const route = await this.getRoute(coordinates1, coordinates2);

            if (route) {
                const distance = route.distance; // Distance in meters
                const lineFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: route.geometry.coordinates,
                    },
                    properties: {
                        distance: (distance / 1000).toFixed(2) + ' km', // Display distance in km
                    },
                };
                return lineFeature;
            }
        } catch (error) {
            return null;
        }
    }

    // Helper function to fetch a route using Mapbox Directions API
    async getRoute(
        coordinates1: [number, number],
        coordinates2: [number, number]
    ): Promise<any> {
        const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates1.join(
                ','
            )};${coordinates2.join(
                ','
            )}?geometries=geojson&access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            return data.routes[0]; // Return the first route
        }
        return null;
    }

    async setupRecenterButton(): Promise<void> {
        const button = document.getElementById(
            'recenterButton'
        ) as HTMLButtonElement;
        if (button) {
            // Add click event listener
            button.addEventListener('click', async () => {
                // Define the coordinates you want to recenter the map on (example: Singapore)
                const coordinates = await this.getCoordinatesFromAddress(
                    this.currentUserAddress[0].address
                );

                // Recenter the map
                this.recenterMap(coordinates);
            });
        }
    }

    recenterMap(coordinates: [number, number]): void {
        this.map.flyTo({
            center: coordinates, // The coordinates to center the map
            zoom: 12, // Optional zoom level
            speed: 1, // Optional animation speed
            curve: 1, // Optional easing curve
            bearing: 1,
            pitch: 1,
            easing(t) {
                // Optional easing function
                return t;
            },
        });
    }

    async getIsochroneArea(
        centerCoordinates: [number, number],
        minutes: number = 10
    ): Promise<any> {
        try {
            const response = await fetch(
                `https://api.mapbox.com/isochrone/v1/mapbox/driving/${centerCoordinates.join(
                    ','
                )}?contours_minutes=${minutes}&polygons=true&access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
            );
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching isochrone data:', error);
            return null;
        }
    }

    // Function to add the isochrone layer to the map
    async addIsochroneLayer(minutes: number = 10): Promise<void> {
        const userCoordinates = await this.getCoordinatesFromAddress(
            this.currentUserAddress[0].address
        );
        if (!userCoordinates) return;

        const isochroneData = await this.getIsochroneArea(
            userCoordinates,
            minutes
        );
        if (!isochroneData) return;

        // Add the isochrone as a new source and layer
        this.map.addSource('isochroneArea', {
            type: 'geojson',
            data: isochroneData,
        });

        this.map.addLayer({
            id: 'isochroneAreaLayer',
            type: 'fill',
            source: 'isochroneArea',
            paint: {
                'fill-color': '#FF5733',
                'fill-opacity': 0.3,
            },
        });
    }

    // Function to filter and display users within the isochrone area
    async filterUsersWithinIsochrone(minutes: number = 10): Promise<void> {
        const userCoordinates = await this.getCoordinatesFromAddress(
            this.currentUserAddress[0].address
        );
        if (!userCoordinates) return;

        const isochroneData = await this.getIsochroneArea(
            userCoordinates,
            minutes
        );
        if (!isochroneData) return;

        const isochronePolygon = turf.polygon(
            isochroneData.features[0].geometry.coordinates
        );

        for (const user of this.userAddress) {
            const userCoords = await this.getCoordinatesFromAddress(
                user.address
            );
            if (!userCoords) continue;

            const userPoint = turf.point(userCoords);
            const isInside = turf.booleanPointInPolygon(
                userPoint,
                isochronePolygon
            );

            if (isInside) {
                this.setMarkerAtAddress(user.address);
            }
        }
    }

    // Example method to initialize the isochrone filtering
    async setupIsochroneFiltering(minutes: number = 10): Promise<void> {
        await this.addIsochroneLayer(minutes);
        await this.filterUsersWithinIsochrone(minutes);
    }

    async searchLocation(): Promise<void> {
        try {
            await this.clearDrawnLines();
            if (this.searchQuery) {
                // First, go to the address and set the marker for the search query
                await this.goToAddress(this.searchQuery);
                await this.setMarkerAtAddress(this.searchQuery, 'yellow');

                // Fetch all meeting locations from the backend
                const response = await this.http
                    .get(`${this.apiUrl}/all-meeting-locations`)
                    .toPromise();

                const meetingLocations = response['meeting_locations'] || [];

                
                if (meetingLocations.length === 0) {
                    console.error('No valid meeting locations found.');
                    return;
                }

                this.addDistanceLayer(meetingLocations);
            }
        } catch (error) {
            console.error('Error during search:', error);
        }
    }

    async clearDrawnLines(): Promise<void> {
        // Get all layers currently on the map
        const layers = this.map.getStyle().layers;
        for (const address of this.markers.keys()) {
            if (address !== this.currentUserAddress[0].address) {
                this.removeMarker(address);
            }
        }

        if (!layers) return;

        // Loop through the layers and remove those matching the line or label patterns
        layers.forEach((layer) => {
            if (
                layer.id.startsWith('distanceLinesLayer_') ||
                layer.id.startsWith('distanceLinesSource_')
            ) {
                // Remove the layer
                this.map.removeLayer(layer.id);

                // Also remove the source associated with the layer
                if (this.map.getSource(layer.id)) {
                    this.map.removeSource(layer.id);
                }
            }
        });
    }

    showTravelTimes(mode: 'driving' | 'cycling' | 'walking') {
        const modeIndex = { driving: 0, cycling: 1, walking: 2 }[mode];

        this.distanceFeatures.forEach((feature) => {
            const travelTimes = feature.properties.travelTime;
            const coordinates = feature.geometry.coordinates;

            if (travelTimes && travelTimes.length > modeIndex) {
                const travelTime = travelTimes[modeIndex];

                // Create the popup content with a custom close button
                const popupContent = document.createElement('div');
                const popupText = document.createElement('span');
                const closeButton = document.createElement('button');

                // Set popup text
                popupText.textContent = `${
                    mode.charAt(0).toUpperCase() + mode.slice(1)
                } Time: ${travelTime.toFixed(2)} min`;

                // Create the close button
                closeButton.textContent = '×';
                closeButton.style.background = 'none';
                closeButton.style.border = 'none';
                closeButton.style.fontSize = '20px';
                closeButton.style.cursor = 'pointer';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '0px'; // Adjusted position to move the button higher
                closeButton.style.right = '10px'; // Adjusted to keep the button at the top-right
                closeButton.style.color = '#FF5733';

                // Append the text and close button to the popup content
                popupContent.appendChild(popupText);
                popupContent.appendChild(closeButton);

                // Create the popup
                const popup = new mapboxgl.Popup({
                    closeOnClick: false,
                    closeButton: false,
                }).setDOMContent(popupContent);

                // Set the popup at the feature's coordinates
                popup
                    .setLngLat(coordinates[coordinates.length - 1])
                    .addTo(this.map);

                // Add event listener for close button
                closeButton.addEventListener('click', () => {
                    popup.remove();
                });
            }
        });
    }
}
