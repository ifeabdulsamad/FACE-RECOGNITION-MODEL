# Face Recognition System

A web app that identifies individuals from uploaded photos using OpenCV and a trained SVM classifier.

![Python](https://img.shields.io/badge/Python-3.7+-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=flat-square&logo=opencv&logoColor=white)

## How It Works

Upload a photo → face detected via Haar Cascade → eyes validated → wavelet features extracted → SVM classifies the individual → confidence scores returned.

Currently recognises: **Elon Musk, Fisayo Fosudo, Jensen Huang, Mark Zuckerberg, Silas Adekunle.**

## Stack

- **Frontend** — HTML, CSS, Vanilla JS
- **Backend** — Python, Flask
- **CV / ML** — OpenCV, PyWavelets, scikit-learn (SVM)

## Setup

```bash
cd SERVER
pip install flask flask-cors opencv-python scikit-learn PyWavelets joblib numpy
python server.py
```

Then open `http://localhost:4000` in your browser.

## API

`POST /classify_image` — accepts a base64 image, returns predicted class + probability scores for each person.

`GET /health` — returns server status and known classes.

## Project Structure

```
FACE-REC/
├── FRONTEND/        # HTML/CSS/JS interface
├── SERVER/          # Flask API, OpenCV utils, trained model
└── MODEL/           # Training notebook and dataset
```

## Training

Add images to `MODEL/Dataset/<person_name>/`, run `MODEL/model.ipynb`, and the updated model saves to `SERVER/artifacts/`.
