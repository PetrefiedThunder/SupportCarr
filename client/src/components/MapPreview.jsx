import { MapContainer, Marker, TileLayer } from 'react-leaflet';
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

export default function MapPreview({ pickup, dropoff }) {
  const center = pickup || { lat: 34.078, lng: -118.260 };
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-64 rounded-lg overflow-hidden">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pickup && <Marker position={[pickup.lat, pickup.lng]} />}
      {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} />}
    </MapContainer>
  );
}
