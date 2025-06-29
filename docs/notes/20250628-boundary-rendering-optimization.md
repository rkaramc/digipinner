# PIN Code Boundary Rendering: Current State and Optimization Goals

## Current State Analysis

### Rendering Process

- PIN code boundaries are loaded from a static GeoJSON source in `constants.ts`
- Post office locations are loaded from a static GeoJSON source
- All boundaries and locations are loaded at once regardless of viewport
- No simplification or level-of-detail management for boundaries
- Boundaries and locations are rendered with a single style regardless of zoom level
- No caching mechanism for boundary data

### Performance Metrics (Current)

- Initial load time: Not measured, but potentially slow with large datasets
- Memory usage: All data loaded into memory at once
- Rendering delay: Varies based on number of boundaries and locations
- No progressive loading or viewport filtering

### User Experience Issues

- Potential lag when panning/zooming with many boundaries and locations visible
- No visual feedback when interacting with boundaries
- No way to filter or toggle boundary visibility
- Limited visual distinction between different PIN code areas and post office locations when zoomed out

## Desired State

### Optimized Rendering Process

1. **Level-of-Detail (LOD) Rendering**

   - Simplified geometries at lower zoom levels
   - Detailed geometries only at higher zoom levels
   - Automatic switching based on zoom threshold

2. **Progressive and Viewport-Based Loading**

   - Only load boundaries visible in current viewport
   - Pre-fetch adjacent areas when approaching viewport edges
   - Unload boundaries that are far from viewport

3. **Client-Side Caching**

   - Cache loaded GeoJSON data in memory
   - Implement LRU (Least Recently Used) cache strategy
   - Cache invalidation after certain time period

4. **Visual and Interactive Improvements**
   - Hover effects to highlight boundaries
   - Click interaction to show PIN code details
   - Color coding based on PIN code properties
   - Boundary line thickness adjusted by zoom level
   - PIN code labels at appropriate zoom levels

### Performance Goals

| Metric                     | Current        | Target           | Improvement       |
| -------------------------- | -------------- | ---------------- | ----------------- |
| Initial load time          | Not measured   | < 1 second       | Significant       |
| Boundary rendering delay   | Variable       | < 500ms          | > 50%             |
| Memory usage               | Full dataset   | Viewport + cache | > 70% reduction   |
| Interaction responsiveness | No measurement | < 100ms          | Significant       |
| FPS during pan/zoom        | Not measured   | > 30 FPS         | Smooth experience |

## Implementation Approach

### Phase 1: Analysis and Measurement

- Add performance monitoring to current implementation
- Measure baseline metrics for comparison
- Identify specific bottlenecks in rendering process

### Phase 2: Level-of-Detail Implementation

- Create simplified boundary geometries using Mapbox's `simplify-js` or similar
- Implement zoom-based rendering logic
- Measure performance improvements

### Phase 3: Progressive Loading

- Implement viewport calculation logic
- Add boundary filtering based on viewport
- Implement pre-fetching for adjacent areas
- Measure memory usage improvements

### Phase 4: Caching Implementation

- Design and implement caching mechanism
- Add cache invalidation strategy
- Measure overall performance improvements

### Phase 5: Visual and Interactive Enhancements

- Implement hover and click interactions
- Add color coding and styling improvements
- Implement PIN code labels with collision detection

## Technical Considerations

### GeoJSON Optimization

- Consider using compressed formats like TopoJSON
- Implement server-side simplification for different zoom levels
- Use binary formats for faster parsing

### Mapbox GL Specific Optimizations

- Use vector tiles if possible instead of raw GeoJSON
- Leverage Mapbox's built-in level-of-detail management
- Consider using `map.queryRenderedFeatures()` for interaction

### Memory Management

- Implement proper cleanup of unused boundaries
- Monitor memory usage during development
- Set appropriate cache size limits

## Success Criteria

- Boundary rendering delay < 500ms even for large datasets
- Smooth panning and zooming (> 30 FPS) with boundaries visible
- Memory usage reduced by at least 70% compared to loading full dataset
- Clear visual feedback for user interactions with boundaries

## Implementation Notes

### Parsing the All India Pincode Directory

The All India Pincode Directory is a JSON file that contains information about all the post offices in India. The file is available at the following URL:
https://data.gov.in/catalog/all-india-pincode-directory-through-webservice

The file is a JSON array of objects, each object containing the following properties:

- pincode
- name
- branch_type
- delivery_status
- district
- state
- circle
- region
- division
- block
- taluk
- office_type
- post_office
- longitude
- latitude

Use the following code, to generate a geojson file with information on post offices in the 110001 PIN code.

```powershell
cat data/All_India_pincode_Directory-165636.json | jq '{ 
            "type":"FeatureCollection", 
            "name": "All_India_pincode_Directory-cleaned", 
            "features": [ 
               .records[] | 
               select(.pincode == "110001") | 
               { 
                  "type":"Feature", 
                  "geometry": { 
                     "type":"Point", 
                     "coordinates":[
                        (if .longitude == "NA" then 0 else .longitude end), 
                        (if .latitude == "NA" then 0 else .latitude end) | tonumber
                     ] 
                  }, 
                  "properties": .
               } 
            ]
         }' > src/assets/delhi.json
```

An executable version of the above code, split into multiple steps, is available in the `data/process-post-office-directory.ps1` file.
