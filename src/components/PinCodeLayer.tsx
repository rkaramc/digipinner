import { useEffect, useState } from "react";
import { Map, Popup } from "mapbox-gl";
import POST_OFFICE_DATA from "../assets/delhi.json";
import PIN_CODE_DATA from "../assets/p1.json";
import { DIGIPIN_GRID } from "../lib/constants";

interface PinCodeLayerProps {
  map: Map | null;
  visible?: boolean;
  fillColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
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
  onLayerLoaded,
  onError,
  autoZoom = true, // Default to true for debugging
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Track if the layer has been initialized to prevent duplicate setup
  const [isInitialized, setIsInitialized] = useState(false);

  const sourceId = "pincode-source";
  const fillLayerId = "pincode-fill-layer";
  const outlineLayerId = "pincode-outline-layer";
  const labelLayerId = "pincode-label-layer";

  const zoomToPinCodeArea = () => {
    if (!map || !autoZoom) return;

    console.log("PinCodeLayer: Zooming to Delhi PIN code area...");
    const delhiBounds: [[number, number], [number, number]] = [
      [77.15, 28.55], // Southwest
      [77.35, 28.7], // Northeast
    ];

    map.fitBounds(delhiBounds, { padding: 50, duration: 1500 });
  };

  // Effect for creating and cleaning up the layer source and layers
  useEffect(() => {
    if (!map) {
      return;
    }

    const setupLayer = () => {
      // If already initialized, don't set up again
      if (isInitialized) {
        console.log("PinCodeLayer: Layer already initialized, skipping setup");
        return;
      }

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
        if (typeof map.getSource !== "function") {
          console.error("PinCodeLayer: Map.getSource is not a function");
          return;
        }

        try {
          // Safe cleanup of existing layers and sources
          const cleanupLayer = (layerId: string) => {
            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
          };

          // Clean up all related layers first
          cleanupLayer(fillLayerId);
          cleanupLayer(outlineLayerId);
          cleanupLayer(labelLayerId);

          // Then remove the source if it exists
          if (map.getSource(sourceId)) {
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

          // Add a symbol layer for pincode prefix labels
          map.addLayer({
            id: labelLayerId,
            type: "symbol",
            source: sourceId,
            layout: {
              "text-field": ["get", "PincodePrefix"],
              "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
              "text-size": 14,
              "text-allow-overlap": false,
              "text-ignore-placement": false,
              "text-anchor": "center",
              "text-justify": "center",
            },
            paint: {
              "text-color": "#000000",
              "text-halo-color": "#ffffff",
              "text-halo-width": 2,
            },
          });
        } catch (error) {
          console.error("PinCodeLayer: Error adding source or layers:", error);
          setError(error as Error);
          onError?.(error as Error);
        }
      };

      const addPostOfficesToMap = (data: GeoJSON.FeatureCollection) => {
        console.log("PinCodeLayer: Adding post offices to map", data);

        try {
          const postOfficeSourceId = "postoffice-source";
          const postOfficeMarkersId = "postoffice-markers";
          const postOfficeLabelsId = "postoffice-labels";

          // Safe cleanup function for layers
          const cleanupLayer = (layerId: string) => {
            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
          };

          // Remove existing layers if they exist
          cleanupLayer(postOfficeMarkersId);
          cleanupLayer(postOfficeLabelsId);

          // Remove existing source if it exists
          if (map.getSource(postOfficeSourceId)) {
            map.removeSource(postOfficeSourceId);
          }

          // Add the GeoJSON source
          map.addSource(postOfficeSourceId, { type: "geojson", data });
        } catch (error) {
          console.error(
            "PinCodeLayer: Error removing or adding source/layers:",
            error
          );
          return; // Exit the function if there's an error
        }

        // Add a circle layer to display markers for each post office
        map.addLayer({
          id: "postoffice-markers",
          type: "circle",
          source: "postoffice-source",
          minzoom: 8,
          paint: {
            "circle-radius": 3,
            "circle-color": "#FF0000",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#FFFFFF",
          },
        });

        // Add a symbol layer for text labels with improved visibility and consistency
        // Since we're now filtering for GPO offices in the data pipeline, we don't need the delivery filter
        map.addLayer({
          id: "postoffice-labels",
          type: "symbol",
          source: "postoffice-source",
          minzoom: 12, // Only show labels when zoom level is greater than 10
          layout: {
            "text-field": ["get", "officename"], // Display office name as label
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [0, 0.5],
            "text-anchor": "top",
            "text-size": 8,
            // Improve label visibility
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-max-width": 12,
            "text-letter-spacing": 0.05,
            "text-padding": 2,
          },
          paint: {
            "text-color": "#333",
            "text-halo-color": "#fff",
            "text-halo-width": 2, // Increased halo width for better readability
            "text-opacity": 1,
          },
        });

        const popup = new Popup({
          closeButton: false,
          closeOnClick: false,
        });

        // Add click event to show post office details
        map.on("mouseenter", "postoffice-markers", (e) => {
          map.getCanvas().style.cursor = "pointer";
          if (e.features && e.features[0]) {
            // Type assertion for Point geometry
            const feature = e.features[0];

            try {
              const geometry = feature.geometry as GeoJSON.Point;
              const coordinates = geometry.coordinates.slice() as [
                number,
                number
              ];
              const properties = feature.properties;

              if (properties) {
                // Create popup content with compact styling
                const popupContent = `
                  <div style="color: #333; font-family: Arial, sans-serif; padding: 1px; line-height: 1.1;">
                    <h3 style="color: #1a1a1a; margin: 0 0 2px 0; font-size: 11px; font-weight: bold;">${
                      properties.officename || "Post Office"
                    }</h3>
                    <p style="color: #333; margin: 1px 0; font-size: 9px;">Pincode: <strong>${
                      properties.pincode || "N/A"
                    }</strong></p>
                    <p style="color: #333; margin: 1px 0; font-size: 9px;">Type: ${
                      properties.officetype || "N/A"
                    }</p>
                    <p style="color: #333; margin: 1px 0; font-size: 9px;">Division: ${
                      properties.divisionname || "N/A"
                    }</p>
                  </div>
                `;

                console.log("Creating popup with content:", popupContent);

                // Create popup at the clicked location
                popup.setLngLat(coordinates).setHTML(popupContent).addTo(map);
              }
            } catch (error) {
              console.error("Error creating popup:", error);
            }
          }
        });

        map.on("mouseleave", "postoffice-markers", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      };

      // const addDIGIPINBoundsToMap = (level: number, location: [number, number]) => {
      //   // Use DIGIPIN_GRID.BOUNDS to access the DIGIPIN_BOUNDS object
      //   const bounds = DIGIPIN_GRID.BOUNDS.toBounds();
      //   map.fitBounds(bounds, { padding: 50, duration: 1500 });

      //   console.log("DIGIPIN bounds applied at level:", level, "for location:", location);
      // };

      try {
        addDataToMap(PIN_CODE_DATA as GeoJSON.FeatureCollection);
        addPostOfficesToMap(POST_OFFICE_DATA as GeoJSON.FeatureCollection);
        // addDIGIPINBoundsToMap(1, [0, 0])
        
        // Only mark as loaded if we can verify the layers exist
        if (map.getLayer(fillLayerId) && map.getLayer(outlineLayerId)) {
          setIsLoaded(true);
          setIsInitialized(true);
          console.log("PinCodeLayer: Source and layers added successfully.");
          onLayerLoaded?.();
        } else {
          throw new Error("Layers were not created successfully");
        }
      } catch (error) {
        console.error("PinCodeLayer: Failed to add layers:", error);
        setError(error as Error);
        onError?.(error as Error);
      }
    };

    try {
      // Check if map exists and has getStyle method
      if (map && typeof map.getStyle === "function") {
        const style = map.getStyle();
        console.log("PinCodeLayer: Map style loaded is", style);

        if (style !== undefined) {
          console.log("PinCodeLayer: Map style is loaded, setting up layer");
          setupLayer();
        } else {
          console.log(
            "PinCodeLayer: Map style is not loaded, waiting for load event"
          );
          map.on("load", setupLayer);
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
      map.off("load", setupLayer);
      if (map && map.getStyle() !== undefined) {
        try {
          // Clean up function for layers
          const cleanupLayer = (layerId: string) => {
            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
          };

          // Clean up all layers
          cleanupLayer(fillLayerId);
          cleanupLayer(outlineLayerId);
          cleanupLayer(labelLayerId);
          cleanupLayer("postoffice-markers");
          cleanupLayer("postoffice-labels");

          // Clean up sources
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }

          if (map.getSource("postoffice-source")) {
            map.removeSource("postoffice-source");
          }

          // Reset initialization state
          setIsInitialized(false);
        } catch (error) {
          console.warn(
            "PinCodeLayer: Error during cleanup, map may already be removed.",
            error
          );
        }
      }
    };
  }, [map, autoZoom, fillColor, outlineColor, outlineWidth, isInitialized]);

  // Effect for updating visibility
  useEffect(() => {
    if (!map || !isLoaded) return;

    try {
      // Check if layers exist before updating properties
      if (map.getLayer(fillLayerId) && map.getLayer(outlineLayerId)) {
        const visibility = visible ? "visible" : "none";
        console.log(`PinCodeLayer: Updating visibility to '${visibility}'.`);
        map.setLayoutProperty(fillLayerId, "visibility", visibility);
        map.setLayoutProperty(outlineLayerId, "visibility", visibility);
      } else {
        console.warn("PinCodeLayer: Cannot update visibility - layers don't exist");
      }
    } catch (error) {
      console.error("PinCodeLayer: Error updating visibility:", error);
    }
  }, [visible, isLoaded, map, fillLayerId, outlineLayerId]);

  // Effect for updating paint properties
  useEffect(() => {
    if (!map || !isLoaded) return;

    try {
      // Check if layers exist before updating properties
      if (map.getLayer(fillLayerId) && map.getLayer(outlineLayerId)) {
        console.log("PinCodeLayer: Updating paint properties.");
        map.setPaintProperty(fillLayerId, "fill-color", fillColor);
        map.setPaintProperty(fillLayerId, "fill-opacity", 0.8);
        map.setPaintProperty(outlineLayerId, "line-color", outlineColor);
        map.setPaintProperty(
          outlineLayerId,
          "line-width",
          Math.max(outlineWidth, 2)
        );
      } else {
        console.warn("PinCodeLayer: Cannot update paint properties - layers don't exist");
      }
    } catch (error) {
      console.error("PinCodeLayer: Error updating paint properties:", error);
    }
  }, [fillColor, outlineColor, outlineWidth, isLoaded, map, fillLayerId, outlineLayerId]);

  return null;
};

export default PinCodeLayer;
