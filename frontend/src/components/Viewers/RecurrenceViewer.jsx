import React, { useState, useEffect, useMemo, useCallback } from 'react';

const RecurrenceViewer = ({ data }) => {
  const [channelX, setChannelX] = useState(0);
  const [channelY, setChannelY] = useState(1);
  const [timeStart, setTimeStart] = useState(0);
  const [timeEnd, setTimeEnd] = useState(100);
  const [threshold, setThreshold] = useState(0.1); // Similarity threshold
  const [colorMap, setColorMap] = useState('heat');
  const [pointSize, setPointSize] = useState(2);
  const [showGrid, setShowGrid] = useState(true);
  const [normalize, setNormalize] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

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

  // Validate channels
  useEffect(() => {
    if (channelX >= channels.length) setChannelX(0);
    if (channelY >= channels.length) setChannelY(Math.min(1, channels.length - 1));
    if (channelX === channelY && channels.length > 1) {
      setChannelY((channelX + 1) % channels.length);
    }
  }, [channels.length, channelX, channelY]);

  // Update time range when data changes
  useEffect(() => {
    if (channels[0]?.length > 0) {
      setTimeEnd(Math.min(100, channels[0].length));
    }
  }, [channels]);

  // Get data ranges for normalization
  const dataRanges = useMemo(() => {
    if (channels.length === 0) return {};
    
    const ranges = {};
    channels.forEach((ch, idx) => {
      if (!ch) return;
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < ch.length; i++) {
        const val = ch[i];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      ranges[idx] = { min, max, range: max - min };
    });
    return ranges;
  }, [channels]);

  // Generate recurrence matrix
  const recurrenceData = useMemo(() => {
    if (channels.length === 0 || !channels[channelX] || !channels[channelY]) {
      return { points: [], matrix: [], maxX: 0, maxY: 0 };
    }

    try {
      const dataX = channels[channelX];
      const dataY = channels[channelY];
      
      const start = Math.max(0, timeStart);
      const end = Math.min(dataX.length, dataY.length, timeEnd);
      
      if (start >= end) {
        setError('Invalid time range');
        return { points: [], matrix: [], maxX: 0, maxY: 0 };
      }

      const points = [];
      const matrix = [];
      const rangeX = dataRanges[channelX]?.range || 1;
      const rangeY = dataRanges[channelY]?.range || 1;
      const minX = dataRanges[channelX]?.min || 0;
      const minY = dataRanges[channelY]?.min || 0;

      // Generate recurrence matrix
      for (let i = start; i < end; i++) {
        const row = [];
        for (let j = start; j < end; j++) {
          const valX = dataX[i];
          const valY = dataY[j];
          
          // Normalize values if enabled
          let x = valX;
          let y = valY;
          
          if (normalize) {
            x = (valX - minX) / rangeX;
            y = (valY - minY) / rangeY;
          }
          
          // Calculate similarity (inverse distance)
          const distance = Math.abs(x - y);
          const similarity = Math.max(0, 1 - distance / threshold);
          
          row.push(similarity);
          
          // Add point if similar enough
          if (similarity > 0.5) {
            points.push({
              x: i - start,
              y: j - start,
              value: similarity,
              originalX: valX,
              originalY: valY,
              timeX: timeData[i] || i,
              timeY: timeData[j] || j
            });
          }
        }
        matrix.push(row);
      }

      setError(null);
      return {
        points,
        matrix,
        maxX: end - start,
        maxY: end - start,
        rangeX,
        rangeY,
        minX,
        minY
      };
    } catch (err) {
      setError('Error computing recurrence: ' + err.message);
      return { points: [], matrix: [], maxX: 0, maxY: 0 };
    }
  }, [channels, channelX, channelY, timeStart, timeEnd, threshold, normalize, dataRanges, timeData]);

  // Get color based on value and colormap
  const getColor = (value) => {
    // Value is similarity (0-1)
    switch(colorMap) {
      case 'heat':
        // Red-yellow-white heat map
        if (value < 0.33) {
          const r = 255;
          const g = Math.floor(255 * (value / 0.33));
          return `rgb(${r}, ${g}, 0)`;
        } else if (value < 0.66) {
          const r = 255;
          const g = 255;
          const b = Math.floor(255 * ((value - 0.33) / 0.33));
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          const r = 255;
          const g = 255;
          const b = 255;
          return `rgb(${r}, ${g}, ${b})`;
        }
      
      case 'cool':
        // Blue-purple-pink
        const h = 240 + value * 120;
        return `hsl(${h}, 80%, 60%)`;
      
      case 'rainbow':
        // Full rainbow
        const hue = value * 360;
        return `hsl(${hue}, 90%, 60%)`;
      
      case 'grayscale':
        const gray = Math.floor(value * 255);
        return `rgb(${gray}, ${gray}, ${gray})`;
      
      case 'binary':
        return value > 0.5 ? '#000' : '#fff';
      
      default:
        const gs = Math.floor(value * 255);
        return `rgb(${gs}, ${gs}, ${gs})`;
    }
  };

  // Handle canvas click to show value
  const handleCanvasClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const scaleX = dimensions.width / recurrenceData.maxX;
    const scaleY = dimensions.height / recurrenceData.maxY;
    
    const x = Math.floor((e.clientX - rect.left) / scaleX);
    const y = Math.floor((e.clientY - rect.top) / scaleY);
    
    if (x >= 0 && x < recurrenceData.maxX && y >= 0 && y < recurrenceData.maxY) {
      const point = recurrenceData.points.find(p => 
        Math.floor(p.x) === x && Math.floor(p.y) === y
      );
      
      if (point) {
        alert(
          `Time X: ${point.timeX}\n` +
          `Time Y: ${point.timeY}\n` +
          `Value X: ${point.originalX.toFixed(2)}\n` +
          `Value Y: ${point.originalY.toFixed(2)}\n` +
          `Similarity: ${(point.value * 100).toFixed(1)}%`
        );
      }
    }
  };

  if (channels.length < 2) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        color: '#666',
        fontSize: '1.2em'
      }}>
        Need at least 2 channels for recurrence plot
      </div>
    );
  }

  return (
    <div className="recurrence-viewer" style={{ padding: '20px' }}>
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
        <h3 style={{ margin: '0 0 15px 0' }}>Recurrence Plot Controls</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          {/* Channel X Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Channel X:
            </label>
            <select 
              value={channelX}
              onChange={(e) => setChannelX(parseInt(e.target.value))}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              {channelNames.map((name, idx) => (
                <option key={idx} value={idx}>{name || `Channel ${idx+1}`}</option>
              ))}
            </select>
          </div>

          {/* Channel Y Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Channel Y:
            </label>
            <select 
              value={channelY}
              onChange={(e) => setChannelY(parseInt(e.target.value))}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              {channelNames.map((name, idx) => (
                <option key={idx} value={idx}>{name || `Channel ${idx+1}`}</option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Time Start: {timeStart}
            </label>
            <input 
              type="range" 
              min="0" 
              max={Math.max(0, (channels[0]?.length || 1) - 1)} 
              step="1"
              value={timeStart}
              onChange={(e) => setTimeStart(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Time End: {timeEnd}
            </label>
            <input 
              type="range" 
              min={timeStart + 1} 
              max={channels[0]?.length || 100} 
              step="1"
              value={timeEnd}
              onChange={(e) => setTimeEnd(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Threshold */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Similarity Threshold: {threshold.toFixed(2)}
            </label>
            <input 
              type="range" 
              min="0.01" 
              max="0.5" 
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Lower = stricter matching
            </div>
          </div>

          {/* Point Size */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Point Size: {pointSize}
            </label>
            <input 
              type="range" 
              min="1" 
              max="5" 
              step="0.5"
              value={pointSize}
              onChange={(e) => setPointSize(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

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
              <option value="heat">Heat Map</option>
              <option value="cool">Cool</option>
              <option value="rainbow">Rainbow</option>
              <option value="grayscale">Grayscale</option>
              <option value="binary">Binary</option>
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
              Normalize Values
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

        {/* Stats */}
        <div style={{ 
          marginTop: '15px', 
          padding: '10px',
          background: '#e3f2fd',
          borderRadius: '4px',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          fontSize: '0.9rem'
        }}>
          <div><strong>Points:</strong> {recurrenceData.points.length}</div>
          <div><strong>Matrix Size:</strong> {recurrenceData.maxX} x {recurrenceData.maxY}</div>
          <div><strong>Density:</strong> {((recurrenceData.points.length / (recurrenceData.maxX * recurrenceData.maxY)) * 100).toFixed(2)}%</div>
          <div><strong>Range X:</strong> {dataRanges[channelX]?.min.toFixed(2)} - {dataRanges[channelX]?.max.toFixed(2)}</div>
          <div><strong>Range Y:</strong> {dataRanges[channelY]?.min.toFixed(2)} - {dataRanges[channelY]?.max.toFixed(2)}</div>
        </div>
      </div>

      {/* Recurrence Plot */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h4 style={{ margin: '0 0 15px 0', alignSelf: 'flex-start' }}>
          Recurrence Plot: {channelNames[channelX]} vs {channelNames[channelY]}
        </h4>
        
        <div style={{ position: 'relative' }}>
          {/* Canvas for recurrence plot */}
          <canvas
            ref={(canvas) => {
              if (canvas && recurrenceData.matrix.length > 0) {
                const ctx = canvas.getContext('2d');
                const width = 600;
                const height = 600;
                canvas.width = width;
                canvas.height = height;
                
                // Clear canvas
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, width, height);
                
                const cellWidth = width / recurrenceData.maxX;
                const cellHeight = height / recurrenceData.maxY;
                
                // Draw recurrence matrix
                for (let i = 0; i < recurrenceData.matrix.length; i++) {
                  for (let j = 0; j < recurrenceData.matrix[i].length; j++) {
                    const value = recurrenceData.matrix[i][j];
                    if (value > 0) {
                      ctx.fillStyle = getColor(value);
                      ctx.fillRect(
                        j * cellWidth,
                        i * cellHeight,
                        cellWidth - 1,
                        cellHeight - 1
                      );
                    }
                  }
                }
                
                // Draw grid
                if (showGrid) {
                  ctx.strokeStyle = '#ccc';
                  ctx.lineWidth = 0.5;
                  
                  for (let i = 0; i <= recurrenceData.maxX; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * cellWidth, 0);
                    ctx.lineTo(i * cellWidth, height);
                    ctx.stroke();
                  }
                  
                  for (let i = 0; i <= recurrenceData.maxY; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, i * cellHeight);
                    ctx.lineTo(width, i * cellHeight);
                    ctx.stroke();
                  }
                }
              }
            }}
            width="600"
            height="600"
            onClick={handleCanvasClick}
            style={{ 
              width: dimensions.width, 
              height: dimensions.height,
              border: '1px solid #ddd',
              cursor: 'pointer'
            }}
          />
          
          {/* Labels */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 'bold'
          }}>
            {channelNames[channelY]} (t₂)
          </div>
          
          <div style={{
            position: 'absolute',
            left: '-40px',
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            fontWeight: 'bold'
          }}>
            {channelNames[channelX]} (t₁)
          </div>
        </div>

        {/* Colorbar */}
        <div style={{ 
          marginTop: '30px',
          width: '400px',
          height: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', width: '100%', height: '20px' }}>
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '100%',
                  backgroundColor: getColor(i / 100)
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginTop: '5px' }}>
            <span>0% similar</span>
            <span>50% similar</span>
            <span>100% similar</span>
          </div>
        </div>
      </div>

      {/* Scatter Plot Alternative */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 15px 0' }}>Scatter View (Recurrence Points)</h4>
        
        <svg width="600" height="600" viewBox="0 0 600 600" style={{ border: '1px solid #ddd' }}>
          {/* Grid */}
          {showGrid && (
            <g>
              {Array.from({ length: 11 }).map((_, i) => (
                <line
                  key={`grid-x-${i}`}
                  x1={i * 60}
                  y1="0"
                  x2={i * 60}
                  y2="600"
                  stroke="#eee"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: 11 }).map((_, i) => (
                <line
                  key={`grid-y-${i}`}
                  x1="0"
                  y1={i * 60}
                  x2="600"
                  y2={i * 60}
                  stroke="#eee"
                  strokeWidth="1"
                />
              ))}
            </g>
          )}

          {/* Axes */}
          <line x1="0" y1="600" x2="600" y2="600" stroke="#333" strokeWidth="2" />
          <line x1="0" y1="0" x2="0" y2="600" stroke="#333" strokeWidth="2" />
          
          {/* Points */}
          {recurrenceData.points.map((point, idx) => {
            const x = (point.x / recurrenceData.maxX) * 600;
            const y = 600 - (point.y / recurrenceData.maxY) * 600; // Flip Y for SVG
            
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={pointSize}
                fill={getColor(point.value)}
                stroke="white"
                strokeWidth="0.5"
              >
                <title>
                  {`t₁: ${point.timeX}\nt₂: ${point.timeY}\n` +
                   `${channelNames[channelX]}: ${point.originalX.toFixed(2)}\n` +
                   `${channelNames[channelY]}: ${point.originalY.toFixed(2)}\n` +
                   `Similarity: ${(point.value * 100).toFixed(1)}%`}
                </title>
              </circle>
            );
          })}
        </svg>

        <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
          Each point represents a recurrence: when state at time t₁ (X-axis) is similar to state at time t₂ (Y-axis)
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
        <h5 style={{ margin: '0 0 10px 0', color: '#e65100' }}>How Recurrence Plot Works:</h5>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          • <strong>X-axis (t₁):</strong> Time in channel {channelNames[channelX]}<br />
          • <strong>Y-axis (t₂):</strong> Time in channel {channelNames[channelY]}<br />
          • <strong>Point:</strong> Appears when values at t₁ and t₂ are similar<br />
          • <strong>Color:</strong> Indicates degree of similarity (hotter = more similar)<br />
          • <strong>Diagonal line:</strong> Perfect self-similarity (t₁ = t₂)<br />
          • <strong>Patterns:</strong> Periodic signals show repeating diagonal lines<br />
          • <strong>White spaces:</strong> No recurrence (different states)
        </p>
      </div>
    </div>
  );
};

export default RecurrenceViewer;
