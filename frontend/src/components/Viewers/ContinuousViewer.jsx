import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const ContinuousViewer = ({ data }) => {
  const [viewport, setViewport] = useState({ start: 0, end: 500 });
  const [visibleChannels, setVisibleChannels] = useState({});
  const [playback, setPlayback] = useState({ playing: false, speed: 1 });
  const [channelColors, setChannelColors] = useState({});
  const [displayMode, setDisplayMode] = useState('overlay');
  const [offsetAmount, setOffsetAmount] = useState(3);
  const animationRef = useRef();

// Normalize data structure - handle both medical and stock data
// Normalize data - add this near the top of the component
const normalizeData = () => {
  if (!data) return { channels: [], timeData: [], channelNames: [], isStock: false };
  
  if (data.type === 'stock' && data.date_labels) {
    return {
      channels: data.data || [],
      timeData: data.date_labels,
      channelNames: data.channel_names || 
        (data.data ? data.data.map((_, i) => `Channel ${i+1}`) : []),
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
  
  return { channels: [], timeData: [], channelNames: [], isStock: false };
};

const { channels, timeData, channelNames, isStock } = normalizeData();

  // Initialize visible channels and colors
  useEffect(() => {
    if (channels.length > 0) {
      const initialVisibility = {};
      const initialColors = {};
      
      channels.forEach((_, index) => {
        initialVisibility[index] = true;
        const hue = (index * 137) % 360;
        initialColors[index] = `hsl(${hue}, 70%, 50%)`;
      });
      
      setVisibleChannels(initialVisibility);
      setChannelColors(initialColors);
      
      // Adjust viewport based on data length
      if (timeData.length > 0) {
        const maxEnd = Math.min(500, timeData.length);
        setViewport({ start: 0, end: maxEnd });
      }
    }
  }, [channels, timeData]);

  // Playback animation
  useEffect(() => {
    if (playback.playing) {
      const animate = () => {
        setViewport(prev => {
          const newStart = prev.start + playback.speed;
          const newEnd = prev.end + playback.speed;
          
          // Stop if we reach the end
          if (timeData.length > 0 && newEnd >= timeData.length) {
            setPlayback(p => ({ ...p, playing: false }));
            return prev;
          }
          
          return {
            start: newStart,
            end: newEnd
          };
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationRef.current);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [playback.playing, playback.speed, timeData.length]);

  // Format data for Recharts
  const formatChartData = () => {
    if (channels.length === 0 || timeData.length === 0) return [];

    const chartData = [];
    const start = Math.max(0, Math.floor(viewport.start));
    const end = Math.min(timeData.length, Math.floor(viewport.end));
    
    for (let i = start; i < end; i++) {
      const timePoint = timeData[i];
      const dataPoint = { 
        time: isStock ? timePoint : (typeof timePoint === 'number' ? timePoint.toFixed(2) : String(timePoint))
      };
      
      channels.forEach((channel, channelIdx) => {
        if (visibleChannels[channelIdx] && channel && i < channel.length) {
          let value = channel[i];
          
          // Skip invalid values
          if (value === undefined || value === null || !isFinite(value)) {
            value = 0;
          }
          
          dataPoint[`ch${channelIdx}`] = value;
        }
      });
      
      chartData.push(dataPoint);
    }
    
    return chartData;
  };

  // Handle zoom in
  const handleZoomIn = () => {
    const range = viewport.end - viewport.start;
    const newRange = Math.max(50, Math.floor(range / 1.5));
    const center = (viewport.start + viewport.end) / 2;
    setViewport({
      start: Math.max(0, Math.floor(center - newRange / 2)),
      end: Math.min(timeData.length, Math.floor(center + newRange / 2))
    });
  };

  // Handle zoom out
  const handleZoomOut = () => {
    const range = viewport.end - viewport.start;
    const newRange = Math.min(timeData.length, Math.floor(range * 1.5));
    const center = (viewport.start + viewport.end) / 2;
    setViewport({
      start: Math.max(0, Math.floor(center - newRange / 2)),
      end: Math.min(timeData.length, Math.floor(center + newRange / 2))
    });
  };

  // Handle pan left
  const handlePanLeft = () => {
    const range = viewport.end - viewport.start;
    const shift = Math.floor(range * 0.2);
    setViewport({
      start: Math.max(0, viewport.start - shift),
      end: Math.max(range, viewport.end - shift)
    });
  };

  // Handle pan right
  const handlePanRight = () => {
    const range = viewport.end - viewport.start;
    const shift = Math.floor(range * 0.2);
    const maxEnd = timeData.length;
    setViewport({
      start: Math.min(maxEnd - range, viewport.start + shift),
      end: Math.min(maxEnd, viewport.end + shift)
    });
  };

  // Toggle channel visibility
  const toggleChannel = (channelIdx) => {
    setVisibleChannels(prev => ({
      ...prev,
      [channelIdx]: !prev[channelIdx]
    }));
  };

  // Show all channels
  const showAllChannels = () => {
    const allVisible = {};
    channels.forEach((_, idx) => {
      allVisible[idx] = true;
    });
    setVisibleChannels(allVisible);
  };

  // Hide all channels
  const hideAllChannels = () => {
    const allHidden = {};
    channels.forEach((_, idx) => {
      allHidden[idx] = false;
    });
    setVisibleChannels(allHidden);
  };

  // Render separate viewers (one per channel)
  const renderSeparateViewers = () => {
    const visibleIndices = Object.entries(visibleChannels)
      .filter(([_, visible]) => visible)
      .map(([idx]) => parseInt(idx));

    if (visibleIndices.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          color: '#666',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px'
        }}>
          No channels selected. Please enable at least one channel.
        </div>
      );
    }

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        height: '100%',
        padding: '10px'
      }}>
        {visibleIndices.map(channelIdx => {
          const channelData = formatChartData().map(point => ({
            time: point.time,
            value: point[`ch${channelIdx}`] || 0
          }));

          return (
            <div key={channelIdx} style={{ 
              border: '1px solid #ddd', 
              padding: '15px',
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h4 style={{ margin: 0, color: channelColors[channelIdx] }}>
                  {channelNames[channelIdx] || `Channel ${channelIdx + 1}`}
                </h4>
                <button 
                  onClick={() => toggleChannel(channelIdx)}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Hide
                </button>
              </div>
              <LineChart
                width={380}
                height={200}
                data={channelData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  label={{ value: isStock ? 'Date' : 'Time (s)', position: 'bottom', fontSize: 10 }}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Price', angle: -90, position: 'left', fontSize: 10 }}
                />
                <Tooltip />
                <Line 
                  type="monotone"
                  dataKey="value"
                  stroke={channelColors[channelIdx]}
                  dot={false}
                  strokeWidth={2}
                  name={channelNames[channelIdx] || `Channel ${channelIdx + 1}`}
                  isAnimationActive={false}
                />
              </LineChart>
            </div>
          );
        })}
      </div>
    );
  };

  // Render overlay viewer (all channels stacked vertically)
// Render overlay viewer (all channels stacked vertically)
const renderOverlayViewer = () => {
  const chartData = formatChartData();
  
  if (chartData.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px',
        color: '#666'
      }}>
        No data to display
      </div>
    );
  }

  // Get visible channel indices
  const visibleIndices = Object.entries(visibleChannels)
    .filter(([_, visible]) => visible)
    .map(([idx]) => parseInt(idx))
    .sort((a, b) => a - b);

  if (visibleIndices.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px',
        color: '#666'
      }}>
        No channels selected
      </div>
    );
  }

  // Create offset data - stack channels vertically
  const offsetData = chartData.map(point => {
    const newPoint = { time: point.time };
    
    // Add each channel with vertical offset
    visibleIndices.forEach((idx, i) => {
      const baseValue = point[`ch${idx}`] || 0;
      // Stack channels: ch0 at bottom, ch1 above it, etc.
      newPoint[`ch${idx}_offset`] = baseValue + (i * offsetAmount);
      // Store original for tooltip
      newPoint[`ch${idx}_original`] = baseValue;
    });
    
    return newPoint;
  });

  // Custom tooltip to show original values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
            Time: {label}
          </p>
          {payload.map((entry, index) => {
            const channelIdx = visibleIndices[index];
            const channelName = channelNames[channelIdx] || `Channel ${channelIdx + 1}`;
            const originalValue = entry.payload[`ch${channelIdx}_original`];
            
            return (
              <p key={index} style={{ 
                margin: '2px 0', 
                color: entry.color,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ 
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  backgroundColor: entry.color,
                  borderRadius: '2px'
                }} />
                <strong>{channelName}:</strong> {originalValue?.toFixed(2)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      height: '100%', 
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Channel Legend - MOVED ABOVE THE GRAPH */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '15px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        {visibleIndices.map((idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              backgroundColor: 'white',
              borderRadius: '20px',
              border: `1px solid ${channelColors[idx]}`,
              fontSize: '0.85rem'
            }}
          >
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: channelColors[idx],
              borderRadius: '2px'
            }} />
            <span style={{ fontWeight: '500' }}>
              {channelNames[idx] || `Channel ${idx + 1}`}
            </span>
          </div>
        ))}
      </div>

      <LineChart
        width={750}
        height={400}
        data={offsetData}
        margin={{ top: 20, right: 30, left: 40, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="time" 
          label={{ value: isStock ? 'Date' : 'Time (s)', position: 'bottom' }}
        />
        <YAxis 
          label={{ value: 'Stacked Amplitude', angle: -90, position: 'left' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ display: 'none' }} /> {/* Hide the default legend */}
        {visibleIndices.map((idx, i) => (
          <Line 
            key={idx}
            type="monotone"
            dataKey={`ch${idx}_offset`}
            stroke={channelColors[idx]}
            dot={false}
            strokeWidth={2}
            name={channelNames[idx] || `Channel ${idx + 1}`}
            isAnimationActive={false}
            legendType="none" // This removes it from legend
          />
        ))}
      </LineChart>
      
      {/* Offset control slider */}
      <div style={{ 
        marginTop: '20px', 
        textAlign: 'center',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Vertical Spacing:</span>
          <input 
            type="range" 
            min="1" 
            max="10" 
            step="0.5" 
            value={offsetAmount}
            onChange={(e) => setOffsetAmount(parseFloat(e.target.value))}
            style={{ width: '300px' }}
          />
          <span style={{ 
            backgroundColor: '#2196F3', 
            color: 'white',
            padding: '2px 10px',
            borderRadius: '12px',
            fontWeight: 'bold'
          }}>
            {offsetAmount}
          </span>
        </label>
      </div>
    </div>
  );
};

  // If no data, show message
  if (!data) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        color: '#666',
        fontSize: '1.2em'
      }}>
        No data loaded. Please upload a file first.
      </div>
    );
  }

  const chartData = formatChartData();

  return (
    <div className="continuous-viewer" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '10px'
    }}>
      {/* Controls Section */}
      <div className="viewer-controls" style={{ 
        marginBottom: '15px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* Playback Controls */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            onClick={() => setPlayback(prev => ({ ...prev, playing: !prev.playing }))}
            style={{
              padding: '8px 16px',
              backgroundColor: playback.playing ? '#ff4444' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {playback.playing ? 'Pause' : 'Play'}
          </button>
          
          <button 
            onClick={() => setViewport({ start: 0, end: 500 })}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>

        {/* Speed Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Speed:</label>
          <input 
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1" 
            value={playback.speed}
            onChange={(e) => setPlayback(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
            style={{ width: '150px' }}
          />
          <span>{playback.speed}x</span>
        </div>

        {/* Zoom/Pan Controls */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            onClick={handleZoomIn}
            style={{
              padding: '8px 12px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Zoom In
          </button>
          <button 
            onClick={handleZoomOut}
            style={{
              padding: '8px 12px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Zoom Out
          </button>
          <button 
            onClick={handlePanLeft}
            style={{
              padding: '8px 12px',
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Pan
          </button>
          <button 
            onClick={handlePanRight}
            style={{
              padding: '8px 12px',
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Pan →
          </button>
        </div>

        {/* Display Mode Toggle */}
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="radio" 
              name="displayMode" 
              value="separate"
              checked={displayMode === 'separate'}
              onChange={() => setDisplayMode('separate')}
            />
            Separate Viewers
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="radio" 
              name="displayMode" 
              value="overlay"
              checked={displayMode === 'overlay'}
              onChange={() => setDisplayMode('overlay')}
            />
            Stacked View
          </label>
        </div>
      </div>

      {/* Channel Controls Section */}
      {channels.length > 0 && (
        <div className="channel-controls" style={{ 
          marginBottom: '15px', 
          padding: '15px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h4 style={{ margin: 0 }}>Channels:</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={showAllChannels}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Show All
              </button>
              <button 
                onClick={hideAllChannels}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Hide All
              </button>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '15px',
            maxHeight: '100px',
            overflowY: 'auto',
            padding: '5px'
          }}>
            {channels.map((_, idx) => (
              <label key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                padding: '5px 10px',
                backgroundColor: visibleChannels[idx] ? '#e8f5e9' : '#f5f5f5',
                borderRadius: '20px',
                cursor: 'pointer',
                border: visibleChannels[idx] ? `2px solid ${channelColors[idx]}` : '2px solid transparent'
              }}>
                <input 
                  type="checkbox" 
                  checked={visibleChannels[idx] || false}
                  onChange={() => toggleChannel(idx)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ 
                  color: channelColors[idx],
                  fontWeight: visibleChannels[idx] ? 'bold' : 'normal'
                }}>
                  {channelNames[idx] || `Ch ${idx + 1}`}
                </span>
                <input 
                  type="color" 
                  value={channelColors[idx] || '#000000'}
                  onChange={(e) => setChannelColors(prev => ({ ...prev, [idx]: e.target.value }))}
                  style={{ 
                    width: '25px', 
                    height: '25px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Change channel color"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Viewer Area */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        padding: '10px'
      }}>
        {channels.length > 0 ? (
          displayMode === 'separate' ? renderSeparateViewers() : renderOverlayViewer()
        ) : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#666',
            fontSize: '1.2em'
          }}>
            No channel data available
          </div>
        )}
      </div>

      {/* Signal Info Footer */}
      <div className="signal-info" style={{ 
        marginTop: '15px', 
        padding: '10px 15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        fontSize: '14px'
      }}>
        <div><strong>File:</strong> {data.filename || 'Unknown'}</div>
        <div><strong>Type:</strong> {data.type || 'unknown'}</div>
        <div><strong>Channels:</strong> {channels.length}</div>
        <div><strong>Samples:</strong> {timeData.length}</div>
        <div><strong>Viewport:</strong> {viewport.start} - {viewport.end} ({viewport.end - viewport.start} samples)</div>
      </div>
    </div>
  );
};

export default ContinuousViewer;
