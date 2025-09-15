import React from 'react';
//import './App.css';

function Button({onClick, text = "Click Me!"}) {
  console.log(onClick);
  return (
    <button 
          onClick={onClick}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#61dafb',
            color: '#282c34',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '20px'
          }}
        >
          {text}
    </button>
  );
}

function Slider({label, value, onChange}) {
    return(
    <div className="slider-container">
        <label>{label}: {value}%</label>
        <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        className="slider"
        />
    </div>

    )
};

export { Button, Slider };