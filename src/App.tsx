import { useState } from 'react';
import MapView from './components/MapView';
import './App.css';

function App() {
  const [mapReady, setMapReady] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">DIGIPINner</h1>
          <p className="text-sm text-gray-500">Digital PINs for India</p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-2 border-dashed border-gray-300 rounded-lg h-[600px]">
            <MapView onMapReady={() => setMapReady(true)} />
          </div>
          
          {!mapReady && (
            <div className="mt-4 text-center text-gray-500">
              Loading map...
            </div>
          )}
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} DIGIPINner. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
