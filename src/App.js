import React, { useState, useMemo } from 'react';
import './App.css';
import { Slider } from './Ui';

function App() {
  // State for garden parameters
  const [soilMoisture, setSoilMoisture] = useState(50);
  const [sunlight, setSunlight] = useState(50);
  const [water, setWater] = useState(50);
  const [nutrients, setNutrients] = useState(50);

  // Calculate garden health based on all parameters
  const gardenHealth = useMemo(() => {
    const average = (soilMoisture + sunlight + water + nutrients) / 4;
    return average;
  }, [soilMoisture, sunlight, water, nutrients]);

  // Determine garden state
  const gardenState = useMemo(() => {
    if (gardenHealth >= 80) return 'blossoming';
    if (gardenHealth >= 50) return 'healthy';
    if (gardenHealth >= 30) return 'withering';
    return 'dying';
  }, [gardenHealth]);

  // Garden emoji based on state
  const getGardenEmoji = () => {
    switch (gardenState) {
      case 'blossoming': return '🌸🌺🌻🌹';
      case 'healthy': return '🌱🌿🍃';
      case 'withering': return '🥀🌾';
      case 'dying': return '💀🌵';
      default: return '�';
    }
  };

  // Garden color based on state
  const getGardenColor = () => {
    switch (gardenState) {
      case 'blossoming': return '#4CAF50';
      case 'healthy': return '#8BC34A';
      case 'withering': return '#FF9800';
      case 'dying': return '#F44336';
      default: return '#8BC34A';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌱 Smart Garden Monitor</h1>

        {/* Garden Visualization */}
        <div
          className="garden-container"
          style={{
            fontSize: '4rem',
            margin: '20px 0',
            transition: 'all 0.5s ease',
            background: getGardenColor()
          }}
        >
          {getGardenEmoji()}
        </div>

        <div className="garden-status">
          <h2>Garden Status: {gardenState.charAt(0).toUpperCase() + gardenState.slice(1)}</h2>
          <p>Overall Health: {Math.round(gardenHealth)}%</p>
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          <h3>Garden Controls</h3>

          {/* Soil Moisture Slider */}
          <Slider label="🌧️ Soil Moisture" value={soilMoisture} onChange={(e) => setSoilMoisture(Number(e.target.value))} />

          {/* Sunlight Slider */}
          <Slider label="☀️ Sunlight" value={sunlight} onChange={(e) => setSunlight(Number(e.target.value))} />

          {/* Water Slider */}
          <Slider label="💧 Water" value={water} onChange={(e) => setWater(Number(e.target.value))} />
          {/* Nutrients Slider */}
          <Slider label="🌿 Nutrients" value={nutrients} onChange={(e) => setNutrients(Number(e.target.value))} />
        </div>

        <p className="instructions">
          Adjust the sliders to see how your garden responds! 🌻
        </p>
      </header>
    </div>
  );
}

export default App;