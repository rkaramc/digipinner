import React, { useEffect, useRef, useState } from "react";
import mapboxgl, {
  Map as MapboxMap,
  NavigationControl,
  MapMouseEvent,
  Marker,
} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import PinCodeLayer from "./PinCodeLayer";
import {
  MAPBOX_ACCESS_TOKEN,
  MAP_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM_LEVEL,
} from "../lib/constants";
import ErrorBoundary from "../utils/ErrorBoundary";
import MarkerPositionDisplay from "./MarkerPositionDisplay";
import Sidebar from "./Sidebar";
import {
  convertDIGIPINToBounds,
  convertGeoLocationToDIGIPIN,
} from "@/utils/geoUtils";

declare global {
  interface Window {
    mapboxgl: typeof mapboxgl;
  }
}

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

if (!window.mapboxgl) {
  window.mapboxgl = mapboxgl;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  className?: string;
  enableMarkerPlacement?: boolean;
  onMarkerPlaced?: (position: { lng: number; lat: number } | null) => void;
  onZoomChange?: (zoom: number) => void;
  initialMarkerPosition?: { lng: number; lat: number } | null;
}

const MapView: React.FC<MapViewProps> = ({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_ZOOM_LEVEL,
  style,
  className = "",
  enableMarkerPlacement = false,
  onMarkerPlaced,
  onZoomChange,
  initialMarkerPosition = {
    lng: DEFAULT_MAP_CENTER[0],
    lat: DEFAULT_MAP_CENTER[1],
  },
}) => {
  const [markerPosition, setMarkerPosition] = useState<{
    lng: number;
    lat: number;
  } | null>(initialMarkerPosition);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const currentMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    let isMounted = false;

    const initializeMap = () => {
      if (!isMounted || !mapContainer.current) return;
      console.log("MapView: Initializing map");

      try {
        // Check if MAPBOX_ACCESS_TOKEN is set
        if (!mapboxgl.accessToken) {
          console.error("MapView: Mapbox access token is not set!");
          setMapError(
            "Mapbox access token is missing. Please check your configuration."
          );
          return;
        }

        console.log("MapView: Initializing map with style:", MAP_STYLE);

        const mapInstance = new MapboxMap({
          container: mapContainer.current,
          style: MAP_STYLE,
          center,
          zoom,
          attributionControl: true,
        });

        map.current = mapInstance;

        mapInstance.addControl(new NavigationControl(), "top-right");

        mapInstance.on("load", () => {
          // In strict mode, the component can be mounted, unmounted, and remounted.
          // We need to ensure that this 'load' event is for the current map instance.
          if (!isMounted || map.current !== mapInstance) return;

          console.log("MapView: Map load event fired");

          // Add initial marker if provided
          if (initialMarkerPosition) {
            console.log("MapView: Adding initial marker");
            const { lng, lat } = initialMarkerPosition;
            const newMarker = new Marker({ color: "#FF0000" })
              .setLngLat([lng, lat])
              .addTo(mapInstance);

            setupMarkerEvents(newMarker, mapInstance);
            currentMarkerRef.current = newMarker;
            setMarkerPosition({ lng, lat });
          } else {
            console.log("MapView: No initial marker provided");
            currentMarkerRef.current?.addTo(mapInstance);
          }

          // Set initial zoom level
          setCurrentZoom(mapInstance.getZoom());

          // Add a small delay to ensure the map is fully initialized
          setTimeout(() => {
            if (isMounted && map.current === mapInstance) {
              console.log("MapView: Setting map as loaded after delay");
              setIsMapLoaded(true);
            }
          }, 0);
          isMounted = true;
          console.log("MapView: Component mounted");
        });

        // Update zoom level when it changes
        mapInstance.on("zoom", () => {
          if (isMounted && map.current === mapInstance) {
            const newZoom = mapInstance.getZoom();
            setCurrentZoom(newZoom);
            // Notify parent component about zoom change
            if (onZoomChange) {
              onZoomChange(newZoom);
            }
          }
        });

        mapInstance.on("click", (e: MapMouseEvent) => {
          console.log("MapView: Map click event fired", e);
          if (enableMarkerPlacement) {
            const { lng, lat } = e.lngLat;

            if (currentMarkerRef.current) {
              currentMarkerRef.current.remove();
            }

            console.log("MapView: Adding new marker at", lng, lat);
            const newMarker = new Marker({ color: "#FF0000" })
              .setLngLat([lng, lat])
              .addTo(mapInstance);

            setupMarkerEvents(newMarker, mapInstance);
            currentMarkerRef.current = newMarker;

            const newPosition = { lng, lat };
            setMarkerPosition(newPosition);
            animateDIGIPINGrid(newPosition);

            // Notify parent component about marker placement
            if (onMarkerPlaced) {
              onMarkerPlaced(newPosition);
            }
          }
          console.log("MapView: Map click event done!");
        });

        mapInstance.on("error", (e) => {
          if (!isMounted) return;
          setMapError(e.error?.message || "Failed to load map");
        });
      } catch (error) {
        if (!isMounted) return;
        setMapError(
          "Failed to initialize map. Please check your connection and try again."
        );
      }
    };

    // const timerId = setTimeout(initializeMap, 0);
    // console.log("MapView: Timer set");
    isMounted = true;
    initializeMap();

    return () => {
      // if (!isMounted) return;
      // console.log("MapView: Unmounting map");
      // isMounted = false;
      // // clearTimeout(timerId);
      // if (map.current) {
      //   map.current.remove();
      //   map.current = null;
      // }
    };
  }, [
    center,
    zoom,
    enableMarkerPlacement,
    initialMarkerPosition,
    onMarkerPlaced,
    onZoomChange,
  ]);

  const animateDIGIPINGrid = (position: { lng: number; lat: number }) => {
    console.log("animateDIGIPINGrid", position);

    const digipin = convertGeoLocationToDIGIPIN(position.lat, position.lng, "");
    if (!digipin) return;
    console.log("digipin", digipin);

    const mapInstance = map.current;
    if (!mapInstance) return;
    console.log("mapInstance", mapInstance);

    if (window.digipinAnimationTimeout) {
      clearTimeout(window.digipinAnimationTimeout);
    }

    const bounds = convertDIGIPINToBounds(digipin);
    if (!bounds) return;
    console.log("bounds", bounds);

    const processBounds = (index: number) => {
      if (index >= bounds.length) return;

      const {
        minLng: prevMinLng,
        maxLng: prevMaxLng,
        minLat: prevMinLat,
        maxLat: prevMaxLat,
      } = bounds[index - 1];
      const { minLng, maxLng, minLat, maxLat } = bounds[index];

      // create a polygon for the current cell
      const cellBounds = [
        [minLng, minLat],
        [minLng, maxLat],
        [maxLng, maxLat],
        [maxLng, minLat],
        [minLng, minLat], // close the polygon
      ];

      const sourceId = `digipin-cell-${index}`;
      const layerId = `digipin-cell-layer-${index}`;
      const symbolSourceId = `digipin-symbol-${index}`;
      const symbolLayerId = `digipin-symbol-layer-${index}`;

      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
        mapInstance.removeLayer(`${layerId}-outline`);
      }
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }
      if (mapInstance.getLayer(symbolLayerId)) {
        mapInstance.removeLayer(symbolLayerId);
      }
      if (mapInstance.getSource(symbolSourceId)) {
        mapInstance.removeSource(symbolSourceId);
      }

      // if (mapInstance.getSource(`${sourceId}-previous`)) {
      //   mapInstance.removeSource(`${sourceId}-previous`);
      // }

      // mapInstance.addSource(`${sourceId}-previous`, {
      //   type: "geojson",
      //   data: {
      //     type: "Feature",
      //     geometry: {
      //       type: "Polygon",
      //       coordinates: [[
      //         [prevMinLng, prevMinLat],
      //         [prevMinLng, prevMaxLat],
      //         [prevMaxLng, prevMaxLat],
      //         [prevMaxLng, prevMinLat],
      //         [prevMinLng, prevMinLat]
      //       ]],
      //     },
      //     properties: {
      //       name: `digipin-cell-${index}`,
      //     },
      //   },
      // });

      mapInstance.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [cellBounds],
          },
          properties: {
            name: `digipin-cell-${index}`,
          },
        },
      });

      mapInstance.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#FF0000",
          "fill-opacity": 0.1,
        },
      });

      mapInstance.addLayer({
        id: `${layerId}-outline`,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#FF0000",
          "line-width": 1,
        },
      });

      // add digipin symbol to map
      const digipinChar = digipin[index - 1];
      const centerLng = (minLng + maxLng) / 2;
      const centerLat = (minLat + maxLat) / 2;
      mapInstance.addSource(symbolSourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [centerLng, centerLat],
          },
          properties: {
            title: digipinChar,
          },
        },
      });

      mapInstance.addLayer({
        id: symbolLayerId,
        type: "symbol",
        source: symbolSourceId,
        layout: {
          "text-field": digipinChar,
          "text-size": 20,
          "text-anchor": "center",
          "text-justify": "center",
        },
      });

      // zoom in to the current cell
      if (index < 6) {
        mapInstance.fitBounds(
          [
            [prevMinLng, prevMinLat],
            [prevMaxLng, prevMaxLat],
          ],
          {
            padding: 20,
            offset: [0, 0],
          }
        );
      }

      window.digipinAnimationTimeout = setTimeout(() => {
        setTimeout(() => {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.removeLayer(layerId);
            mapInstance.removeLayer(`${layerId}-outline`);
          }
          if (mapInstance.getSource(sourceId)) {
            mapInstance.removeSource(sourceId);
          }
          if (mapInstance.getLayer(symbolLayerId)) {
            mapInstance.removeLayer(symbolLayerId);
          }
          if (mapInstance.getSource(symbolSourceId)) {
            mapInstance.removeSource(symbolSourceId);
          }
        }, 2000);

        processBounds(index + 1);
      }, 2000);
    };

    processBounds(1);
  };

  // Helper function to set up marker events
  const setupMarkerEvents = (marker: Marker, mapInstance: MapboxMap) => {
    // Add click event to remove marker when clicked
    const markerElement = marker.getElement();
    markerElement.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent map click event from firing
      marker.remove();
      currentMarkerRef.current = null;
      setMarkerPosition(null);

      // Notify parent component about marker removal
      if (onMarkerPlaced) {
        onMarkerPlaced(null);
      }
    });

    // Add hover events to change cursor to X when hovering
    markerElement.addEventListener("mouseenter", () => {
      // Create a custom X cursor
      const cursorUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath stroke='%23000' stroke-width='2' d='M6 6L18 18M6 18L18 6'/%3E%3C/svg%3E") 12 12, auto`;
      markerElement.style.cursor = cursorUrl;
    });

    markerElement.addEventListener("mouseleave", () => {
      markerElement.style.cursor = "";
    });
  };

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
    <div className="flex flex-col md:flex-row max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Sidebar */}
      <div className="w-full md:w-64 mb-6 md:mb-0 md:mr-6">
        <Sidebar
          digipin={convertGeoLocationToDIGIPIN(
            markerPosition?.lat || 0,
            markerPosition?.lng || 0
          )}
          longitude={markerPosition?.lng?.toFixed(6).toString() || ""}
          latitude={markerPosition?.lat?.toFixed(6).toString() || ""}
          zoomLevel={currentZoom?.toFixed(3).toString()}
        />
      </div>
      <div className="flex-1">
        <div className="border border-gray-300 rounded-lg h-[600px] overflow-hidden">
          <div className="relative w-full h-full">
            <div
              ref={mapContainer}
              className={`w-full h-full ${className}`}
              style={style}
            />
            {/* {isMapLoaded && map.current && (
              <ErrorBoundary fallback={<h1>Something went wrong.</h1>}>
                <PinCodeLayer
                  map={map.current}
                  visible={true}
                  fillColor="rgba(0, 100, 255, 0.1)"
                  outlineColor="#0064ff"
                  outlineWidth={1}
                  autoZoom={true}
                  onLayerLoaded={() =>
                    console.log("PinCodeLayer loaded successfully")
                  }
                  onError={(error) =>
                    console.error("PIN code layer error:", error)
                  }
                />
              </ErrorBoundary>
            )} */}
            {!isMapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading map...</p>
                </div>
              </div>
            )}{" "}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
