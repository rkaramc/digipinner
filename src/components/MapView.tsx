import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl, { Map as MapboxMap, NavigationControl, MapMouseEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import DigipinBounds from './DigipinBounds';
import { 
  MAPBOX_ACCESS_TOKEN, 
  MAP_STYLE, 
  DEFAULT_MAP_CENTER, 
  DEFAULT_ZOOM_LEVEL,
  DIGIPIN_GRID 
} from '../lib/constants';

// Extend the window type to include mapboxgl
declare global {
  interface Window {
    mapboxgl: typeof mapboxgl;
  }
}

// Set the access token at the module level
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Workaround for strict mode in development
if (!window.mapboxgl) {
  window.mapboxgl = mapboxgl;
}

interface MapViewProps {
  onMapReady?: () => void;
  onMapClick?: (e: MapMouseEvent) => void;
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({
  onMapReady,
  onMapClick,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_ZOOM_LEVEL,
  style,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize the map when the component mounts
  useEffect(() => {
    // Skip if container ref is not available or map is already initialized
    if (!mapContainer.current || map.current) {
      return;
    }

    console.log('Initializing map...');
    
    // Store the map instance in a local variable to avoid stale closures
    let mapInstance: MapboxMap | null = null;
    let isMounted = true;
    
    const initializeMap = () => {
      if (!isMounted) return;
      
      try {
        // Create the map instance
        mapInstance = new MapboxMap({
          container: mapContainer.current!,
          style: MAP_STYLE,
          center,
          zoom,
          attributionControl: true,
          transformRequest: (url, resourceType) => {
            // Add cache-busting query parameter to style URL
            // if (resourceType === 'Style' && !url.includes('?')) {
            //   return { url: `${url}?v=${Date.now()}` };
            // }
            return { url };
          },
        });
        
        // Store the map instance in the ref
        map.current = mapInstance;

        // Add navigation control
        mapInstance.addControl(new NavigationControl(), 'top-right');
        
        // Handle map load
        const onMapLoad = () => {
          if (!isMounted || !mapInstance) return;
          
          console.log('Map loaded, setting up bounds');
          
          try {
            console.log('Map style loaded, checking layers:', 
              mapInstance.getStyle().layers.map(l => l.id)
            );
            
            const fitToBounds = () => {
              if (!isMounted || !mapInstance) return;
              
              try {
                console.log('Fitting map to DIGIPIN bounds');
                
                // Get the bounds from DIGIPIN_GRID.BOUNDS
                const { MIN_LON, MAX_LON, MIN_LAT, MAX_LAT } = DIGIPIN_GRID.BOUNDS;
                
                // Create a bounds object
                const bounds = new mapboxgl.LngLatBounds(
                  [MIN_LON, MIN_LAT], // SW
                  [MAX_LON, MAX_LAT]  // NE
                );
                
                // Add some padding
                const padding = {
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10
                };
                
                console.log('Fitting to bounds:', {
                  sw: [MIN_LON, MIN_LAT],
                  ne: [MAX_LON, MAX_LAT],
                  padding
                });
                
                // Fit the map to the bounds with padding
                mapInstance.fitBounds(bounds, {
                  padding,
                  maxZoom: 15,
                  duration: 1000 // Animation duration in ms
                });
                
                console.log('Map fitted to bounds successfully');
                
                // Mark map as loaded
                if (isMounted) {
                  setIsMapLoaded(true);
                  onMapReady?.();
                }
                
              } catch (error) {
                console.error('Error fitting map to bounds:', error);
                if (isMounted) {
                  setIsMapLoaded(true);
                  onMapReady?.();
                }
              }
            };
            
            // If the map is already loaded, fit bounds immediately
            if (mapInstance.loaded() && mapInstance.isStyleLoaded()) {
              fitToBounds();
            } else {
              // Otherwise, wait for the style to load
              mapInstance.once('style.load', fitToBounds);
            }
            
          } catch (error) {
            console.error('Error in map load handler:', error);
            if (isMounted) {
              setIsMapLoaded(true);
              onMapReady?.();
            }
          }
        };
        
        // Set up the load event listener
        mapInstance.once('load', onMapLoad);
        
        // Set up click handler if provided
        if (onMapClick) {
          mapInstance.on('click', onMapClick);
        }
        
        // Set up error handling
        mapInstance.on('error', (e) => {
          console.error('Map error:', e.error);
          if (isMounted) {
            setMapError(e.error?.message || 'Failed to load map');
          }
        });
        
      } catch (error) {
        console.error('Failed to initialize map:', error);
        if (isMounted) {
          setMapError('Failed to initialize map. Please check your connection and try again.');
          setIsMapLoaded(true);
          onMapReady?.();
        }
      }
    };
    
    // Initialize the map in the next tick to avoid React 18 double mount in development
    const timeoutId = setTimeout(initializeMap, 0);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      if (mapInstance) {
        console.log('Cleaning up map instance');
        try {
          if (onMapClick) {
            mapInstance.off('click', onMapClick);
          }
          mapInstance.remove();
        } catch (error) {
          console.error('Error during map cleanup:', error);
        } finally {
          mapInstance = null;
          if (map.current) {
            map.current = null;
          }
        }
      }
    };
  }, [center, zoom, onMapReady, onMapClick]);

  // This effect is no longer needed as we've moved all initialization to the main effect

  // Render loading state or error message
  if (mapError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Map Error</h2>
          <p className="text-gray-700 mb-4">{mapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reload Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className={`w-full h-full ${className}`}
        style={style}
      />
      {isMapLoaded && map.current && (
        <>
          <div className="absolute flex flex-col gap-2 bottom-4 right-4 z-10">
            {/* <div className="bg-white p-2 rounded shadow-md text-xs">
              Map loaded successfully
            </div> */}
            <button 
              onClick={() => {
                if (!map.current) return;
                console.log('=== MAP DEBUG INFO ===');
                console.log('Map style:', map.current.getStyle());
                console.log('Map sources:', Object.keys(map.current.getStyle().sources));
                console.log('Map layers:', map.current.getStyle().layers.map(l => l.id));
                console.log('Map bounds:', map.current.getBounds().toArray());
                console.log('Map zoom:', map.current.getZoom());
                console.log('Map center:', map.current.getCenter());
                console.log('========================');
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
            >
              Debug Map
            </button>
          </div>
          <DigipinBounds 
            // key={`digipin-bounds-${Date.now()}`} // Force re-render with new key
            key={`digipin-bounds`} // Force re-render with new key
            map={map.current} 
            showFill={true}
            showOutline={true}
            fillColor="rgba(0, 0, 255, 0.3)" // More visible blue fill
            outlineColor="#ff0000"
            outlineWidth={1}
          />
        </>
      )}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
