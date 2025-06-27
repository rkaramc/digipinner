import { useEffect, useState } from "react";
import { Map } from "mapbox-gl";

interface PinCodeLayerProps {
  map: Map | null;
  visible?: boolean;
  fillColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  pinCodeData?: GeoJSON.FeatureCollection;
  useDirectData?: boolean;
  geojsonPath?: string;
  onLayerLoaded?: () => void;
  onError?: (error: Error) => void;
  autoZoom?: boolean; // Add a prop to control auto-zoom
}

const PinCodeLayer: React.FC<PinCodeLayerProps> = ({
  map,
  visible = true,
  fillColor = "#007cff",
  outlineColor = "#0056b3",
  outlineWidth = 1.5,
  pinCodeData,
  useDirectData = false,
  geojsonPath = "/data/delhi-pincodes.geojson",
  onLayerLoaded,
  onError,
  autoZoom = true, // Default to true for debugging
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sourceId = "pincode-source";
  const fillLayerId = "pincode-fill-layer";
  const outlineLayerId = "pincode-outline-layer";

  const zoomToPinCodeArea = () => {
    if (!map || !autoZoom) return;
    
    console.log("PinCodeLayer: Zooming to Delhi PIN code area...");
    const delhiBounds: [[number, number], [number, number]] = [
      [77.15, 28.55], // Southwest
      [77.35, 28.70]  // Northeast
    ];
    
    map.fitBounds(delhiBounds, { padding: 50, duration: 1500 });
  };

  // Effect for creating and cleaning up the layer source and layers
  useEffect(() => {
    if (!map) {
      return;
    }

    const setupLayer = () => {
      const addDataToMap = (data: GeoJSON.FeatureCollection) => {
        console.log("PinCodeLayer: Adding data to map", data);

        // Multiple defensive checks to ensure map is ready
        try {
          if (!map) {
            console.error("PinCodeLayer: Map instance is null or undefined");
            return;
          }
        } catch (error) {
          console.error("PinCodeLayer: Error validating map instance", error);
        }
        
        try {
          if (map.getStyle() === undefined) {
            console.error("PinCodeLayer: Map style is not loaded yet");
            return;
          }
        } catch (error) {
          console.error("PinCodeLayer: Error checking map style", error);
        }

        // Check if map has getSource method
        if (typeof map.getSource !== 'function') {
          console.error("PinCodeLayer: Map.getSource is not a function");
          return;
        }
        
        try {
          // Safe cleanup of existing layers
          if (map.getSource(sourceId)) {
            if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
            if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
            map.removeSource(sourceId);
          }

          map.addSource(sourceId, { type: "geojson", data });
          map.addLayer({
            id: fillLayerId,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": fillColor, "fill-opacity": 0.3 },
          });
          map.addLayer({
            id: outlineLayerId,
            type: "line",
            source: sourceId,
            paint: { "line-color": outlineColor, "line-width": outlineWidth },
          });

          setIsLoaded(true);
          console.log("PinCodeLayer: Source and layers added successfully.");
          onLayerLoaded?.();

          if (autoZoom) {
            zoomToPinCodeArea();
          }
        } catch (error) {
          console.error("PinCodeLayer: Error adding source or layers:", error);
          setError(error as Error);
          onError?.(error as Error);
        }
      };

      if (useDirectData && pinCodeData) {
        addDataToMap(pinCodeData);
      } else if (geojsonPath) {
        fetch(geojsonPath)
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
          })
          .then((data) => addDataToMap(data))
          .catch((err) => {
            console.error("PinCodeLayer: Failed to fetch or process GeoJSON.", err);
            setError(err);
            onError?.(err);
          });
      }
    };

    try {
      // Check if map exists and has getStyle method
      if (map && typeof map.getStyle === 'function') {
        const style = map.getStyle();
        console.log("PinCodeLayer: Map style loaded is", style);
        
        if (style !== undefined) {
          console.log("PinCodeLayer: Map style is loaded, setting up layer");
          setupLayer();
        } else {
          console.log("PinCodeLayer: Map style is not loaded, waiting for load event");
          map.on('load', setupLayer);
        }
      } else {
        console.error("PinCodeLayer: Map is not properly initialized");
      }
    } catch (error) {
      console.error("PinCodeLayer: Error setting up layer.", error);
      setError(error as Error);
      onError?.(error as Error);
    }

    return () => {
      map.off('load', setupLayer);
      if (map && map.getStyle() !== undefined) {
        try {
          if (map.getSource(sourceId)) {
            if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
            if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
            map.removeSource(sourceId);
          }
        } catch (error) {
          console.warn("PinCodeLayer: Error during cleanup, map may already be removed.", error);
        }
      }
    };
  }, [map, pinCodeData, useDirectData, geojsonPath, autoZoom, fillColor, outlineColor, outlineWidth]);

  // Effect for updating visibility
  useEffect(() => {
    if (!map || !isLoaded) return;
    
    const visibility = visible ? "visible" : "none";
    console.log(`PinCodeLayer: Updating visibility to '${visibility}'.`);
    map.setLayoutProperty(fillLayerId, "visibility", visibility);
    map.setLayoutProperty(outlineLayerId, "visibility", visibility);
  }, [visible, isLoaded, map]);

  // Effect for updating paint properties
  useEffect(() => {
    if (!map || !isLoaded) return;
    
    console.log("PinCodeLayer: Updating paint properties.");
    map.setPaintProperty(fillLayerId, "fill-color", fillColor);
    map.setPaintProperty(fillLayerId, "fill-opacity", 0.8);
    map.setPaintProperty(outlineLayerId, "line-color", outlineColor);
    map.setPaintProperty(outlineLayerId, "line-width", Math.max(outlineWidth, 2));
  }, [fillColor, outlineColor, outlineWidth, isLoaded, map]);

  return null;
};

export default PinCodeLayer;
