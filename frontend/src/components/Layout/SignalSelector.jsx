import React, { useState, useEffect } from 'react';
import { medicalAPI } from '../../services/api';

const SignalSelector = ({ onSignalSelect, onDataLoad }) => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    try {
      setError(null);
      console.log('Fetching signals...');
      
      const response = await medicalAPI.getSignals();
      console.log('Signals received:', response.data);
      setSignals(response.data);
    } catch (error) {
      console.error('Error fetching signals:', error);
      setError(error.message);
    }
  };

  const handleSignalSelect = async (signalId) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading signal:', signalId);
      const response = await medicalAPI.getSignal(signalId);
      console.log('Signal data received');
      onSignalSelect(signalId);
      onDataLoad(response.data);
    } catch (error) {
      console.error('Error loading signal:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signal-selector">
      <h3>Medical Signals</h3>
      
      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '1rem', 
          padding: '0.5rem', 
          backgroundColor: '#ffeeee',
          borderRadius: '4px'
        }}>
          Error: {error}
        </div>
      )}
      
      {loading && <p>Loading signal data...</p>}
      
      <button 
        onClick={fetchSignals}
        style={{ 
          marginBottom: '1rem', 
          padding: '0.5rem 1rem',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Refresh Signals
      </button>
      
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {signals.map(signal => (
          <li key={signal.id} style={{ marginBottom: '0.5rem' }}>
            <button 
              onClick={() => handleSignalSelect(signal.id)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                cursor: 'pointer',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                textAlign: 'left',
                fontSize: '1rem',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f0f0f0'}
            >
              {signal.name}
            </button>
          </li>
        ))}
      </ul>
      
      {signals.length === 0 && !loading && !error && (
        <p>No signals available. Click refresh to try again.</p>
      )}
    </div>
  );
};

export default SignalSelector;
