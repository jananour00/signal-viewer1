"""
Vercel entrypoint for Flask backend
"""
import sys
import os

# Add the project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import from the app package
from app import create_app

# Create the WSGI app for Vercel
app = create_app()
