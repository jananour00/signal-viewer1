from flask import Blueprint, request, jsonify
import time

acoustic_bp = Blueprint('acoustic', __name__)

# Sample acoustic measurements
acoustic_measurements = []

@acoustic_bp.route('/', methods=['GET'])
def get_measurements():
    """Get all acoustic measurements"""
    return jsonify({
        'measurements': acoustic_measurements,
        'count': len(acoustic_measurements)
    })

@acoustic_bp.route('/', methods=['POST'])
def create_measurement():
    """Create a new acoustic measurement"""
    data = request.get_json()
    
    if not data or 'frequency' not in data or 'amplitude' not in data:
        return jsonify({'error': 'Missing required fields: frequency, amplitude'}), 400
    
    new_measurement = {
        'id': len(acoustic_measurements),
        'frequency': data['frequency'],
        'amplitude': data['amplitude'],
        'duration': data.get('duration', 0),
        'timestamp': time.time(),
        'notes': data.get('notes', '')
    }
    
    acoustic_measurements.append(new_measurement)
    return jsonify(new_measurement), 201

@acoustic_bp.route('/analyze', methods=['POST'])
def analyze_sound():
    """Analyze sound data"""
    data = request.get_json()
    
    if not data or 'frequencies' not in data:
        return jsonify({'error': 'Missing frequencies data'}), 400
    
    frequencies = data['frequencies']
    
    # Simple analysis example
    analysis = {
        'mean_frequency': sum(frequencies) / len(frequencies) if frequencies else 0,
        'max_frequency': max(frequencies) if frequencies else 0,
        'min_frequency': min(frequencies) if frequencies else 0,
        'frequency_range': max(frequencies) - min(frequencies) if frequencies else 0
    }
    
    return jsonify(analysis)

@acoustic_bp.route('/<int:measurement_id>', methods=['DELETE'])
def delete_measurement(measurement_id):
    """Delete an acoustic measurement"""
    if 0 <= measurement_id < len(acoustic_measurements):
        deleted = acoustic_measurements.pop(measurement_id)
        return jsonify({'message': 'Measurement deleted', 'measurement': deleted})
    return jsonify({'error': 'Measurement not found'}), 404
