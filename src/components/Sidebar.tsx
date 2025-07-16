import React, { useState } from 'react';
import InputField from './InputField';
import { convertDIGIPINToGeoLocation, convertGeoLocationToDIGIPIN } from '../utils/geoUtils';
import { DEFAULT_ZOOM_LEVEL } from '../lib/constants';

interface SidebarProps {
  digipin?: string;
  longitude?: string;
  latitude?: string;
  zoomLevel?: string;
  onClearField?: (field: 'digipin' | 'longitude' | 'latitude' | 'zoomLevel') => void;
  onMapUpdate?: (lng: number, lat: number, zoom: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  digipin,
  longitude,
  latitude,
  zoomLevel,
}) => {
  console.log("Sidebar mounted", digipin || "x", longitude || "x", latitude || "x", zoomLevel || "x");

  return (
    <div className="p-4 bg-white shadow-md">
      <InputField 
        label="DIGIPIN"
        value={digipin || ""}
        readonly
        // onChange={handleDigipinChange}
        // onClear={() => onClearField('digipin')}
      />
      
      <InputField 
        label="Longitude"
        value={longitude || ""}
        readonly
        // onChange={(value) => handleCoordinateChange('longitude', value)}
        // onClear={() => onClearField('longitude')}
      />
      
      <InputField 
        label="Latitude"
        value={latitude || ""}
        readonly
        // onChange={(value) => handleCoordinateChange('latitude', value)}
        // onClear={() => onClearField('latitude')}
      />
      
      <InputField 
        label="Zoom Level"
        value={zoomLevel || ""}
        readonly
        // onChange={handleZoomLevelChange}
        // onClear={() => onClearField('zoomLevel')}
      />
    </div>
  );
};

export default Sidebar;
