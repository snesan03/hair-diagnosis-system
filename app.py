import os
import sys
import requests
from util import *
from flask import Flask, request, render_template, jsonify
from gevent.pywsgi import WSGIServer
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np

app = Flask(__name__)

# Load your skin disease classification model
MODEL_PATH = 'models/MobileNetV2-Final.h5'
model = load_model(MODEL_PATH)
print('Model loaded. Start serving...')
print('Model loaded. Check http://127.0.0.1:5000/')

classes = ['Alopecia Areata', 'Contact Dermatitis', 'Folliculitis', 'Head Lice', 'Lichen Planus',
           'Male Pattern Baldness', 'Psoriasis', 'Seborrheic Dermatitis', 'Telogen Effluvium', 'Tinea Capitis']

# OpenRouter API Configuration
API_KEY = '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'  # Replace with your actual OpenRouter API key
API_URL = 'https://openrouter.ai/api/v1/chat/completions'
headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

def model_predict(img, model):
    img = img.resize((224, 224))
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = x / 255.0
    preds = model.predict(x)
    return preds

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

def get_recommendation(disease):
    recommendations = {
        'Alopecia Areata': "Consider consulting a dermatologist for appropriate treatment options.",
        'Contact Dermatitis': "Avoid contact with the allergen or irritant that caused the reaction. Use mild soaps and moisturizers.",
        'Folliculitis': "Practice good hygiene, keep the affected area clean and dry. Avoid shaving until the condition improves.",
        'Head Lice': "Use over-the-counter or prescription treatments specifically designed to kill lice and their eggs.",
        'Lichen Planus': "Consult a dermatologist for treatment options. Avoid scratching the affected area to prevent infection.",
        'Male Pattern Baldness': "Consider consulting a dermatologist or hair specialist for treatment options such as minoxidil or hair transplants.",
        'Psoriasis': "Consult a dermatologist for appropriate treatment options, which may include topical treatments, phototherapy, or systemic medications.",
        'Seborrheic Dermatitis': "Use medicated shampoos containing ingredients like ketoconazole or coal tar. Avoid harsh hair products.",
        'Telogen Effluvium': "Identify and address any underlying causes such as stress, hormonal changes, or nutritional deficiencies. Ensure a balanced diet.",
        'Tinea Capitis': "Consult a healthcare professional for antifungal treatment options, which may include oral medications or medicated shampoos."
    }
    return recommendations.get(disease, "No specific recommendation available for this condition.")

@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        img = base64_to_pil(request.json)
        preds = model_predict(img, model)
        predicted_class_index = np.argmax(preds)
        confidence = float(preds[0][predicted_class_index])
        predicted_class = classes[predicted_class_index]
        recommendation = get_recommendation(predicted_class)

        result = {
            "result": predicted_class,
            "probability": confidence,
            "recommendation": recommendation
        }

        return jsonify(result)
    return None

@app.route('/chat', methods=['POST'])
def chat():
    try:
        print("Received chat request")  # Debug print
        
        if not request.is_json:
            print("Invalid request format")
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        print(f"Request Data: {data}")  # Debug print
        
        user_message = data.get('message', '').strip()
        disease_context = data.get('disease_context', '').strip()
        
        if not user_message:
            print("Empty message received")
            return jsonify({"error": "Empty message"}), 400

        prompt = f"The user asks about {disease_context or 'a skin condition'}: {user_message}. Give a short, clear answer."

        print("Sending request to DeepSeek API via OpenRouter...")  # Debug print
        
        payload = {
            "model": "deepseek/deepseek-chat:free",
            "messages": [{"role": "user", "content": prompt}]
        }
        
        response = requests.post(API_URL, json=payload, headers=headers)
        
        if response.status_code != 200:
            print(f"DeepSeek API error: {response.status_code} {response.text}")
            return jsonify({"error": "Failed to fetch response from DeepSeek API"}), response.status_code
        
        response_data = response.json()
        print("Response received from DeepSeek API")  # Debug print
        print(response_data)  # Log the full response
        
        return jsonify({
            "response": response_data.get('choices', [{}])[0].get('message', {}).get('content', "No response"),
            "model": "deepseek-chat",
            "created_at": response_data.get('created', "Unknown")
        })
        
    except Exception as e:
        print(f"Error: {e}")  # Log the error
        return jsonify({"error": str(e), "type": type(e).__name__}), 500

if __name__ == '__main__':
    http_server = WSGIServer(('0.0.0.0', 5000), app)
    http_server.serve_forever()