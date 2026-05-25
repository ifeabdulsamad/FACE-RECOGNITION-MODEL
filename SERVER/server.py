from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import util
import os

app = Flask(__name__, static_folder='../FRONTEND', static_url_path='')
CORS(app)  # Enable CORS for all routes

@app.route('/classify_image', methods=['POST'])
def classify_image():
    data = request.get_json()
    
    if data is None:
        return jsonify({'error': 'Invalid JSON or Content-Type header missing'}), 400
    
    image_data = data.get('image_data')
    
    if not image_data:
        return jsonify({'error': 'No image_data provided'}), 400

    result = util.classify_image(image_data, None)
    response = jsonify(result)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'classes': util.get_class_names()})

# Serve frontend
@app.route('/')
def serve_frontend():
    return send_from_directory('../FRONTEND', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../FRONTEND', path)

if __name__ == "__main__":
    print("Starting Python Flask Server For Face Recognition")
    util.load_saved_artifacts()
    app.run(port=4000, debug=True)
