<#
.SYNOPSIS
   Extract information from the Indian post office directory from the Indian Goverment Department of Posts
.DESCRIPTION
   The All India PIN Code Directory json from https://data.gov.in/ contains the details
   of all post offices in India, including their latitude and longitude, in a bespoke format.
   
   This script converts the json to a geojson file for use with MapboxGLJS in a web application.
.EXAMPLE
   .\data\process-pin-directory.ps1

      Will process the input file (data/All_India_pincode_Directory-165636.json) and 
      output the geojson file (src/assets/delhi.json).
#>

# Create temp directory if it doesn't exist
if (-not (Test-Path .\data\temp)) {
    New-Item -ItemType Directory -Path .\data\temp -Force | Out-Null
}

# Step 1: Get records with GPO in the office name or delivery type is "Delivery"
jq -c '.records[] | select((.officename | contains("GPO")) or .officetype == "HO")' .\data\All_India_pincode_Directory-165636.json > .\data\temp\d1.json

# Step 2: Process each line individually to avoid complex jq expressions
$outputLines = @()
Get-Content .\data\temp\d1.json | ForEach-Object {
    $record = $_ | ConvertFrom-Json
    
    # Check if latitude and longitude are valid
    $lat = $null
    $lon = $null
    
    if ($record.latitude -ne "NA" -and $record.latitude -ne $null) {
        $lat = [double]::TryParse($record.latitude, [ref]$null) ? [double]$record.latitude : $null
    }
    
    if ($record.longitude -ne "NA" -and $record.longitude -ne $null) {
        $lon = [double]::TryParse($record.longitude, [ref]$null) ? [double]$record.longitude : $null
    }
    
    # Only include records with valid coordinates
    if ($lat -ne $null -and $lon -ne $null -and $lat -ne 0 -and $lon -ne 0) {
        $outputRecord = @{
            coordinates = @($lon, $lat)
            properties = $record
        }
        $outputLines += $outputRecord | ConvertTo-Json -Compress
    }
}

# Write processed records to file
"[" + ($outputLines -join ",") + "]" | Out-File -FilePath .\data\temp\d2.json

# Step 3: Convert to GeoJSON features
jq '[.[] | { "type":"Feature","geometry":{"type":"Point","coordinates":.coordinates},"properties":.properties}]' .\data\temp\d2.json > .\data\temp\d3.json

# Step 4: Convert to final GeoJSON
jq '{"type":"FeatureCollection","name":"All_India_pincode_Directory-cleaned","features":.}' .\data\temp\d3.json > .\src\assets\delhi.json

Write-Host "Processing complete. GeoJSON file created at .\src\assets\delhi.json"
