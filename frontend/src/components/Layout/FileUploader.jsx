import React, { useState, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';

const FileUploader = forwardRef(({ onDataLoaded, signalType }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Simplified extensions - just the core formats
  const acceptedExtensions = {
    medical: ['.edf', '.csv', '.mat'],
    acoustic: ['.wav', '.mp3'],
    stock: ['.csv', '.xlsx'],
    microbiome: ['.biom', '.fasta', '.tsv']
  };

  // File size limits (in MB)
  const sizeLimits = {
    medical: 500,    // 500MB for medical signals
    acoustic: 200,   // 200MB for audio files
    stock: 100,      // 100MB for stock data
    microbiome: 500  // 500MB for genomic data
  };

  const getFileIcon = (ext) => {
    const iconMap = {
      // Medical
      edf: '🫀', csv: '📊', mat: '📐',
      // Audio
      wav: '🎵', mp3: '🎶',
      // Stock
      xlsx: '📗',
      // Microbiome
      biom: '🧬', fasta: '🧫', tsv: '📋'
    };
    return iconMap[ext.replace('.', '')] || '📄';
  };

  const uploadFile = async (file) => {
    // Check file size
    const maxSize = sizeLimits[signalType] * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Max size: ${sizeLimits[signalType]}MB`);
      return;
    }

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', signalType);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });
      
      onDataLoaded(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    uploadFile
  }));

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="file-uploader" style={{
      border: '2px dashed #ccc',
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center',
      marginBottom: '20px',
      transition: 'all 0.3s ease',
      backgroundColor: uploading ? '#f5f5f5' : 'white'
    }}>
      <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span>📤</span> Upload {signalType.charAt(0).toUpperCase() + signalType.slice(1)} Signal
      </h3>
      
      <input
        type="file"
        id="file-input"
        onChange={handleFileChange}
        accept={acceptedExtensions[signalType].join(',')}
        style={{ display: 'none' }}
      />
      
      <button 
        onClick={() => document.getElementById('file-input').click()}
        disabled={uploading}
        style={{
          padding: '12px 24px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.5 : 1,
          fontSize: '1rem',
          fontWeight: 'bold',
          marginBottom: '15px',
          transition: 'all 0.3s ease'
        }}
      >
        {uploading ? '⏳ Uploading...' : '📁 Choose File'}
      </button>
      
      {uploading && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#4CAF50',
              animation: 'progress 1.5s ease-in-out infinite'
            }} />
          </div>
          <p style={{ marginTop: '5px', color: '#666' }}>Processing file...</p>
        </div>
      )}
      
      {error && (
        <div style={{ 
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '0.9rem'
        }}>
          ❌ {error}
        </div>
      )}
      
      {/* Supported formats */}
      <div style={{ marginTop: '15px' }}>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
          <strong>Supported formats:</strong>
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center'
        }}>
          {acceptedExtensions[signalType].map(ext => (
            <span
              key={ext}
              style={{
                padding: '4px 12px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                border: '1px solid #1976d2',
                borderRadius: '16px',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{getFileIcon(ext)}</span>
              <span>{ext}</span>
            </span>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
        Max file size: {sizeLimits[signalType]}MB
      </p>

      <style>
        {`
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
});

export default FileUploader;
