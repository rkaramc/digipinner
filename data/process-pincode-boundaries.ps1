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
