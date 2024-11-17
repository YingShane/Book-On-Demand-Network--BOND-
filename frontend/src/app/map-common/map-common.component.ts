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
  imports: [FormsModule]
})
export class MapCommonComponent implements AfterViewInit {
  map: mapboxgl.Map;
  address: string = '';
  apiUrl = environment.apiUrl;
  userAddress: any;
  currentUserAddress: any;
  distance: any;
  userInfoByAddress: any;
  markers: Map<string, mapboxgl.Marker[]> = new Map();
  meetingLocation: any;
  meetingLocations: any;
  searchQuery: string = '';
  N: number = 5;  

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
  

      await this.fetchUserAddressData();
      await this.fetchAllAddressData();
  
      this.addIsochroneLayer();
      // this.addDistanceLayer(this.userAddress);
      const response = await this.http.get(`${this.apiUrl}/all-meeting-locations`).toPromise();
      const meetingLocations = response['meeting_locations'] || [];
      if (meetingLocations.length === 0) {
        console.error("No valid meeting locations found.");
        return;
      }
      this.addDistanceLayer(meetingLocations); 
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
  

  setMarkerAtAddress(address: string, markerColor: string = 'blue'): void {
    // Fetch geocoding data from Mapbox API
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
    )
      .then((response) => response.json()) // Parse JSON data
      .then((data) => {
        if (data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center;
  
          // Function to create and add marker with popup
          const addMarker = (markerColor: string, popupContent?: string) => {
            const marker = new mapboxgl.Marker({ color: markerColor })
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
              this.handleMarkerClick(address, [longitude, latitude]);
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
        
        for (let i = 0; i < this.userAddress.length; i++) {
          const address = this.userAddress[i].address;
          // this.setMarkerAtAddress(address);
        }
      }
    } catch (error) {
      console.error('Error fetching address data:', error);
    }
  }
  

  async fetchUserAddressData(): Promise<void> {
    try {
      const response = await this.http.get(`${this.apiUrl}/user-address`).toPromise();
      this.currentUserAddress = response;
      this.goToAddress(this.currentUserAddress[0].address);
      this.setMarkerAtAddress(this.currentUserAddress[0].address);
    } catch (error) {
      console.error('Error fetching user address data:', error);
    }
    
  }

  async fetchMeetingLocationData(): Promise<void> {
    try {
      const response = await this.http.get(`${this.apiUrl}/meeting-location`).toPromise();
      this.meetingLocation = response;
      if (this.meetingLocation && this.meetingLocation.length > 0) {
        
        for (let i = 0; i < this.meetingLocation.length; i++) {
          const address = this.meetingLocation[i].meeting_location;
          
          this.setMarkerAtAddress(address, 'green');
        }
      }
    } catch (error) {

    }
  }

  async addDistanceLayer(addresses: any[], topN: number = 3): Promise<void> {
    console.log('hello')
    console.log(addresses)
    const distanceFeatures: any[] = [];
    const coordinates1 = await this.getCoordinatesFromAddress(this.currentUserAddress[0].address);

    // Ensure coordinates1 is valid (should be a [lat, lng] tuple)
    if (!coordinates1 || coordinates1.length !== 2) {
        console.error("Invalid coordinates for coordinates1.");
        return;
    }

    // Create an array to store distance and corresponding feature
    const distances: any[] = [];

    // Loop through all addresses and calculate the distance, skipping the current user address
    for (let i = 0; i < addresses.length; i++) {
      console.log(addresses[i])
        const coordinates2 = await this.getCoordinatesFromAddress(addresses[i]);

        // Ensure coordinates2 is valid (should be a [lat, lng] tuple)
        if (!coordinates2 || coordinates2.length !== 2) {
            continue; // Skip if invalid coordinates
        }

        // Skip if coordinates1 and coordinates2 are the same (i.e., same address)
        if (coordinates1[0] !== coordinates2[0] || coordinates1[1] !== coordinates2[1]) {
            const feature = await this.calculateDistance(coordinates1, coordinates2); // Wait for the distance feature
            if (feature) {
                const distance = parseFloat(feature.properties.distance.replace(" km", ""));
                distances.push({ feature, distance, address: addresses[i] });
            }
        }
    }

    // Sort the distances by ascending order (nearest first)
    distances.sort((a: any, b: any) => a.distance - b.distance);

    // Select top N nearest addresses
    const topNearestDistances = distances.slice(0, topN);

    // Push the top N features into the distanceFeatures array
    topNearestDistances.forEach((distanceData: any) => {
        distanceFeatures.push(distanceData.feature);
        console.log(distanceData)

        // Set markers for the top N nearest addresses
        console.log(`Adding marker for ${distanceData.address}`); // Debugging line
        this.setMarkerAtAddress(distanceData.address, 'green'); // Set marker color to green
    });

    // Create unique source and layer IDs based on timestamp or index
    const layerId = `distanceLinesLayer_${new Date().getTime()}`; // Use timestamp for unique layer ID
    const sourceId = `distanceLinesSource_${new Date().getTime()}`; // Use timestamp for unique source ID

    // Add distance features as GeoJSON source
    this.map.addSource(sourceId, {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: distanceFeatures
        }
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
            'line-opacity': 0.7
        }
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
    this.map.on('mouseenter', layerId, (e) => {
        const features = this.map.queryRenderedFeatures(e.point, {
            layers: [layerId]
        });

        if (features.length > 0) {
            this.map.setPaintProperty(`${layerId}_labels`, 'text-opacity', 1); // Show distance label
        }
    });

    this.map.on('mouseleave', layerId, () => {
        this.map.setPaintProperty(`${layerId}_labels`, 'text-opacity', 0); // Hide distance label
    });
}



async calculateDistance(coordinates1: any, coordinates2: any): Promise<any> {
    try {
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
            return lineFeature;
        }

    } catch (error) {
        return null;
    }
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

async searchLocation(): Promise<void> {
  try {
    await this.clearDrawnLines();
    if (this.searchQuery) {
      // First, go to the address and set the marker for the search query
      await this.goToAddress(this.searchQuery);
      await this.setMarkerAtAddress(this.searchQuery, 'yellow');
  
      // Fetch all meeting locations from the backend
      const response = await this.http.get(`${this.apiUrl}/all-meeting-locations`).toPromise();
      const meetingLocations = response['meeting_locations'] || [];

      if (meetingLocations.length === 0) {
        console.error("No valid meeting locations found.");
        return;
      }

      console.log(meetingLocations)
      
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
    if (layer.id.startsWith('distanceLinesLayer_') || layer.id.startsWith('distanceLinesSource_')) {
      // Remove the layer
      this.map.removeLayer(layer.id);

      // Also remove the source associated with the layer
      if (this.map.getSource(layer.id)) {
        this.map.removeSource(layer.id);
      }
    }
  });
}






}

