// === DOM References ===
const galleryGrid = document.getElementById('galleryGrid');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const dropZone = document.getElementById('dropZone');
const uploadResultBtn = document.getElementById('uploadResultBtn');

const galleryView = document.getElementById('galleryView');
const resultView = document.getElementById('resultView');
const cameraModal = document.getElementById('cameraModal');
const loadingOverlay = document.getElementById('loadingOverlay');

const previewImage = document.getElementById('previewImage');
const predictedName = document.getElementById('predictedName');
const confidenceBadge = document.getElementById('confidenceBadge');
const matchBarFill = document.getElementById('matchBarFill');
const matchScoreText = document.getElementById('matchScoreText');
const probabilityBars = document.getElementById('probabilityBars');
const matchedAvatar = document.getElementById('matchedAvatar');

const backBtn = document.getElementById('backBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const video = document.getElementById('video');

// === State ===
let knownPeople = [];
let currentStream = null;
let currentFacingMode = 'user';

// Image mapping for person cards
const personImages = {
    'elon musk': './img/elon musk.jpg',
    'fisayo_fosudo': './img/fisayo_fosudo.png',
    'jensen huang': './img/jensen huang.jpg',
    'mark zuckerberg': './img/mark zuckerberg.jpg',
    'silas adekunle': './img/silas adekunle.png'
};

// === API Config ===
const API_URL = 'http://localhost:4000';

function initials(name) {
    return name.split(' ').map(w => w.charAt(0).toUpperCase()).join('');
}

async function loadKnownPeople() {
    try {
        const resp = await fetch(`${API_URL}/health`);
        const data = await resp.json();
        knownPeople = data.classes || [];
    } catch (e) {
        knownPeople = ['elon musk', 'fisayo_fosudo', 'jensen huang', 'mark zuckerberg', 'silas adekunle'];
    }
    renderGallery();
}

function renderGallery() {
    galleryGrid.innerHTML = '';
    knownPeople.forEach(name => {
        const card = document.createElement('div');
        card.className = 'person-card';
        const imageUrl = personImages[name] || './img/elon musk.jpg';
        card.innerHTML = `
            <div class="person-card-image-wrapper">
                <img src="${imageUrl}" alt="${name}" />
                <div class="checkmark-badge">✓</div>
            </div>
            <div class="person-card-info">
                <div class="person-name">${name}</div>
            </div>
        `;
        card.addEventListener('click', () => triggerUpload());
        galleryGrid.appendChild(card);
    });
}

// === Avatar: shows initials only — guaranteed to match the name ===
function setAvatar(name) {
    matchedAvatar.innerHTML = `<span class="avatar-initials">${initials(name)}</span>`;
    matchedAvatar.style.backgroundImage = 'none';
}

// === File Upload ===
function triggerUpload() { fileInput.click(); }

selectFileBtn.addEventListener('click', triggerUpload);
uploadResultBtn.addEventListener('click', triggerUpload);
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            closeCamera();
            processImage(event.target.result);
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// === Drag and Drop ===
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            closeCamera();
            processImage(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// === Camera ===
function openCamera() {
    cameraModal.classList.remove('hidden');
    startCamera(currentFacingMode);
}

async function startCamera(facingMode) {
    stopCamera();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        currentStream = stream;
        video.srcObject = stream;
        await video.play();
    } catch (err) {
        alert('Unable to access camera. Please check permissions or upload a photo instead.');
        closeCamera();
        triggerUpload();
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
    }
    video.srcObject = null;
}

function closeCamera() {
    stopCamera();
    cameraModal.classList.add('hidden');
}

closeCameraBtn.addEventListener('click', closeCamera);

switchCameraBtn.addEventListener('click', async () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await startCamera(currentFacingMode);
});

captureBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    closeCamera();
    processImage(canvas.toDataURL('image/jpeg', 0.9));
});

// === Process Image ===
async function processImage(imageData) {
    showLoading();
    previewImage.src = imageData;
    try {
        const resp = await fetch(`${API_URL}/classify_image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: imageData }),
        });
        if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
        const results = await resp.json();
        hideLoading();
        displayResults(results, imageData);
    } catch (error) {
        hideLoading();
        alert('Error connecting to server. Make sure the Flask server is running.');
        goHome();
    }
}

function displayResults(results, imageData) {
    if (!results || results.length === 0) {
        alert('No face detected. Please try a different photo.');
        goHome();
        return;
    }

    const r = results[0];
    const probs = r.class_probability;
    const cls = r.class_dictionary;

    // === Derive the name from the highest score ===
    // Build a list of {name, probability} using class_dictionary indices
    const allScores = Object.keys(cls).map(n => ({ n, p: probs[cls[n]] }));
    // Sort by probability descending — the top entry IS the predicted person
    const sorted = allScores.sort((a, b) => b.p - a.p);
    const topMatch = sorted[0];
    const predicted = topMatch.n;
    const predictedProb = topMatch.p;

    galleryView.classList.add('hidden');
    resultView.classList.remove('hidden');

    previewImage.src = imageData;

    // === Name comes from the highest score, avatar matches that name ===
    predictedName.textContent = predicted;
    setAvatar(predicted);

    // Badge based on the top score
    let bc = 'low', bt = 'Low Confidence';
    if (predictedProb >= 80) { bc = 'high'; bt = 'High Confidence'; }
    else if (predictedProb >= 50) { bc = 'medium'; bt = 'Medium Confidence'; }
    confidenceBadge.className = `confidence-badge ${bc}`;
    confidenceBadge.textContent = bt;

    matchScoreText.textContent = `${predictedProb.toFixed(1)}%`;
    setTimeout(() => { matchBarFill.style.width = `${Math.max(predictedProb, 2)}%`; }, 100);

    probabilityBars.innerHTML = '';
    sorted.forEach(item => {
        const top = item.n === predicted;
        probabilityBars.innerHTML += `
            <div class="prob-bar-item">
                <span class="prob-bar-label">${item.n}</span>
                <div class="prob-bar-track">
                    <div class="prob-bar-fill ${top ? 'highlight' : ''}" style="width:${Math.max(item.p, 2)}%"></div>
                </div>
                <span class="prob-bar-value">${item.p.toFixed(1)}%</span>
            </div>
        `;
    });
}

function goHome() {
    resultView.classList.add('hidden');
    galleryView.classList.remove('hidden');
    hideLoading();
}

backBtn.addEventListener('click', goHome);
tryAgainBtn.addEventListener('click', goHome);

function showLoading() { loadingOverlay.classList.remove('hidden'); }
function hideLoading() { loadingOverlay.classList.add('hidden'); }

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!cameraModal.classList.contains('hidden')) closeCamera();
        else if (!resultView.classList.contains('hidden')) goHome();
    }
});

loadKnownPeople();