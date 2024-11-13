import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageService } from 'primeng/api';
import * as turf from '@turf/turf';

@Component({
  selector: 'app-map-common',
  standalone: true,
  templateUrl: './map-common.component.html',
  styleUrls: ['./map-common.component.css'],
  providers: [MessageService]
})
export class MapCommonComponent implements OnInit {
  map: mapboxgl.Map;
  address: string = '';
  apiUrl = environment.apiUrl;
  userAddress: any;
  currentUserAddress: any;
  distance: any;


  constructor(private http: HttpClient, private messageService: MessageService) {}

  ngOnInit(): void {
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg';
    this.map = new mapboxgl.Map({
      container: 'map', // container ID
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: [-74.5, 40], // starting position [lng, lat]
      zoom: 9, // starting zoom 
    });

    Promise.all([this.fetchUserAddressData(), this.fetchAllAddressData(), this.setupRecenterButton()])
    .then(() => {
      // Once both methods are complete, add the distance layer
      this.addDistanceLayer();
    })
    .catch((error) => {
      console.error('Error executing fetch operations:', error);
    });
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
  

  async setMarkerAtAddress(address: string) {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`
    );
    const data = await response.json();
    if (data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      
      
  
      // Check if the current address is the user's address
      if (address === this.currentUserAddress[0].address) {
        const marker = new mapboxgl.Marker({color: 'red'})
        .setLngLat([longitude, latitude])
        .addTo(this.map);
        // Create a popup with the label "You're Here"
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setLngLat([longitude, latitude])
          .setHTML("<strong>You're Here</strong>")
          .addTo(this.map);
  
        // Attach the popup to the marker
        marker.setPopup(popup);
      } else {
        new mapboxgl.Marker()
        .setLngLat([longitude, latitude])
        .addTo(this.map);
      }
    } else {
      console.error('Address not found');
    }
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
        const from = turf.point([coordinates1[0], coordinates1[1]]);
        const to = turf.point([coordinates2[0], coordinates2[1]]);
        const options = { units: 'meters' as 'miles' | 'kilometers' | 'radians' | 'degrees' | 'meters' };
        const distance = turf.distance(from, to, options);
  
        const lineFeature = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [coordinates1, coordinates2]
          },
          properties: {
            distance: distance.toFixed(2) + " meters"
          }
        };
  
        distanceFeatures.push(lineFeature);
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
  
    // Add line layer
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
  
    // Add event listeners for mouse hover
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
}

