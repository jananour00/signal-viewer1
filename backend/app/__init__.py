from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import os

socketio = SocketIO(cors_allowed_origins="*",async_mode='threading')

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
    
    # Allow all origins for Vercel deployment
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register blueprints
    from .routes.medical_routes import medical_bp
    from .routes.acoustic_routes import acoustic_bp
    from .routes.upload_routes import upload_bp
    from .routes.stock_routes import stock_bp
    from .routes.microbiome_routes import microbiome_bp
    
    app.register_blueprint(medical_bp, url_prefix='/api/medical')
    app.register_blueprint(acoustic_bp, url_prefix='/api/acoustic')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(stock_bp, url_prefix='/api/stock')
    app.register_blueprint(microbiome_bp, url_prefix='/api/microbiome')
    
    @app.route('/')
    def index():
        return jsonify({"message": "Signal Viewer API is running!"})
    
    @app.route('/api/test')
    def api_test():
        return jsonify({"message": "API is working!"})
    
    socketio.init_app(app)
    
    return app
