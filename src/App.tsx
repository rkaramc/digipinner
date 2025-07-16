import MapView from "./components/MapView";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="digipinner" subtitle="Digital PINs for India" />

      <MapView enableMarkerPlacement={true} />

      <Footer
        copyright={`© ${new Date().getFullYear()} digipinner. All rights reserved.`}
      />
    </div>
  );
}

export default App;
