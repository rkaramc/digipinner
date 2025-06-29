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
import ErrorBoundary from "@/utils/ErrorBoundary";
import MarkerPositionDisplay from "./MarkerPositionDisplay";

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
}

const MapView: React.FC<MapViewProps> = ({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_ZOOM_LEVEL,
  style,
  className = "",
  enableMarkerPlacement = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{
    lng: number;
    lat: number;
  } | null>(null);

  const currentMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    let isMounted = true;

    const initializeMap = () => {
      if (!isMounted || !mapContainer.current) return;

      try {
        console.log("MapView: Initializing map with style:", MAP_STYLE);

        // Check if MAPBOX_ACCESS_TOKEN is set
        if (!mapboxgl.accessToken) {
          console.error("MapView: Mapbox access token is not set!");
          setMapError(
            "Mapbox access token is missing. Please check your configuration."
          );
          return;
        }

        const mapInstance = new MapboxMap({
          container: mapContainer.current,
          style: MAP_STYLE,
          center,
          zoom,
          attributionControl: true,
        });

        map.current = mapInstance;

        mapInstance.addControl(new NavigationControl(), "top-right");

        // Listen for style.load event to ensure style is fully loaded
        mapInstance.on("style.load", () => {
          if (!isMounted || map.current !== mapInstance) return;
          console.log("MapView: Map style loaded", mapInstance.getStyle());
        });

        mapInstance.on("load", () => {
          // In strict mode, the component can be mounted, unmounted, and remounted.
          // We need to ensure that this 'load' event is for the current map instance.
          if (!isMounted || map.current !== mapInstance) return;

          console.log("MapView: Map load event fired");
          currentMarkerRef.current?.addTo(mapInstance);

          // Add a small delay to ensure the map is fully initialized
          setTimeout(() => {
            if (isMounted && map.current === mapInstance) {
              console.log("MapView: Setting map as loaded after delay");
              setIsMapLoaded(true);
              setMapReady(true);
            }
          }, 0);
        });

        mapInstance.on("click", (e: MapMouseEvent) => {
          console.log("MapView: Map click event fired", e);
          if (enableMarkerPlacement) {
            const { lng, lat } = e.lngLat;

            if (currentMarkerRef.current) {
              currentMarkerRef.current.remove();
            }

            const newMarker = new Marker({ color: "#FF0000" })
              .setLngLat([lng, lat])
              .addTo(mapInstance);

            currentMarkerRef.current = newMarker;

            setMarkerPosition({ lng, lat });
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

    const timerId = setTimeout(initializeMap, 0);

    return () => {
      console.log("MapView: Unmounting map");
      isMounted = false;
      clearTimeout(timerId);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [
    center,
    zoom,
    enableMarkerPlacement,
  ]);

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
            onError={(error) => console.error("PIN code layer error:", error)}
          />
        </ErrorBoundary>
      )}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      {markerPosition && (
        <MarkerPositionDisplay position={markerPosition} />
      )}{" "}
    </div>
  );
};

export default MapView;
