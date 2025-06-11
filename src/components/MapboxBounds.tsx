import { useEffect } from 'react';
import { Map as MapboxMap } from 'mapbox-gl';

export interface MapboxBoundsProps {
  /**
   * The Mapbox map instance
   */
  map: MapboxMap | null;
  
  /**
   * The bounds to display as a GeoJSON Polygon coordinates array
   * Format: [[[lng, lat], [lng, lat], ...]]
   */
  bounds: number[][][];
  
  /**
   * Whether to show the fill layer
   * @default true
   */
  showFill?: boolean;
  
  /**
   * Whether to show the outline layer
   * @default true
   */
  showOutline?: boolean;
  
  /**
   * Fill color (CSS color string)
   * @default '#00ffff'
   */
  fillColor?: string;
  
  /**
   * Fill opacity (0-1)
   * @default 0.1
   */
  fillOpacity?: number;
  
  /**
   * Outline color (CSS color string)
   * @default '#ff0000'
   */
  outlineColor?: string;
  
  /**
   * Outline width in pixels
   * @default 2
   */
  outlineWidth?: number;
  
  /**
   * Outline dash array
   * @default [2, 2]
   */
  outlineDashArray?: number[];
  
  /**
   * Unique ID for this bounds instance (used for layer/source IDs)
   */
  id: string;
}

/**
 * A generic component that renders a polygon on a Mapbox map
 */
const MapboxBounds: React.FC<MapboxBoundsProps> = ({
  map,
  bounds,
  showFill = true,
  showOutline = true,
  fillColor = '#00ffff',
  fillOpacity = 0.1,
  outlineColor = '#ff0000',
  outlineWidth = 2,
  outlineDashArray = [2, 2],
  id
}) => {
  useEffect(() => {
    if (!map) {
      console.log('Map not available');
      return;
    }
    
    const sourceId = `bounds-${id}`;
    const fillLayerId = `${sourceId}-fill`;
    const outlineLayerId = `${sourceId}-outline`;
    
    console.log('MapboxBounds mounted with id:', id);
    
    // Log initial map state safely
    const logMapState = () => {
      try {
        return {
          isStyleLoaded: map.isStyleLoaded(),
          loaded: map.loaded(),
          style: map.getStyle ? 'present' : 'missing'
        };
      } catch (error) {
        return { error: 'Error getting map state', details: error };
      }
    };
    
    console.log('Map ready state:', logMapState());

    // Function to safely check if a layer exists
    const layerExists = (layerId: string): boolean => {
      if (!map) return false;
      try {
        let l = null;
        if(map.getLayer) {
          l = map.getLayer(layerId);
          console.log('Layer exists:', layerId, l);
        }
        return !!l;
      } catch (error) {
        console.warn(`Error checking layer ${layerId}:`, error);
        return false;
      }
    };
    
    // Function to safely check if a source exists
    const sourceExists = (srcId: string): boolean => {
      if (!map) return false;
      try {
        return map.getSource ? !!map.getSource(srcId) : false;
      } catch (error) {
        console.warn(`Error checking source ${srcId}:`, error);
        return false;
      }
    };
    
    // Function to safely remove layers and source
    const cleanup = () => {
      if (!map) return;
      
      try {
        // Remove layers if they exist
        if (layerExists(fillLayerId)) {
          map.removeLayer(fillLayerId);
          console.log('Removed fill layer:', fillLayerId);
        }
        
        if (layerExists(outlineLayerId)) {
          map.removeLayer(outlineLayerId);
          console.log('Removed outline layer:', outlineLayerId);
        }
        
        // Remove source if it exists
        if (sourceExists(sourceId)) {
          // Remove layers first to avoid style errors
          if (layerExists(fillLayerId)) {
            map.removeLayer(fillLayerId);
          }
          if (layerExists(outlineLayerId)) {
            map.removeLayer(outlineLayerId);
          }
          
          map.removeSource(sourceId);
          console.log('Removed source:', sourceId);
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };

    // Function to safely add a layer
    const safeAddLayer = (layer: any, beforeId?: string) => {
      try {
        if (!map || !map.addLayer) return false;
        
        if (beforeId && !layerExists(beforeId)) {
          console.warn(`Before layer not found: ${beforeId}, adding to top`);
          map.addLayer(layer);
        } else {
          map.addLayer(layer, beforeId);
        }
        return true;
      } catch (error) {
        console.error(`Error adding layer ${layer.id}:`, error);
        return false;
      }
    };
    
    // Update layers when map or bounds change
    const updateLayers = () => {
      console.log('updateLayers called');
      
      if (!map) {
        console.log('Map not available');
        return;
      }
      
      // Wait for map to be fully loaded with style
      const checkMapReady = () => {
        try {
          return map.loaded() && map.isStyleLoaded() && map.getStyle();
        } catch (error) {
          return false;
        }
      };
      
      if (!checkMapReady()) {
        console.log('Map not ready, will retry...');
        const onLoad = () => {
          map.off('load', onLoad);
          updateLayers();
        };
        map.on('load', onLoad);
        return;
      }

      console.log('Map style loaded, adding bounds:', { bounds });

      // Ensure we have valid bounds
      if (!bounds || !Array.isArray(bounds) || !bounds[0] || !Array.isArray(bounds[0])) {
        console.error('Invalid bounds format:', bounds);
        return;
      }
      
      // Ensure we have a valid style
      const style = map.getStyle();
      if (!style || !style.sources) {
        console.error('Map style not properly loaded');
        return;
      }

      const addLayers = () => {
        try {
          const style = map.getStyle();
          console.log('Current map sources:', Object.keys(style.sources));
          console.log('Current map layers:', style.layers.map(l => l.id));
          
          // Create GeoJSON feature
          const sourceData = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: bounds
            },
            properties: {}
          };

          // Remove existing source and layers if they exist
          if (map.getSource(sourceId)) {
            console.log('Removing existing source:', sourceId);
            if (map.getLayer(fillLayerId)) {
              map.removeLayer(fillLayerId);
              console.log('Removed fill layer:', fillLayerId);
            }
            if (map.getLayer(outlineLayerId)) {
              map.removeLayer(outlineLayerId);
              console.log('Removed outline layer:', outlineLayerId);
            }
            map.removeSource(sourceId);
            console.log('Removed source:', sourceId);
          }

          console.log('Adding new source:', sourceId);
          console.log('Source data:', JSON.stringify(sourceData, null, 2));
          
          // Add the source
          console.log('Adding new source:', sourceId);
          try {
            map.addSource(sourceId, {
              type: 'geojson',
              data: sourceData
            });
            console.log('Source added successfully');
          } catch (sourceError) {
            console.error('Error adding source:', sourceError);
            return;
          }
          
          // Add fill layer if enabled
          if (showFill) {
            console.log('Adding fill layer:', fillLayerId);
            const fillLayer = {
              id: fillLayerId,
              type: 'fill' as const,
              source: sourceId,
              layout: {},
              paint: {
                'fill-color': fillColor,
                'fill-opacity': fillOpacity,
                'fill-outline-color': 'transparent'
              }
            };
            
            console.log('Fill layer config:', JSON.stringify(fillLayer, null, 2));
            const fillAdded = safeAddLayer(fillLayer, 'water');
            console.log('Fill layer', fillAdded ? 'added successfully' : 'failed to add');
          }

          // Add outline layer if enabled
          if (showOutline) {
            console.log('Adding outline layer:', outlineLayerId);
            const lineLayer = {
              id: outlineLayerId,
              type: 'line' as const,
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': outlineColor,
                'line-width': outlineWidth,
                'line-dasharray': outlineDashArray,
                'line-opacity': 1
              }
            };
            
            console.log('Outline layer config:', JSON.stringify(lineLayer, null, 2));
            const outlineAdded = safeAddLayer(lineLayer, fillLayerId);
            console.log('Outline layer', outlineAdded ? 'added successfully' : 'failed to add');
          }
          
          // Log final state
          const finalStyle = map.getStyle();
          console.log('Updated sources:', Object.keys(finalStyle.sources));
          console.log('Updated layers:', finalStyle.layers.map(l => l.id));
          
          // Force a repaint to ensure layers are visible
          map.triggerRepaint();
          
        } catch (error) {
          console.error('Error updating map layers:', error);
        }
      };

      // Ensure the map is fully loaded before adding layers
      if (map.loaded()) {
        addLayers();
      } else {
        map.once('load', addLayers);
      }
    };

    // Handle map load event if needed
    const onMapLoad = () => {
      updateLayers();
      map.off('load', onMapLoad);
    };

    if (map.loaded()) {
      updateLayers();
    } else {
      map.on('load', onMapLoad);
    }

    // Cleanup on unmount
    return () => {
      try {
        if (map) {
          map.off('load', onMapLoad);
          cleanup();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [
    map,
    bounds,
    showFill,
    showOutline,
    fillColor,
    fillOpacity,
    outlineColor,
    outlineWidth,
    outlineDashArray,
    id
  ]);

  // This is a non-visual component
  return null;
};

export default MapboxBounds;
