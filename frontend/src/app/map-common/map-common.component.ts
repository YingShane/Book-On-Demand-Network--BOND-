import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-map-common',
  standalone: true,
  templateUrl: './map-common.component.html',
  styleUrls: ['./map-common.component.css']
})
export class MapCommonComponent implements OnInit {
  map: mapboxgl.Map;
  address: string = '';
  

  ngOnInit(): void {
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg';
    this.map = new mapboxgl.Map({
      container: 'map', // container ID
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: [-74.5, 40], // starting position [lng, lat]
      zoom: 9, // starting zoom
    });

    this.goToAddress('102, Jalan Rajawali, Taman Berjaya, 14300 Nibong Tebal, Pulau Pinang');

    // Create a new marker.
    this.setMarkerAtAddress('104, Jalan Rajawali, Taman Berjaya, 14300 Nibong Tebal, Pulau Pinang');
    this.setMarkerAtAddress('SJK C PAI TEIK, Jalan Ooi Kar Seng, 14300 Nibong Tebal, Pulau Pinang');
    this.setMarkerAtAddress('SMK Methodist Nibong Tebal, Jalan Sungai Daun, 14300 Nibong Tebal, Pulau Pinang');
    this.setMarkerAtAddress('102, Jalan Rajawali, Taman Berjaya, 14300 Nibong Tebal, Pulau Pinang');
  }

  async goToAddress(address: string) {
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`);
      const data = await response.json();

      if (data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        this.map.flyTo({
          center: [longitude, latitude],
          zoom: 14 // Adjust the zoom level as needed
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

  async setMarkerAtAddress (address: string) {
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=pk.eyJ1IjoieWVvMzMxNiIsImEiOiJjbTNjc3ExemwxdTJ0MmlzYzQzZm43MmgyIn0.2qA9Z9Og0SHrgBsjxfvbvg`);
    const data = await response.json();
    if (data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;

      new mapboxgl.Marker()
        .setLngLat([longitude, latitude])
        .addTo(this.map);
    } else {
      console.error('Address not found');
    }
    
  }
}

