<#
.SYNOPSIS
   Extract information from the Indian PIN Code Boundaries data from the Indian Goverment Department of Posts
.DESCRIPTION
   The All India PIN Code Boundaries data from https://data.gov.in/ contains the details
   of all PIN Code Boundaries in India, in geoJSON format.
   
   This script generates geoJson files for different levels of detail.

   At a minimum, the following levels of detail are supported:
   1. PIN Code at 6 digits
   2. PIN Code areas at 3 digits
   3. PIN Code areas at 2 digits
   4. PIN Code areas at 1 digit

   .EXAMPLE
   .\data\process-pincode-boundaries.ps1

      Will process the input file (data/All_India_pincode_Directory-165636.json) and 
      output the geojson file (src/assets/delhi.json).
#>

$INPUT_FILE=".\data\All_India_pincode_Boundary-19312.geojson"
$TEMP_DIR=".\data\temp"
$OUTPUT_DIR=".\src\assets"

# Create temp directory if it doesn't exist
if (-not (Test-Path $TEMP_DIR)) {
   New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
}

# Process the input file and generate outputs in the output directory
# Step 1: Generate the 1-digit boundaries geoJson file
jq -c '.features[] | select(.properties.Pincode | startswith("1"))' $INPUT_FILE > $TEMP_DIR\p1.json

# Step 2: Combine all the 1-digit boundaries into a single feature, using a node.js script
node .\data\merge-pincode-polygons.js 1 $INPUT_FILE $TEMP_DIR\p1.json

# Step 3: Copy the combined 1-digit boundaries to the output directory
Copy-Item $TEMP_DIR\p1.json $OUTPUT_DIR\p1.json

# Step 4: Combine all the 2-digit boundaries into a single feature, using a node.js script
node .\data\merge-pincode-polygons.js 2 $INPUT_FILE $TEMP_DIR\p2.json

# Step 5: Copy the combined 2-digit boundaries to the output directory
Copy-Item $TEMP_DIR\p2.json $OUTPUT_DIR\p2.json

# Step 6: Combine all the 3-digit boundaries into a single feature, using a node.js script
node .\data\merge-pincode-polygons.js 3 $INPUT_FILE $TEMP_DIR\p3.json

# Step 7: Copy the combined 3-digit boundaries to the output directory
Copy-Item $TEMP_DIR\p3.json $OUTPUT_DIR\p3.json

# Step 8: Combine all the 4-digit boundaries into a single feature, using a node.js script
node .\data\merge-pincode-polygons.js 4 $INPUT_FILE $TEMP_DIR\p4.json

# Step 9: Copy the combined 4-digit boundaries to the output directory
Copy-Item $TEMP_DIR\p4.json $OUTPUT_DIR\p4.json

# Step 10: Combine all the 5-digit boundaries into a single feature, using a node.js script
node .\data\merge-pincode-polygons.js 5 $INPUT_FILE $TEMP_DIR\p5.json

# Step 11: Copy the combined 5-digit boundaries to the output directory
Copy-Item $TEMP_DIR\p5.json $OUTPUT_DIR\p5.json

# Step 12: Combine all the 6-digit boundaries into a single feature, using a node.js script
node .\data\merge-pincode-polygons.js 6 $INPUT_FILE $TEMP_DIR\p6.json

# Step 13: Copy the combined 6-digit boundaries to the output directory
Copy-Item $TEMP_DIR\p6.json $OUTPUT_DIR\p6.json
