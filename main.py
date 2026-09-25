from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer
from fastapi import FastAPI
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
from keras.models import load_model
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from http.client import HTTPException
import re
import pickle
import numpy as np



# Constants:

model_path = "Artifacts/BiGRU_Model.keras"

tokenizer_path = "Artifacts/tokenizer.pkl"

max_sequence_length = 50

emotion_labels = ['sadness','joy','love','anger','fear','surprise']

EMOTION_EMOJIS = {
    "sadness": "😢",
    "joy": "😄",
    "love": "❤️",
    "anger": "😠",
    "fear": "😨",
    "surprise": "😲",
}   


# Preprocessing the text
def preprocess_text(text: str)->str:
    text = text.lower()
    text = re.sub(r"'","",text)
    text = re.sub(r"[^a-z0-9\s]"," ",text)
    text = re.sub(r"\s+"," ",text).strip()               
    return text


# Request and Response Schemas
# A. Text input -> Input schema(text) sent by the user.
class TextInput(BaseModel):
    text : str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The sentence to analyze: ",
        json_schema_extra={"exampe": "I feel so happy and excited"}
    )


# B. Predictive Response -> Output schema the emotion to predict.
class PredictionResponse(BaseModel):
    text : str
    predicted_emotion : str
    confidence : float
    all_probabilities : dict[str, float]

class HealthResponse(BaseModel):
    status : str
    model_loaded : bool


# Model Loading and LifeSpan Management
# Loading the model and tokenizer once the server starts

dl_model = {}
@asynccontextmanager
async def lifeSpan(app: FastAPI):
    print("Loading the model and tokenizer")
    dl_model["BiGRU"] = load_model(model_path)
    with open(tokenizer_path, 'rb') as file:
        dl_model["Tokenizer"] = pickle.load(file)
    print("Models loaded successfully")

    yield
    dl_model.clear()

app = FastAPI(
    lifespan=lifeSpan
)

# Mount the static files to the FastAPI app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.mount('/static',StaticFiles(directory="static"),name="static")



# API Endpoints
# A. Server UI Homepage('/)
@app.get('/', include_in_schema=False)
def server_ui():
    return FileResponse('static/index.html')

# B. Health check endpoint(checking if API is working fine or not)
@app.get('/health',response_model=HealthResponse)
def health_check():
    return HealthResponse(status="Server is running", model_loaded=bool(dl_model))

# C. Predict Emotion Endpoint
@app.post('/predict',response_model=PredictionResponse)
def predict_emotion(text_input: TextInput):
    BiGRU_model = dl_model.get("BiGRU")
    tokenizer_model = dl_model.get("Tokenizer")

    if BiGRU_model is None or tokenizer_model is None:
        return HTTPException(status_code=503, detail="Model is not loaded successfully")

    cleaned_text = preprocess_text(text_input.text)

    tokenizer=Tokenizer()
    tokenized_text =tokenizer_model.texts_to_sequences([cleaned_text])
    padded_text=pad_sequences(
        tokenized_text,
        maxlen=max_sequence_length,
        padding='post',
        truncating='post'
    )

    probabilities = BiGRU_model.predict(padded_text)[0]
    top_emotion_index = int(np.argmax(probabilities))
    all_probabilities = {
        label : float(prob) for prob, label in zip(probabilities,emotion_labels)
    }

    return PredictionResponse(
        text = text_input.text,
        predicted_emotion=emotion_labels[top_emotion_index],
        confidence=float(probabilities[top_emotion_index]),
        all_probabilities=all_probabilities
    )