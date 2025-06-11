import { Map as MapboxMap } from 'mapbox-gl';
import { DIGIPIN_GRID } from '../lib/constants';
import MapboxBounds, { MapboxBoundsProps } from './MapboxBounds';

export interface DigipinBoundsProps extends Omit<MapboxBoundsProps, 'bounds' | 'id'> {
  /**
   * The Mapbox map instance
   */
  map: MapboxMap | null;
  
  /**
   * Custom bounds to override the default DIGIPIN bounds
   * Format: [[[lng, lat], [lng, lat], ...]]
   */
  customBounds?: number[][][];
}

/**
 * A component that renders the DIGIPIN bounds on a Mapbox map.
 * This is a specialized wrapper around the generic MapboxBounds component.
 */
const DigipinBounds: React.FC<DigipinBoundsProps> = ({
  map,
  customBounds,
  showFill = true,
  showOutline = true,
  fillColor = '#00ffff',
  fillOpacity = 0.1,
  outlineColor = '#ff0000',
  outlineWidth = 2,
  outlineDashArray = [2, 2],
  ...props
}) => {
  console.log("DIGIPIN Bounds...");

  // Get the bounds from DIGIPIN_GRID.BOUNDS
  const { MIN_LON, MAX_LON, MIN_LAT, MAX_LAT } = DIGIPIN_GRID.BOUNDS;
  
  // Create bounds in the correct format for Mapbox
  const defaultBounds = [
    [MIN_LON, MIN_LAT], // SW
    [MAX_LON, MIN_LAT], // SE
    [MAX_LON, MAX_LAT], // NE
    [MIN_LON, MAX_LAT], // NW
    [MIN_LON, MIN_LAT]  // Close the polygon (back to SW)
  ];
  
  // Create a GeoJSON polygon for logging
  const boundsGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [defaultBounds] // Note the extra array for polygon rings
    },
    properties: {}
  };
  
  // Log the bounds for debugging
  console.log('DIGIPIN Bounds:', {
    minLon: MIN_LON,
    maxLon: MAX_LON,
    minLat: MIN_LAT,
    maxLat: MAX_LAT,
    bounds: defaultBounds,
    geoJSON: boundsGeoJSON
  });

  // Use custom bounds if provided, otherwise use default bounds
  const boundsToUse = customBounds || [defaultBounds]; // Wrap in array for Mapbox polygon format
  
  console.log('Using bounds:', {
    type: 'Polygon',
    coordinates: boundsToUse
  });
  
  return (
    <MapboxBounds
      map={map}
      id="digipin"
      bounds={boundsToUse}
      showFill={showFill}
      showOutline={showOutline}
      fillColor={fillColor}
      fillOpacity={fillOpacity}
      outlineColor={outlineColor}
      outlineWidth={outlineWidth}
      outlineDashArray={outlineDashArray}
      {...props}
    />
  );
};

export default DigipinBounds;
