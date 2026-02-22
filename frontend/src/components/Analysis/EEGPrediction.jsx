import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EEGPrediction = ({ signalData }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState('ensemble'); // 'ensemble', 'biot', 'rf'

  useEffect(() => {
    const analyzeEEG = async () => {
      if (!signalData) return;
      
      // Only analyze if it's EEG data (medical with multiple channels)
      if (signalData.type !== 'medical' && signalData.type !== 'eeg') {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Send EEG data to backend for analysis
        const response = await axios.post('http://localhost:5000/api/medical/eeg/predict', {
          data: signalData.data,
          fs: signalData.fs || 250,
          temperature: 1.0
        });

        setPredictions(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error analyzing EEG');
        console.error('EEG Analysis error:', err);
      } finally {
        setLoading(false);
      }
    };

    analyzeEEG();
  }, [signalData]);

  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return '#4caf50';
    if (confidence > 0.6) return '#ff9800';
    if (confidence > 0.4) return '#f44336';
    return '#9e9e9e';
  };

  const getAbnormalityIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'normal': return '✅';
      case 'seizure': return '⚡';
      case 'alcoholism': return '🍷';
      case 'motor_abnormality': return '🦾';
      case 'mental_stress': return '😰';
      case 'epileptic_interictal': return '🧠';
      default: return '🔍';
    }
  };

  const getAbnormalityDescription = (type) => {
    switch(type?.toLowerCase()) {
      case 'normal':
        return 'Normal EEG pattern. No abnormalities detected.';
      case 'seizure':
        return 'Epileptiform activity detected. May indicate seizure activity.';
      case 'alcoholism':
        return 'Patterns consistent with chronic alcohol consumption detected.';
      case 'motor_abnormality':
        return 'Abnormal motor cortex activity detected.';
      case 'mental_stress':
        return 'Elevated stress levels detected in brain activity.';
      case 'epileptic_interictal':
        return 'Interictal epileptiform discharges detected between seizures.';
      default:
        return 'Analysis complete. Review results below.';
    }
  };

  if (loading) {
    return (
      <div className="eeg-prediction" style={{
        marginTop: '20px',
        padding: '30px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div className="spinner" style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2196F3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 5px 0' }}>🧠 EEG Analysis in Progress</h3>
          <p style={{ margin: 0, color: '#666' }}>Running BIOT Deep Learning and Random Forest models...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="eeg-prediction" style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#ffebee',
        borderRadius: '12px',
        border: '1px solid #ffcdd2',
        color: '#c62828'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <h3 style={{ margin: 0 }}>Analysis Error</h3>
        </div>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (!predictions) {
    return null;
  }

  const hasBiot = predictions.biot;
  const hasRF = predictions.random_forest;
  const hasComparison = predictions.comparison;

  return (
    <div className="eeg-prediction" style={{
      marginTop: '20px',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      border: '1px solid #e0e0e0'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>🧠</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>EEG Abnormality Detection</h2>
              <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                Multi-model analysis: BIOT (Deep Learning) vs Random Forest (Classical ML)
              </p>
            </div>
          </div>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem'
          }}>
            {hasBiot && hasRF ? 'Ensemble Mode' : hasBiot ? 'BIOT Only' : 'Random Forest Only'}
          </div>
        </div>
      </div>

      {/* Model Toggle (if both available) */}
      {hasBiot && hasRF && (
        <div style={{
          padding: '15px 24px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={() => setSelectedModel('ensemble')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedModel === 'ensemble' ? '#1a237e' : 'white',
              color: selectedModel === 'ensemble' ? 'white' : '#333',
              border: `1px solid ${selectedModel === 'ensemble' ? '#1a237e' : '#ddd'}`,
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: selectedModel === 'ensemble' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            🤝 Ensemble (Combined)
          </button>
          <button
            onClick={() => setSelectedModel('biot')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedModel === 'biot' ? '#2196F3' : 'white',
              color: selectedModel === 'biot' ? 'white' : '#333',
              border: `1px solid ${selectedModel === 'biot' ? '#2196F3' : '#ddd'}`,
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: selectedModel === 'biot' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            🧠 BIOT (Deep Learning)
          </button>
          <button
            onClick={() => setSelectedModel('rf')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedModel === 'rf' ? '#4caf50' : 'white',
              color: selectedModel === 'rf' ? 'white' : '#333',
              border: `1px solid ${selectedModel === 'rf' ? '#4caf50' : '#ddd'}`,
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: selectedModel === 'rf' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            🌲 Random Forest (Classical)
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        {/* Ensemble/Comparison View */}
        {hasComparison && selectedModel === 'ensemble' && (
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #ddd'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤝</span> Ensemble Prediction
                </h3>
                <span style={{
                  backgroundColor: predictions.comparison.agreement ? '#4caf50' : '#ff9800',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem'
                }}>
                  {predictions.comparison.agreement ? 'Models Agree' : 'Models Disagree'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  fontSize: '3rem',
                  backgroundColor: 'white',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {getAbnormalityIcon(predictions.comparison.ensemble_prediction)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Final Diagnosis</div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold',
                    textTransform: 'capitalize',
                    marginBottom: '5px'
                  }}>
                    {predictions.comparison.ensemble_prediction || 'Unknown'}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    {getAbnormalityDescription(predictions.comparison.ensemble_prediction)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Ensemble Confidence</div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold',
                    color: getConfidenceColor(predictions.comparison.ensemble_confidence)
                  }}>
                    {(predictions.comparison.ensemble_confidence * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>
                    Source: {predictions.comparison.confidence_source}
                  </div>
                </div>
              </div>
            </div>

            {/* Model Comparison Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {/* BIOT Card */}
              <div style={{
                backgroundColor: '#e3f2fd',
                borderRadius: '10px',
                padding: '15px',
                border: '1px solid #bbdefb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🧠</span>
                  <h4 style={{ margin: 0, color: '#1976d2' }}>BIOT (Deep Learning)</h4>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {predictions.comparison.biot_prediction}
                    </span>
                    {predictions.comparison.biot_prediction !== predictions.comparison.ensemble_prediction && (
                      <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#666' }}>
                        (not selected)
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    padding: '4px 10px',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    color: getConfidenceColor(predictions.comparison.biot_confidence)
                  }}>
                    {(predictions.comparison.biot_confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Random Forest Card */}
              <div style={{
                backgroundColor: '#e8f5e8',
                borderRadius: '10px',
                padding: '15px',
                border: '1px solid #c8e6c9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🌲</span>
                  <h4 style={{ margin: 0, color: '#388e3c' }}>Random Forest (Classical)</h4>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {predictions.comparison.rf_prediction}
                    </span>
                    {predictions.comparison.rf_prediction !== predictions.comparison.ensemble_prediction && (
                      <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#666' }}>
                        (not selected)
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    padding: '4px 10px',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    color: getConfidenceColor(predictions.comparison.rf_confidence)
                  }}>
                    {(predictions.comparison.rf_confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual Model Views */}
        {selectedModel === 'biot' && hasBiot && (
          <ModelResult 
            title="BIOT Deep Learning Model"
            icon="🧠"
            color="#2196F3"
            result={predictions.biot}
            abnormalityTypes={[
              'normal', 'seizure', 'alcoholism', 
              'motor_abnormality', 'mental_stress', 'epileptic_interictal'
            ]}
            getIcon={getAbnormalityIcon}
            getColor={getConfidenceColor}
            description={getAbnormalityDescription}
          />
        )}

        {selectedModel === 'rf' && hasRF && (
          <ModelResult 
            title="Random Forest Classical ML"
            icon="🌲"
            color="#4caf50"
            result={predictions.random_forest}
            abnormalityTypes={[
              'normal', 'seizure', 'alcoholism', 
              'motor_abnormality', 'mental_stress', 'epileptic_interictal'
            ]}
            getIcon={getAbnormalityIcon}
            getColor={getConfidenceColor}
            description={getAbnormalityDescription}
          />
        )}

        {/* Expandable Details */}
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '10px 0'
            }}
          >
            {expanded ? '▼' : '▶'} {expanded ? 'Hide' : 'Show'} technical details
          </button>

          {expanded && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#666'
            }}>
              {hasBiot && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>🧠 BIOT Model:</strong>
                  <ul style={{ margin: '5px 0 0 20px' }}>
                    <li>Windows analyzed: {predictions.biot.n_windows || 'N/A'}</li>
                    <li>Temperature scaling: {predictions.biot.temperature || 1.0}</li>
                    <li>Model path: {predictions.biot.model_path || 'default'}</li>
                  </ul>
                </div>
              )}
              {hasRF && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>🌲 Random Forest Model:</strong>
                  <ul style={{ margin: '5px 0 0 20px' }}>
                    <li>Windows analyzed: {predictions.random_forest.n_windows || 'N/A'}</li>
                    <li>Model path: {predictions.random_forest.model_path || 'default'}</li>
                  </ul>
                </div>
              )}
              {hasComparison && (
                <div>
                  <strong>🤝 Ensemble Method:</strong>
                  <p style={{ margin: '5px 0 0 0' }}>
                    When models agree, confidence is averaged. When they disagree, 
                    the model with higher confidence is selected.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#fff3e0',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#e65100',
          borderLeft: '4px solid #ff9800'
        }}>
          <strong>⚠️ Research Use Only:</strong> This is an AI-assisted analysis tool based on research models. 
          It should not replace professional medical diagnosis. Always consult with qualified healthcare providers.
        </div>
      </div>
    </div>
  );
};

// Helper component for individual model results
const ModelResult = ({ title, icon, color, result, abnormalityTypes, getIcon, getColor, description }) => {
  const [showAllProbs, setShowAllProbs] = useState(false);

  return (
    <div>
      <div style={{
        backgroundColor: color + '10',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: `1px solid ${color}30`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
          <h3 style={{ margin: 0, color }}>{title}</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            fontSize: '2.5rem',
            backgroundColor: 'white',
            width: '70px',
            height: '70px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {getIcon(result.prediction)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Prediction</div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              textTransform: 'capitalize',
              marginBottom: '5px'
            }}>
              {result.prediction || 'Unknown'}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>
              {description(result.prediction)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Confidence</div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              color: getColor(result.confidence)
            }}>
              {(result.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {result.below_threshold && (
          <div style={{
            marginTop: '10px',
            padding: '8px',
            backgroundColor: '#ff9800',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            ⚠️ Confidence below threshold ({CONFIDENCE_THRESHOLD * 100}%). Result marked as 'unknown'.
          </div>
        )}

        {/* All Probabilities Toggle */}
        <div style={{ marginTop: '15px' }}>
          <button
            onClick={() => setShowAllProbs(!showAllProbs)}
            style={{
              background: 'none',
              border: 'none',
              color,
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {showAllProbs ? '▼' : '▶'} View all class probabilities
          </button>

          {showAllProbs && result.all_probabilities && (
            <div style={{
              marginTop: '10px',
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '8px'
            }}>
              {Object.entries(result.all_probabilities).map(([type, prob]) => (
                <div key={type} style={{ marginBottom: '8px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    marginBottom: '2px'
                  }}>
                    <span style={{ textTransform: 'capitalize' }}>{type}</span>
                    <span>{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${prob * 100}%`,
                      height: '100%',
                      backgroundColor: type === result.prediction ? '#4caf50' : color,
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EEGPrediction;
