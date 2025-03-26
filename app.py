import os
import sys
from util import *

from flask import Flask, request, render_template, jsonify
from gevent.pywsgi import WSGIServer

import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

import numpy as np


app = Flask(__name__)

MODEL_PATH = 'models/MobileNetV2-Final.h5'
model = load_model(MODEL_PATH)
print('Model loaded. Start serving...')
print('Model loaded. Check http://127.0.0.1:5000/')

classes = ['Alopecia Areata', 'Contact Dermatitis', 'Folliculitis', 'Head Lice', 'Lichen Planus',
           'Male Pattern Baldness', 'Psoriasis', 'Seborrheic Dermatitis', 'Telogen Effluvium', 'Tinea Capitis']

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


if __name__ == '__main__':
    http_server = WSGIServer(('0.0.0.0', 5000), app)
    http_server.serve_forever()
