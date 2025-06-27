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
      if (!map) {
        console.log('Map is not available');
        return false;
      }
      
      try {
        // Check if map is valid and has required methods
        if (!map.getSource || typeof map.getSource !== 'function') {
          console.warn('map.getSource is not available or not a function');
          return false;
        }
        
        // Check if the style is loaded
        if (!map.getStyle || typeof map.getStyle !== 'function') {
          console.warn('map.getStyle is not available or not a function');
          return false;
        }
        
        // Check if style object exists and has sources
        const style = map.getStyle();
        if (!style || !style.sources) {
          console.warn('Map style or sources not available');
          return false;
        }
        
        // Try to get the source
        const source = map.getSource(srcId);
        const exists = !!source;
        console.log(`Source ${srcId} ${exists ? 'exists' : 'does not exist'}`);
        return exists;
        
      } catch (error) {
        console.warn(`Error checking source ${srcId}:`, error);
        return false;
      }
    };
    
    // Function to safely remove layers and source
    const cleanup = () => {
      if (!map) {
        console.log('Map not available for cleanup');
        return;
      }
      
      // Check if map is still valid and has required methods
      if (!map.removeLayer || typeof map.removeLayer !== 'function' || 
          !map.removeSource || typeof map.removeSource !== 'function') {
        console.warn('Map methods not available for cleanup');
        return;
      }
      
      // Check if map is still attached to DOM
      try {
        if (!map.getContainer()) {
          console.warn('Map container no longer exists, skipping cleanup');
          return;
        }
      } catch (error) {
        console.warn('Error checking map container, skipping cleanup:', error);
        return;
      }
      
      console.log('Starting cleanup for source:', sourceId);
      
      // Function to safely remove a single layer
      const safeRemoveLayer = (layerId: string) => {
        try {
          if (layerExists(layerId)) {
            map?.removeLayer(layerId);
            console.log('Removed layer:', layerId);
            return true;
          }
          return false;
        } catch (error) {
          console.warn(`Error removing layer ${layerId}:`, error);
          return false;
        }
      };
      
      // Remove layers if they exist
      safeRemoveLayer(fillLayerId);
      safeRemoveLayer(outlineLayerId);
      
      // Remove source if it exists
      try {
        // Double-check map is still valid before removing source
        if (map && map.getStyle && sourceExists(sourceId)) {
          // Try to remove source
          map.removeSource(sourceId);
          console.log('Removed source:', sourceId);
        } else {
          console.log('Source did not exist, nothing to remove:', sourceId);
        }
      } catch (error) {
        console.error('Error removing source:', sourceId, error);
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
      
      // Enhanced map ready check
      const checkMapReady = () => {
        try {
          // Check basic map state
          if (!map || typeof map.loaded !== 'function' || !map.loaded()) {
            console.log('Map not loaded yet');
            return false;
          }
          
          // Check style is loaded
          if (typeof map.isStyleLoaded !== 'function' || !map.isStyleLoaded()) {
            console.log('Map style not loaded yet');
            return false;
          }
          
          // Check style object exists
          if (typeof map.getStyle !== 'function') {
            console.log('getStyle not available');
            return false;
          }
          
          const style = map.getStyle();
          if (!style || !style.sources) {
            console.log('Style or sources not available');
            return false;
          }
          
          console.log('Map is ready with style:', style);
          return true;
          
        } catch (error) {
          console.error('Error checking map ready state:', error);
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
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: bounds
                },
                properties: {}
              }
            });
            console.log('Source added successfully:', sourceId);
            
            // Add fill layer if enabled
            if (showFill) {
              const fillLayer = {
                id: fillLayerId,
                type: 'fill' as const,
                source: sourceId,
                layout: {},
                paint: {
                  'fill-color': fillColor,
                  'fill-opacity': fillOpacity
                }
              };
              
              if (safeAddLayer(fillLayer)) {
                console.log('Fill layer added successfully:', fillLayerId);
              } else {
                console.error('Failed to add fill layer:', fillLayerId);
              }
            }
            
            // Add outline layer if enabled
            if (showOutline) {
              const outlineLayer = {
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
                  'line-dasharray': outlineDashArray
                }
              };
              
              if (safeAddLayer(outlineLayer)) {
                console.log('Outline layer added successfully:', outlineLayerId);
                
                // Force a style update to ensure the layer is rendered
                try {
                  const style = map.getStyle();
                  map.setStyle(style, { diff: false });
                  console.log('Map style refreshed to ensure layer visibility');
                } catch (e) {
                  console.warn('Could not refresh map style:', e);
                }
              } else {
                console.error('Failed to add outline layer:', outlineLayerId);
              }
            }
            
            // Fit map to bounds if they exist
            try {
              if (bounds && bounds[0] && bounds[0].length > 0) {
                const coordinates = bounds[0];
                const lngs = coordinates.map(coord => coord[0]);
                const lats = coordinates.map(coord => coord[1]);
                
                const bounds = [
                  [Math.min(...lngs), Math.min(...lats)], // southwest
                  [Math.max(...lngs), Math.max(...lats)]  // northeast
                ];
                
                map.fitBounds(bounds as [[number, number], [number, number]], {
                  padding: 50,
                  maxZoom: 10,
                  duration: 1000
                });
                console.log('Map fitted to bounds');
              }
            } catch (e) {
              console.warn('Could not fit map to bounds:', e);
            }
            
          } catch (sourceError) {
            console.error('Error adding source or layers:', sourceError);
          }
          
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
