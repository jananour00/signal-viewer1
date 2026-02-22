import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  RadarChart, 
  Tooltip,
  Legend,
  ResponsiveContainer 
} from 'recharts';

const PolarViewer = ({ data }) => {
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [mode, setMode] = useState('cumulative'); // 'cumulative' or 'sliding'
  const [timeWindow, setTimeWindow] = useState(20); // Number of points to show in sliding mode
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playback, setPlayback] = useState(false);
  const [speed, setSpeed] = useState(1); // Updates per second
  const [colorMap, setColorMap] = useState('rainbow');
  const [normalize, setNormalize] = useState(true); // Normalize radius values
  const [showGrid, setShowGrid] = useState(true);
  const [error, setError] = useState(null);
  
  const animationRef = useRef();
  const containerRef = useRef();

  // Normalize data
  const normalizeData = useCallback(() => {
    if (!data) return { channels: [], timeData: [], channelNames: [], isStock: false };
    
    try {
      if (data.type === 'stock' && data.date_labels) {
        return {
          channels: data.data || [],
          timeData: data.date_labels,
          channelNames: data.channel_names || [],
          isStock: true
        };
      }
      
      if (data.channel_names) {
        return {
          channels: data.data || [],
          timeData: data.time || [],
          channelNames: data.channel_names,
          isStock: false
        };
      }
      
      if (data.data && Array.isArray(data.data)) {
        return {
          channels: data.data,
          timeData: data.time || [],
          channelNames: data.channel_names || 
            (data.channels ? Array(data.channels).fill(0).map((_, i) => `Channel ${i+1}`) : []),
          isStock: false
        };
      }
    } catch (err) {
      setError('Error normalizing data: ' + err.message);
    }
    
    return { channels: [], timeData: [], channelNames: [] };
  }, [data]);

  const { channels, timeData, channelNames, isStock } = normalizeData();
  const selectedData = channels[selectedChannel] || [];

  // Playback animation
  useEffect(() => {
    if (playback && mode === 'sliding') {
      const animate = () => {
        setCurrentIndex(prev => {
          const next = prev + speed;
          if (next >= selectedData.length) {
            setPlayback(false);
            return prev;
          }
          return next;
        });
        animationRef.current = setTimeout(animate, 1000); // 1 second between updates
      };
      animationRef.current = setTimeout(animate, 1000);
    } else {
      clearTimeout(animationRef.current);
    }

    return () => clearTimeout(animationRef.current);
  }, [playback, speed, selectedData.length, mode]);

  // Reset current index when channel changes
  useEffect(() => {
    setCurrentIndex(0);
    setPlayback(false);
  }, [selectedChannel]);

  // Get min/max for normalization
  const dataRange = useMemo(() => {
    if (selectedData.length === 0) return { min: 0, max: 1 };
    
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < selectedData.length; i++) {
      const val = selectedData[i];
      if (val < min) min = val;
      if (val > max) max = val;
    }
    
    // Add small padding
    const range = max - min;
    return {
      min: min - range * 0.05,
      max: max + range * 0.05
    };
  }, [selectedData]);

  // Generate polar data
  const polarData = useMemo(() => {
    if (selectedData.length === 0) return [];

    const points = [];
    const range = dataRange.max - dataRange.min;
    
    // Determine which points to show based on mode
    let startIdx = 0;
    let endIdx = selectedData.length;
    
    if (mode === 'sliding') {
      startIdx = Math.max(0, currentIndex - timeWindow + 1);
      endIdx = currentIndex + 1;
    }
    
    for (let i = startIdx; i < endIdx; i++) {
      const value = selectedData[i];
      
      // Calculate angle (θ) - map time to 0-360 degrees
      const angle = (i / selectedData.length) * 360;
      
      // Calculate radius (r) - map value to 0-100 range
      let radius;
      if (normalize) {
        radius = ((value - dataRange.min) / range) * 100;
      } else {
        radius = value;
      }
      
      // Ensure radius is positive and within bounds
      radius = Math.max(0, Math.min(100, radius));
      
      points.push({
        index: i,
        time: timeData[i] || i,
        value: value,
        angle: angle,
        radius: radius,
        originalValue: value
      });
    }
    
    return points;
  }, [selectedData, dataRange, mode, currentIndex, timeWindow, normalize, timeData]);

  // Get color based on value or index
  const getColor = (value, index) => {
    if (!value && value !== 0) return '#8884d8';
    
    const normalizedValue = (value - dataRange.min) / (dataRange.max - dataRange.min);
    
    switch(colorMap) {
      case 'rainbow':
        const hue = (index * 10) % 360;
        return `hsl(${hue}, 80%, 60%)`;
      case 'heat':
        return `hsl(${30 + normalizedValue * 30}, 90%, 50%)`;
      case 'cool':
        return `hsl(${180 + normalizedValue * 60}, 80%, 60%)`;
      case 'value':
        return `hsl(${normalizedValue * 360}, 80%, 60%)`;
      default:
        return '#8884d8';
    }
  };

  // Format data for radar chart
  const radarData = useMemo(() => {
    if (polarData.length === 0) return [];
    
    // Group by angle bins for radar display
    const bins = 24; // 15-degree bins (360/24 = 15)
    const binData = Array(bins).fill().map((_, i) => ({
      angle: i * (360 / bins),
      values: [],
      count: 0
    }));
    
    polarData.forEach(point => {
      const binIndex = Math.floor(point.angle / (360 / bins));
      if (binIndex >= 0 && binIndex < bins) {
        binData[binIndex].values.push(point.radius);
        binData[binIndex].count++;
      }
    });
    
    // Calculate average radius for each bin
    return binData.map(bin => ({
      angle: bin.angle,
      radius: bin.count > 0 ? bin.values.reduce((a, b) => a + b, 0) / bin.count : 0,
      count: bin.count
    }));
  }, [polarData]);

  // Handle slider change
  const handleSliderChange = (e) => {
    setCurrentIndex(parseInt(e.target.value));
    setPlayback(false);
  };

  if (channels.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        color: '#666',
        fontSize: '1.2em'
      }}>
        No data available for polar view
      </div>
    );
  }

  return (
    <div className="polar-viewer" style={{ padding: '20px' }} ref={containerRef}>
      {/* Error Display */}
      {error && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #ef9a9a'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Controls */}
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Polar Viewer Controls</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          {/* Channel Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Channel:
            </label>
            <select 
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(parseInt(e.target.value))}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              {channelNames.map((name, idx) => (
                <option key={idx} value={idx}>{name || `Channel ${idx+1}`}</option>
              ))}
            </select>
          </div>

          {/* Mode Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Mode:
            </label>
            <select 
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setPlayback(false);
                setCurrentIndex(0);
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="cumulative">Cumulative (all points)</option>
              <option value="sliding">Sliding Window</option>
            </select>
          </div>

          {/* Time Window (for sliding mode) */}
          {mode === 'sliding' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Window Size: {timeWindow}
                </label>
                <input 
                  type="range" 
                  min="5" 
                  max={Math.min(50, selectedData.length)} 
                  step="1"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Playback Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setPlayback(!playback)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: playback ? '#ff4444' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {playback ? '⏸️ Pause' : '▶️ Play'}
                </button>
                
                <select
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                  <option value="5">5x</option>
                </select>
              </div>
            </>
          )}

          {/* Color Map */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Color Map:
            </label>
            <select 
              value={colorMap}
              onChange={(e) => setColorMap(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="rainbow">Rainbow</option>
              <option value="heat">Heat</option>
              <option value="cool">Cool</option>
              <option value="value">Value-based</option>
            </select>
          </div>

          {/* Options */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="checkbox" 
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
              />
              Normalize Radius
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
              <input 
                type="checkbox" 
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Show Grid
            </label>
          </div>
        </div>

        {/* Time slider for sliding mode */}
        {mode === 'sliding' && (
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Time: {currentIndex} / {selectedData.length - 1}
            </label>
            <input 
              type="range" 
              min="0" 
              max={selectedData.length - 1} 
              step="1"
              value={currentIndex}
              onChange={handleSliderChange}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Polar Plot */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Radar Chart */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          height: '450px'
        }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Polar Radar View</h4>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart outerRadius="80%" data={radarData}>
              {showGrid && <PolarGrid />}
              <PolarAngleAxis dataKey="angle" tickFormatter={(angle) => `${angle}°`} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Signal"
                dataKey="radius"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Tooltip 
                formatter={(value, name, props) => {
                  const count = props.payload?.count || 0;
                  return [
                    `${value.toFixed(2)} (${count} points)`,
                    'Radius'
                  ];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Scatter Polar Plot */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          height: '450px',
          position: 'relative'
        }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Polar Scatter View</h4>
          <svg width="100%" height="90%" viewBox="0 0 400 400">
            {/* Polar grid */}
            {showGrid && (
              <g>
                {/* Circles */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((r, i) => (
                  <circle
                    key={`circle-${i}`}
                    cx="200"
                    cy="200"
                    r={r * 150}
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}
                
                {/* Radial lines */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 30) * Math.PI / 180;
                  const x2 = 200 + 150 * Math.cos(angle);
                  const y2 = 200 + 150 * Math.sin(angle);
                  return (
                    <line
                      key={`line-${i}`}
                      x1="200"
                      y1="200"
                      x2={x2}
                      y2={y2}
                      stroke="#ccc"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}
              </g>
            )}

            {/* Data points */}
            {polarData.map((point, idx) => {
              const angle = point.angle * Math.PI / 180;
              const radius = (point.radius / 100) * 150; // Scale to fit
              const x = 200 + radius * Math.cos(angle);
              const y = 200 + radius * Math.sin(angle);
              
              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={getColor(point.value, idx)}
                    stroke="white"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                  >
                    <title>
                      {`Time: ${point.time}\nValue: ${point.value.toFixed(2)}\nAngle: ${point.angle.toFixed(1)}°\nRadius: ${point.radius.toFixed(2)}`}
                    </title>
                  </circle>
                  
                  {/* Connect points in order */}
                  {idx > 0 && mode === 'sliding' && (
                    <line
                      x1={200 + (polarData[idx-1].radius / 100) * 150 * Math.cos(polarData[idx-1].angle * Math.PI / 180)}
                      y1={200 + (polarData[idx-1].radius / 100) * 150 * Math.sin(polarData[idx-1].angle * Math.PI / 180)}
                      x2={x}
                      y2={y}
                      stroke={getColor(point.value, idx)}
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  )}
                </g>
              );
            })}

            {/* Center point */}
            <circle cx="200" cy="200" r="3" fill="#333" />
          </svg>
          
          {/* Legend */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(255,255,255,0.9)',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            border: '1px solid #ddd'
          }}>
            <div><strong>Points:</strong> {polarData.length}</div>
            <div><strong>Range:</strong> {dataRange.min.toFixed(2)} - {dataRange.max.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 15px 0' }}>Polar Coordinates</h4>
        <div style={{ maxHeight: '200px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Index</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Value</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Angle (θ)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Radius (r)</th>
              </tr>
            </thead>
            <tbody>
              {polarData.slice(-20).map((point) => (
                <tr key={point.index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{point.index}</td>
                  <td style={{ padding: '8px' }}>{point.time}</td>
                  <td style={{ padding: '8px' }}>{point.value.toFixed(2)}</td>
                  <td style={{ padding: '8px' }}>{point.angle.toFixed(1)}°</td>
                  <td style={{ padding: '8px' }}>{point.radius.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '10px', color: '#666', fontSize: '0.9rem' }}>
          Showing last 20 points. Total: {polarData.length} points
        </div>
      </div>

      {/* Explanation */}
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        background: '#fff3e0',
        borderRadius: '4px',
        borderLeft: '4px solid #ff9800'
      }}>
        <h5 style={{ margin: '0 0 10px 0', color: '#e65100' }}>How Polar Viewer Works:</h5>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          • <strong>Angle (θ):</strong> Represents time (0° to 360° for full signal)<br />
          • <strong>Radius (r):</strong> Represents signal magnitude<br />
          • <strong>Cumulative Mode:</strong> Shows all points from the signal<br />
          • <strong>Sliding Mode:</strong> Shows only recent points that move/rotate<br />
          • <strong>Radar View:</strong> Groups points by angle to show distribution<br />
          • <strong>Scatter View:</strong> Each point's distance from center = value, angle = time
        </p>
      </div>
    </div>
  );
};

export default PolarViewer;
