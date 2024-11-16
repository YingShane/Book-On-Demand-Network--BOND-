import { AfterViewInit, Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import * as turf from '@turf/turf';

@Component({
  selector: 'app-map-common',
  standalone: true,
  templateUrl: './map-common.component.html',
  styleUrls: ['./map-common.component.css'],
  providers: [MessageService]
})
export class MapCommonComponent implements AfterViewInit {
  map: mapboxgl.Map;
  address: string = '';
  apiUrl = environment.apiUrl;
  userAddress: any;
  currentUserAddress: any;
  distance: any;
  userInfoByAddress: any;
  markers: Map<string, mapboxgl.Marker> = new Map();

  constructor(private http: HttpClient, private router: Router,  private messageService: MessageService) {}
  async ngAfterViewInit(): Promise<void> {
    try {
      // Set up the Mapbox access token
      (mapboxgl as any).accessToken = 'pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg';
  
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
  
      // Fetch user address data first
      await this.fetchUserAddressData();
  
      // Then, fetch all address data
      await this.fetchAllAddressData();
  
      // After both data fetching operations, add the layers
      this.addIsochroneLayer();
      this.addDistanceLayer();
      this.setupRecenterButton();
  
    } catch (error) {
      console.error('Error during map setup or data fetching:', error);
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
  

  setMarkerAtAddress(address: string): void {
    // Fetch geocoding data from Mapbox API
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
    )
    .then((response) => response.json())  // Parse JSON data
    .then((data) => {
      if (data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
  
        // Function to create and add marker with popup
        const addMarker = (markerColor: string, popupContent?: string) => {
          const marker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat([longitude, latitude])
            .addTo(this.map);

          this.markers.set(address, marker);
  
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
            this.handleMarkerClick(address, [longitude, latitude]);
          });
        };
  
        // Check if this is the user's current address
        if (address === this.currentUserAddress[0]?.address) {
          addMarker('red', "<strong>You're Here</strong>");
        } else {
          addMarker('blue');
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
    const marker = this.markers.get(address); // Get the marker for the address
    if (marker) {
      marker.remove(); // Remove the marker from the map
      this.markers.delete(address); // Remove the marker from the Map
    } else {
      console.error(`No marker found for address: ${address}`);
    }
  }
  

  async handleMarkerClick(address: string, coordinates: [number, number]): Promise<void> {
    try {
      // Fetch user information based on the address
      await this.fetchUserInfoByAddress(address);
      // Show user information in the popup
      this.showUserInfoPopup(coordinates);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }  

  async fetchUserInfoByAddress(address: string): Promise<any> {
    try {
      const response = await this.http.get(`${this.apiUrl}/user-info-address`, {
        params: { address }
      }).toPromise();

      this.userInfoByAddress = response;
      console.log(this.userInfoByAddress)
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  async showUserInfoPopup(coordinates: [number, number]): Promise<void> {
    const popupContent = `
      <div style="font-size: 14px; padding: 10px;">
        <strong>Name:</strong> ${this.userInfoByAddress.first_name + " " + this.userInfoByAddress.last_name || 'N/A'}<br>
        <strong>Email:</strong> ${this.userInfoByAddress.email || 'N/A'}<br>
        <strong>Address:</strong> ${this.userInfoByAddress.address || 'N/A'}<br>
        <strong>Phone:</strong> ${this.userInfoByAddress.phone_no || 'N/A'}<br>
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
          console.log(this.userInfoByAddress.id)
          // Use Angular Router to navigate to 'list' page with the user ID
          this.router.navigate(['/list', this.userInfoByAddress.id]);
        });
      }
    }, 0);
  }

  async getCoordinatesFromAddress(address: string): Promise<[number, number] | null> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
      );
      const data = await response.json();
  
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
      const response = await this.http.get(`${this.apiUrl}/address`).toPromise();
      this.userAddress = response;
  
      if (this.userAddress && this.userAddress.length > 0) {
        // Iterate over each pair of addresses to calculate distances
        for (let i = 0; i < this.userAddress.length; i++) {
          const address1 = this.userAddress[i].address;
          this.setMarkerAtAddress(address1);
        }
      }
    } catch (error) {
      console.error('Error fetching address data:', error);
    }
  }
  

  async fetchUserAddressData(): Promise<void> {
    const response = await this.http.get(`${this.apiUrl}/user-address`).toPromise();
    this.currentUserAddress = response;
    this.goToAddress(this.currentUserAddress[0].address);
  }

  async addDistanceLayer(): Promise<void> {
    const distanceFeatures = [];
    const coordinates1 = await this.getCoordinatesFromAddress(this.currentUserAddress[0].address);

    for (let i = 0; i < this.userAddress.length; i++) {
        const coordinates2 = await this.getCoordinatesFromAddress(this.userAddress[i].address);

        if (coordinates1 && coordinates2) {
            // Fetch route between coordinates1 and coordinates2 using Mapbox Directions API
            const route = await this.getRoute(coordinates1, coordinates2);
            if (route) {
                const distance = route.distance; // Distance in meters
                const lineFeature = {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: route.geometry.coordinates
                    },
                    properties: {
                        distance: (distance / 1000).toFixed(2) + " km" // Display distance in km
                    }
                };
                distanceFeatures.push(lineFeature);
            }
        }
    }

    // Add distance features as GeoJSON source
    this.map.addSource('distanceLines', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: distanceFeatures
        }
    });

    // Add line layer to display the route
    this.map.addLayer({
        id: 'distanceLinesLayer',
        type: 'line',
        source: 'distanceLines',
        paint: {
            'line-color': '#FF5733',
            'line-width': 3,
            'line-dasharray': [4, 2],
            'line-opacity': 0.7
        }
    });

    // Add symbol layer for labels (Initially hidden)
    this.map.addLayer({
        id: 'distanceLabelsLayer',
        type: 'symbol',
        source: 'distanceLines',
        layout: {
            'symbol-placement': 'line',
            'text-field': ['get', 'distance'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
            'text-anchor': 'top',
            'text-offset': [0, 0.5]
        },
        paint: {
            'text-color': '#FFFFFF',
            'text-halo-color': '#000000',
            'text-halo-width': 2,
            'text-opacity': 0 // Initially hide text
        }
    });

    // Add event listeners for mouse hover to show distance labels
    this.map.on('mouseenter', 'distanceLinesLayer', (e) => {
        const features = this.map.queryRenderedFeatures(e.point, {
            layers: ['distanceLinesLayer']
        });

        if (features.length > 0) {
            this.map.setPaintProperty('distanceLabelsLayer', 'text-opacity', 1); // Show distance label
        }
    });

    this.map.on('mouseleave', 'distanceLinesLayer', () => {
        this.map.setPaintProperty('distanceLabelsLayer', 'text-opacity', 0); // Hide distance label
    });
}

// Helper function to fetch a route using Mapbox Directions API
async getRoute(coordinates1: [number, number], coordinates2: [number, number]): Promise<any> {
    const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates1.join(',')};${coordinates2.join(',')}?geometries=geojson&access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
    );
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
        return data.routes[0]; // Return the first route
    }
    return null;
}


  async setupRecenterButton(): Promise<void> {
    const button = document.getElementById('recenterButton') as HTMLButtonElement;
    if (button) {
      // Add click event listener
      button.addEventListener('click', async () => {
        // Define the coordinates you want to recenter the map on (example: Singapore)
        const coordinates = await this.getCoordinatesFromAddress(this.currentUserAddress[0].address);
  
        // Recenter the map
        this.recenterMap(coordinates);
      });
    }
  }

  recenterMap(coordinates: [number, number]): void {
    this.map.flyTo({
      center: coordinates,  // The coordinates to center the map
      zoom: 12,             // Optional zoom level
      speed: 1,             // Optional animation speed
      curve: 1,             // Optional easing curve
      bearing: 1,
      pitch: 1,
      easing(t) {           // Optional easing function
        return t;
      }
    });
  }

  async getIsochroneArea(centerCoordinates: [number, number], minutes: number = 10): Promise<any> {
    try {
        const response = await fetch(
            `https://api.mapbox.com/isochrone/v1/mapbox/driving/${centerCoordinates.join(',')}?contours_minutes=${minutes}&polygons=true&access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
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
    const userCoordinates = await this.getCoordinatesFromAddress(this.currentUserAddress[0].address);
    if (!userCoordinates) return;

    const isochroneData = await this.getIsochroneArea(userCoordinates, minutes);
    if (!isochroneData) return;

    // Add the isochrone as a new source and layer
    this.map.addSource('isochroneArea', {
        type: 'geojson',
        data: isochroneData
    });

    this.map.addLayer({
        id: 'isochroneAreaLayer',
        type: 'fill',
        source: 'isochroneArea',
        paint: {
            'fill-color': '#FF5733',
            'fill-opacity': 0.3
        }
    });
}

// Function to filter and display users within the isochrone area
async filterUsersWithinIsochrone(minutes: number = 10): Promise<void> {
    const userCoordinates = await this.getCoordinatesFromAddress(this.currentUserAddress[0].address);
    if (!userCoordinates) return;

    const isochroneData = await this.getIsochroneArea(userCoordinates, minutes);
    if (!isochroneData) return;

    const isochronePolygon = turf.polygon(isochroneData.features[0].geometry.coordinates);

    for (const user of this.userAddress) {
        const userCoords = await this.getCoordinatesFromAddress(user.address);
        if (!userCoords) continue;

        const userPoint = turf.point(userCoords);
        const isInside = turf.booleanPointInPolygon(userPoint, isochronePolygon);

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
}

