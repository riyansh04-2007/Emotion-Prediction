// DOM Elements
const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const charCount = document.getElementById('charCount');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('resultsSection');
const errorMessage = document.getElementById('errorMessage');

// Emotion emoji mapping
const emotionEmojis = {
    'sadness': '😢',
    'joy': '😄',
    'love': '❤️',
    'anger': '😠',
    'fear': '😨',
    'surprise': '😲'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    analyzeBtn.addEventListener('click', analyzeEmotion);
    resetBtn.addEventListener('click', resetForm);
    textInput.addEventListener('input', updateCharCount);
});

// Update character count
function updateCharCount() {
    charCount.textContent = textInput.value.length;
}

// Main analyze function
async function analyzeEmotion() {
    const text = textInput.value.trim();

    // Validation
    if (!text) {
        showError('Please enter some text to analyze');
        return;
    }

    if (text.length < 3) {
        showError('Please enter at least 3 characters');
        return;
    }

    // Show loading state
    analyzeBtn.disabled = true;
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    errorMessage.classList.add('hidden');

    try {
        // Make API call
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data);

    } catch (error) {
        showError(`Error: ${error.message}. Please try again.`);
        console.error('Error:', error);
    } finally {
        analyzeBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
    }
}

// Display results
function displayResults(data) {
    const { predicted_emotion, confidence, all_probabilities } = data;

    // Update primary emotion
    document.getElementById('emotionEmoji').textContent = emotionEmojis[predicted_emotion];
    document.getElementById('emotionName').textContent = predicted_emotion.charAt(0).toUpperCase() + predicted_emotion.slice(1);
    
    const confidencePercent = Math.round(confidence * 100);
    document.getElementById('confidenceScore').textContent = `${confidencePercent}%`;
    
    // Update confidence bar with animation
    const confidenceBar = document.getElementById('confidenceBar');
    confidenceBar.style.width = '0%';
    setTimeout(() => {
        confidenceBar.style.width = `${confidencePercent}%`;
    }, 100);

    // Update all emotion probabilities
    Object.entries(all_probabilities).forEach(([emotion, probability]) => {
        const percent = Math.round(probability * 100);
        const barElement = document.getElementById(`bar-${emotion}`);
        const valueElement = document.getElementById(`val-${emotion}`);
        
        barElement.style.width = '0%';
        valueElement.textContent = `${percent}%`;
        
        // Stagger animation
        setTimeout(() => {
            barElement.style.width = `${percent}%`;
        }, 100);
    });

    // Display analyzed text
    document.getElementById('analyzedTextDisplay').textContent = data.text;

    // Show results
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Reset form
function resetForm() {
    textInput.value = '';
    charCount.textContent = '0';
    resultsSection.classList.add('hidden');
    errorMessage.classList.add('hidden');
    textInput.focus();
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Allow Enter key to analyze (Shift+Enter for new line)
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        analyzeEmotion();
    }
});
