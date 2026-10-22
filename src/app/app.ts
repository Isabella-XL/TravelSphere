import { Component, signal, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import * as Cesium from 'cesium';

interface SavedPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  memory: string;
}

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})

export class App implements OnInit, AfterViewInit, OnDestroy {
    protected readonly isGlobeLoading = signal(true);

    protected memoryText = signal('');
    protected savedMemory = signal('');

  private viewer?: Cesium.Viewer;
  private selectedLocationMarker?: Cesium.Entity;

  protected selectedCity = signal<string | null>(null);
  protected clickedCoordinates = signal<string | null>(null);
  protected clickedPlace = signal<string | null>(null);
  protected selectedMemoryKey = signal<string | null>(null);
  protected selectedLatitude = signal<number | null>(null);
protected selectedLongitude = signal<number | null>(null);

protected savedPlaces = signal<SavedPlace[]>([]);

  
  async ngAfterViewInit(): Promise<void> {
    const container = document.getElementById('cesiumContainer');

    if (!container) {
      return;
    }
    
    (window as any).CESIUM_BASE_URL = '/assets/cesium/';
    
    this.viewer = new Cesium.Viewer(container, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: true,
      sceneModePicker: false,
      navigationHelpButton: false,
       selectionIndicator: false,
       infoBox: false,
    });

    const storedPlaces = localStorage.getItem(
  'travelsphere-saved-places',
);

const places: SavedPlace[] = storedPlaces
  ? JSON.parse(storedPlaces)
  : [];

this.savedPlaces.set(places);

for (const place of places) {
  this.addSavedPlaceMarker(place);
}


    this.viewer.scene.globe.tileLoadProgressEvent.addEventListener(
  (remaining) => {
    if (remaining === 0) {
      this.isGlobeLoading.set(false);
    }
  },
);

   
this.viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(2.3522, 48.8566, 5000000),
  duration: 2,
});

    
const parisMarker = this.viewer.entities.add({
  name: 'Paris, France',
  position: Cesium.Cartesian3.fromDegrees(2.3522, 48.8566),
  point: {
    pixelSize: 12,
    color: Cesium.Color.BLUE,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
  },
  label: {
    text: 'Paris',
    font: '16px sans-serif',
    fillColor: Cesium.Color.WHITE,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset: new Cesium.Cartesian2(0, -22),
  },
});

const berlinMarker = this.viewer.entities.add({
  name: 'Berlin, Germany',
  position: Cesium.Cartesian3.fromDegrees(13.405, 52.52),
  point: {
    pixelSize: 12,
    color: Cesium.Color.DODGERBLUE,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
  },
  label: {
    text: 'Berlin',
    font: '16px sans-serif',
    fillColor: Cesium.Color.WHITE,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset: new Cesium.Cartesian2(0, -22),
  },
});

const handler = new Cesium.ScreenSpaceEventHandler(
  this.viewer.scene.canvas,
);




handler.setInputAction((event: { position: Cesium.Cartesian2 }) => {
  const pickedObject = this.viewer?.scene.pick(event.position);

if (pickedObject?.id === parisMarker) {
  this.selectedCity.set('Paris');
  this.selectedMemoryKey.set('paris');
  this.clickedCoordinates.set(null);
  this.clickedPlace.set(null);
  this.loadMemory();
  return;
}

if (pickedObject?.id === berlinMarker) {
  this.selectedCity.set('Berlin');
  this.selectedMemoryKey.set('berlin');
  this.clickedCoordinates.set(null);
  this.clickedPlace.set(null);
  this.loadMemory();
  return;
}

const pickedEntity = pickedObject?.id;

if (
  pickedEntity instanceof Cesium.Entity &&
  pickedEntity.id.startsWith('saved-place-')
) {
  const placeId = pickedEntity.id.substring(
    'saved-place-'.length,
  );

  const place = this.savedPlaces().find(
    (p) => p.id === placeId,
  );

  if (place) {
    this.selectedMemoryKey.set(place.id);
    this.selectedCity.set(place.name);

    this.selectedLatitude.set(place.latitude);
    this.selectedLongitude.set(place.longitude);

    this.clickedCoordinates.set(
      `Latitude: ${place.latitude.toFixed(4)}, Longitude: ${place.longitude.toFixed(4)}`,
    );

    this.clickedPlace.set(place.name);
    this.loadMemory();
  }

  return;
}

 const viewer = this.viewer;

if (!viewer) {
  return;
}

const ray = viewer.camera.getPickRay(event.position);

if (!ray) {
  return;
}

const pickedPosition = viewer.scene.globe.pick(
  ray,
  viewer.scene,
);

  if (pickedPosition) {
    const cartographic =
      Cesium.Cartographic.fromCartesian(pickedPosition);

    const longitude = Cesium.Math.toDegrees(
      cartographic.longitude,
    );

    const latitude = Cesium.Math.toDegrees(
      cartographic.latitude,
    );

this.selectedLatitude.set(latitude);
this.selectedLongitude.set(longitude);

    // Create a stable key for this selected location.
const locationKey =
  `location-${latitude.toFixed(4)}-${longitude.toFixed(4)}`;

this.selectedMemoryKey.set(locationKey);
this.selectedCity.set('Looking up place...');
this.loadMemory();


    // Remove the previous selection marker.
if (this.selectedLocationMarker) {
  viewer.entities.remove(this.selectedLocationMarker);
}

// Add a marker at the newly selected location.
this.selectedLocationMarker = viewer.entities.add({
  name: 'Selected location',
  position: Cesium.Cartesian3.fromDegrees(
    longitude,
    latitude,
  ),
  point: {
    pixelSize: 14,
    color: Cesium.Color.YELLOW,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
  },
});

viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    longitude,
    latitude,
    2000000,
  ),
  duration: 1.5,
});

  this.clickedCoordinates.set(
  `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`,
);

this.clickedPlace.set('Looking up place...');

fetch(
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
)
  .then((response) => {
    if (!response.ok) {
      throw new Error('Place lookup failed');
    }

    return response.json();
  })
  .then((data) => {
const address = data.address;

const city =
  address?.city ||
  address?.town ||
  address?.village ||
  address?.municipality ||
  address?.hamlet;

const country = address?.country;

const placeName = city
  ? country
    ? `${city}, ${country}`
    : city
  : data.name || data.display_name || 'No place name found';

this.clickedPlace.set(placeName);
this.selectedCity.set(placeName);

  })
  .catch(() => {
    this.clickedPlace.set('Could not find this place. Try again.');
    this.selectedCity.set('Selected location');
  });

  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);



  }

  private addSavedPlaceMarker(place: SavedPlace): void {
  if (!this.viewer) {
    return;
  }

  const markerId = `saved-place-${place.id}`;

  // Avoid creating the same marker twice.
  if (this.viewer.entities.getById(markerId)) {
    return;
  }

  this.viewer.entities.add({
    id: markerId,
    name: place.name,
    position: Cesium.Cartesian3.fromDegrees(
      place.longitude,
      place.latitude,
    ),
    point: {
      pixelSize: 14,
      color: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: place.name,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -20),
    },
  });
}

protected saveMemory(): void {
  const memory = this.memoryText().trim();
  const key = this.selectedMemoryKey();

  if (!memory || !key) {
    return;
  }

  // Save the journal text.
  localStorage.setItem(
    `travelsphere-${key}-memory`,
    memory,
  );

  this.savedMemory.set(memory);

  // Paris and Berlin already have their own markers.
  if (!key.startsWith('location-')) {
    return;
  }

  const latitude = this.selectedLatitude();
  const longitude = this.selectedLongitude();

  if (latitude === null || longitude === null) {
    return;
  }

  const place: SavedPlace = {
    id: key,
    name: this.selectedCity() ?? 'Saved location',
    latitude,
    longitude,
    memory,
  };

  // Add or update this saved place.
  const places = [
    ...this.savedPlaces().filter((p) => p.id !== key),
    place,
  ];

  this.savedPlaces.set(places);

  localStorage.setItem(
    'travelsphere-saved-places',
    JSON.stringify(places),
  );

  // Keep its marker visible on the globe.
  this.addSavedPlaceMarker(place);
}

protected closeCityCard(): void {
  this.selectedCity.set(null);
  this.selectedMemoryKey.set(null);
  this.memoryText.set('');
  this.savedMemory.set('');
  this.clickedCoordinates.set(null);
  this.clickedPlace.set(null);
}


ngOnInit(): void {
  this.loadMemory();
}

private loadMemory(): void {
  const key = this.selectedMemoryKey();

  if (!key) {
    this.memoryText.set('');
    this.savedMemory.set('');
    return;
  }

  const memory = localStorage.getItem(
    `travelsphere-${key}-memory`,
  );

  this.memoryText.set(memory ?? '');
  this.savedMemory.set(memory ?? '');
}

  ngOnDestroy(): void {
    this.viewer?.destroy();
  }
}
