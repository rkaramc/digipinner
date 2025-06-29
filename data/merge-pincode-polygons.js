#!/usr/bin/env node

/**
 * Merge Pincode Polygons
 * 
 * This script merges multiple pincode polygon geometries into a single polygon
 * with only exterior edges and no duplicate points. Polygons are grouped by
 * pincode prefix level before merging.
 * 
 * Usage:
 *   node merge-pincode-polygons.js [level] [input-file] [output-file]
 * 
 * Arguments:
 *   level: The pincode level to combine (1, 2, 3, etc. for first n digits)
 *   input-file: Path to the input GeoJSON file with polygon features
 *   output-file: Path to write the merged GeoJSON output
 * 
 * Example:
 *   node merge-pincode-polygons.js 2 ./data/temp/p1.json ./data/temp/merged_pincodes.json
 */

import { readFileSync, writeFileSync } from 'fs';
import * as turf from '@turf/turf';
import cliProgress from 'cli-progress';

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node merge-pincode-polygons.js [level] [input-file] [output-file]');
  process.exit(1);
}

const level = args[0];
const inputFile = args[1];
const outputFile = args[2];

// Validate level parameter
if (!level.match(/^[1-6]$/)) {
  console.error('Level must be between 1 and 6');
  process.exit(1);
}

// Extract the digit position from the level parameter
const digitPosition = parseInt(level);

console.log(`Combining pincode boundaries at ${digitPosition}-digit level`);
console.log(`Reading from: ${inputFile}`);
console.log(`Writing to: ${outputFile}`);

try {
  // Read the input GeoJSON file
  const data = readFileSync(inputFile, 'utf8');
  const geojson = JSON.parse(data);
  
  // Validate input is a GeoJSON FeatureCollection
  if (geojson.type !== 'FeatureCollection') {
    console.error('Input must be a GeoJSON FeatureCollection');
    process.exit(1);
  }
  
  console.log(`Found ${geojson.features.length} features in the input file`);
  
  // Extract all polygon features
  const polygonFeatures = geojson.features.filter(feature => 
    feature.geometry && 
    (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
  );
  
  console.log(`Found ${polygonFeatures.length} polygon/multipolygon features`);
  
  if (polygonFeatures.length === 0) {
    console.error('No polygon features found in the input file');
    process.exit(1);
  }
  
  // Group features by their pincode prefix
  const featureGroups = {};
  
  polygonFeatures.forEach(feature => {
    // Extract the pincode and get the prefix based on the digit position
    const pincode = feature.properties.Pincode;
    if (!pincode) {
      console.warn('Feature missing Pincode property, skipping');
      return;
    }
    
    const prefix = pincode.substring(0, digitPosition);
    
    // Initialize the group if it doesn't exist
    if (!featureGroups[prefix]) {
      featureGroups[prefix] = [];
    }
    
    // Add the feature to its group
    featureGroups[prefix].push(feature);
  });
  
  console.log(`Found ${Object.keys(featureGroups).length} unique ${digitPosition}-digit prefixes`);
  
  // Create array to hold the merged features for each prefix
  const mergedFeatures = [];
  
  // Create a progress bar for processing prefixes
  const prefixBar = new cliProgress.SingleBar({
    format: 'Processing prefixes |{bar}| {percentage}% | {value}/{total} prefixes',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  
  const prefixes = Object.keys(featureGroups);
  prefixBar.start(prefixes.length, 0);
  
  // Process each prefix group
  for (let prefixIndex = 0; prefixIndex < prefixes.length; prefixIndex++) {
    const prefix = prefixes[prefixIndex];
    const features = featureGroups[prefix];
    console.log(`\nProcessing ${features.length} features for prefix ${prefix}`);
    
    // Convert all features in this group to polygons
    let groupPolygons = [];
    
    features.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        // Create a polygon feature
        groupPolygons.push(turf.polygon(feature.geometry.coordinates));
      } else if (feature.geometry.type === 'MultiPolygon') {
        // Create individual polygon features for each polygon in the multipolygon
        feature.geometry.coordinates.forEach(polygonCoords => {
          groupPolygons.push(turf.polygon(polygonCoords));
        });
      }
    });
    
    console.log(`  - Converted to ${groupPolygons.length} individual polygons for prefix ${prefix}`);
    
    if (groupPolygons.length === 0) {
      console.warn(`No valid polygons found for prefix ${prefix}, skipping`);
      continue;
    }
    
    // Perform the union operation to merge all polygons in this group
    let mergedPolygon = groupPolygons[0]; // Start with the first polygon
    
    // Merge each polygon one by one using a progress bar
    if (groupPolygons.length > 1) {
      // Create a new progress bar for this prefix
      const progressBar = new cliProgress.SingleBar({
        format: `Merging polygons for prefix ${prefix} |{bar}| {percentage}% | {value}/{total}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      }, cliProgress.Presets.shades_classic);
      
      // Start the progress bar
      progressBar.start(groupPolygons.length - 1, 0);
      
      for (let i = 1; i < groupPolygons.length; i++) {
        try {
          mergedPolygon = turf.union(mergedPolygon, groupPolygons[i]);
          // Update the progress bar
          progressBar.update(i);
        } catch (err) {
          console.warn(`\nWarning: Error merging polygon ${i+1} for prefix ${prefix}: ${err.message}`);
          // Continue with the next polygon
          progressBar.update(i);
        }
      }
      
      // Stop the progress bar
      progressBar.stop();
    }
    
    // Create a feature for this merged prefix group
    const resultFeature = {
      type: 'Feature',
      properties: {
        PincodePrefix: prefix,
        FeatureCount: features.length,
        PincodeLevel: digitPosition
      },
      geometry: mergedPolygon.geometry
    };
    
    mergedFeatures.push(resultFeature);
    
    // Update the prefix progress bar
    prefixBar.update(prefixIndex + 1);
  }
  
  // Stop the prefix progress bar
  prefixBar.stop();
  
  // Create a FeatureCollection with all the merged features
  const resultCollection = {
    type: 'FeatureCollection',
    features: mergedFeatures
  };
  
  // Write the output
  writeFileSync(outputFile, JSON.stringify(resultCollection, null, 2));
  
  console.log(`Successfully merged polygons and wrote to ${outputFile}`);
  console.log(`Created ${mergedFeatures.length} merged features (one per ${digitPosition}-digit prefix)`);
  
  // Report geometry types
  const geometryTypes = {};
  mergedFeatures.forEach(feature => {
    const type = feature.geometry.type;
    geometryTypes[type] = (geometryTypes[type] || 0) + 1;
  });
  
  for (const type in geometryTypes) {
    console.log(`${geometryTypes[type]} features with geometry type: ${type}`);
  }
  
} catch (err) {
  console.error('Error processing file:', err);
  process.exit(1);
}
