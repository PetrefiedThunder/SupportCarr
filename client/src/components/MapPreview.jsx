import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const DEFAULT_CENTER = { lat: 34.078, lng: -118.26 };

function MapClickHandler({ activeLocation, onPickupChange, onDropoffChange }) {
  useMapEvents({
    click(event) {
      if (!activeLocation) return;
      const coords = { lat: event.latlng.lat, lng: event.latlng.lng };
      if (activeLocation === 'pickup') {
        onPickupChange?.(coords);
      } else if (activeLocation === 'dropoff') {
        onDropoffChange?.(coords);
      }
    }
  });
  return null;
}

function DraggableMarker({ position, onChange }) {
  const handlers = useMemo(
    () => ({
      dragend(event) {
        const { lat, lng } = event.target.getLatLng();
        onChange?.({ lat, lng });
      }
    }),
    [onChange]
  );

  return <Marker position={[position.lat, position.lng]} draggable eventHandlers={handlers} />;
}

export default function MapPreview({
  pickup,
  dropoff,
  interactive = false,
  activeLocation,
  onPickupChange,
  onDropoffChange
}) {
  const center = pickup || dropoff || DEFAULT_CENTER;

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-64 rounded-lg overflow-hidden">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {interactive && (
        <MapClickHandler
          activeLocation={activeLocation}
          onPickupChange={onPickupChange}
          onDropoffChange={onDropoffChange}
        />
      )}
      {pickup &&
        (interactive ? (
          <DraggableMarker position={pickup} onChange={onPickupChange} />
        ) : (
          <Marker position={[pickup.lat, pickup.lng]} />
        ))}
      {dropoff &&
        (interactive ? (
          <DraggableMarker position={dropoff} onChange={onDropoffChange} />
        ) : (
          <Marker position={[dropoff.lat, dropoff.lng]} />
        ))}
    </MapContainer>
  );
}
