import React from 'react';
import { convertGeoLocationToDIGIPIN } from '../utils/geoUtils';

interface MarkerPositionDisplayProps {
  position: {
    lng: number;
    lat: number;
  };
}

const MarkerPositionDisplay: React.FC<MarkerPositionDisplayProps> = ({ position }) => {
  return (
    <div className="mt-4 p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-medium text-gray-900">Marker Position</h3>
      <p className="mt-2 text-sm text-gray-500">
        Longitude: {position.lng.toFixed(6)}, Latitude:{" "}
        {position.lat.toFixed(6)}, DIGIPIN: {convertGeoLocationToDIGIPIN(position.lat, position.lng)}
      </p>
    </div>
  );
};

export default MarkerPositionDisplay;
