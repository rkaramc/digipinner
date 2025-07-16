import React from "react";
import { convertGeoLocationToDIGIPIN } from "../utils/geoUtils";

interface MarkerPositionDisplayProps {
  position: {
    lng: number;
    lat: number;
  };
  zoomLevel: number;
}

const MarkerPositionDisplay: React.FC<MarkerPositionDisplayProps> = ({
  position,
  zoomLevel,
}) => {
  return (
    <div
      className="mt-4 p-4 bg-white shadow rounded-lg"
      data-testid="marker-position-display"
    >
      <h3 className="text-lg font-medium text-gray-900">Marker Position</h3>
      <div
        className="text-sm font-small text-gray-900"
        data-testid="position-details"
      >
        {position.lng === 0 && position.lat === 0 && <p>Marker not placed</p>}
        {position.lng !== 0 && position.lat !== 0 && (
          <>
            <p data-testid="zoom-level">Zoom Level: {zoomLevel.toFixed(1)}</p>
            <p>
              <span data-testid="longitude">
                Longitude: {position.lng.toFixed(6)}
              </span>
              ,{" "}
              <span data-testid="latitude">
                Latitude: {position.lat.toFixed(6)}
              </span>
              ,{" "}
              <span data-testid="digipin">
                DIGIPIN:{" "}
                {convertGeoLocationToDIGIPIN(position.lat, position.lng)}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default MarkerPositionDisplay;
