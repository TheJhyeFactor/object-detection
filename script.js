let model;
let video;
let canvas;
let ctx;
let isDetecting = false;
let animationId;
let currentMode = 'webcam';
let detectionHistory = [];
let modelLoadStartTime;

let settings = {
    threshold: 0.5,
    showBoxes: true,
    showLabels: true,
    showConfidence: true,
    filters: {
        person: true,
        vehicle: true,
        animal: true,
        other: true
    }
};

let stats = {
    fps: 0,
    lastFrameTime: 0,
    frameCount: 0,
    fpsUpdateTime: 0,
    detectionTimes: [],
    totalDetections: 0
};

const categoryMap = {
    person: ['person'],
    vehicle: ['bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat'],
    animal: ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']
};

const colorMap = {
    person: '#FF6B6B',
    vehicle: '#4ECDC4',
    animal: '#45B7D1',
    other: '#667eea'
};

const elements = {
    video: document.getElementById('webcam'),
    uploadedImage: document.getElementById('uploaded-image'),
    canvas: document.getElementById('canvas'),
    loading: document.getElementById('loading'),
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    snapshotBtn: document.getElementById('snapshot-btn'),
    detectImageBtn: document.getElementById('detect-image-btn'),
    saveImageBtn: document.getElementById('save-image-btn'),
    webcamModeBtn: document.getElementById('webcam-mode-btn'),
    imageModeBtn: document.getElementById('image-mode-btn'),
    threshold: document.getElementById('threshold'),
    showBoxes: document.getElementById('show-boxes'),
    showLabels: document.getElementById('show-labels'),
    showConfidence: document.getElementById('show-confidence'),
    fps: document.getElementById('fps'),
    totalObjects: document.getElementById('total-objects'),
    uniqueObjects: document.getElementById('unique-objects'),
    avgConfidence: document.getElementById('avg-confidence'),
    objectList: document.getElementById('object-list'),
    avgDetectionTime: document.getElementById('avg-detection-time'),
    modelLoadTime: document.getElementById('model-load-time'),
    totalDetectionsEl: document.getElementById('total-detections'),
    historyGallery: document.getElementById('history-gallery')
};

function getObjectCategory(className) {
    for (const [category, objects] of Object.entries(categoryMap)) {
        if (objects.includes(className)) return category;
    }
    return 'other';
}

function getObjectColor(className) {
    const category = getObjectCategory(className);
    return colorMap[category];
}

function shouldFilterObject(className) {
    const category = getObjectCategory(className);
    return settings.filters[category];
}

async function loadModel() {
    try {
        modelLoadStartTime = performance.now();
        elements.loading.querySelector('p').textContent = 'Loading AI Model...';
        model = await cocoSsd.load();
        const loadTime = Math.round(performance.now() - modelLoadStartTime);
        elements.modelLoadTime.textContent = `${loadTime}ms`;
        elements.loading.classList.add('hidden');
        elements.startBtn.disabled = false;
        console.log('Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error);
        elements.loading.querySelector('p').textContent = 'Error loading model. Please refresh.';
    }
}

function switchMode(mode) {
    currentMode = mode;

    if (mode === 'webcam') {
        elements.webcamModeBtn.classList.add('active');
        elements.imageModeBtn.classList.remove('active');
        elements.video.style.display = 'block';
        elements.uploadedImage.style.display = 'none';
        elements.uploadZone.style.display = 'none';
        elements.startBtn.style.display = 'flex';
        elements.stopBtn.style.display = 'flex';
        elements.snapshotBtn.style.display = 'flex';
        elements.detectImageBtn.style.display = 'none';
        elements.saveImageBtn.style.display = 'none';
        elements.detectImageBtn.disabled = true;
        elements.saveImageBtn.disabled = true;
        stopDetection();
    } else {
        elements.webcamModeBtn.classList.remove('active');
        elements.imageModeBtn.classList.add('active');
        elements.video.style.display = 'none';
        elements.uploadedImage.style.display = 'none';
        elements.uploadZone.style.display = 'flex';
        elements.startBtn.style.display = 'none';
        elements.stopBtn.style.display = 'none';
        elements.snapshotBtn.style.display = 'none';
        elements.detectImageBtn.style.display = 'flex';
        elements.saveImageBtn.style.display = 'flex';
        elements.detectImageBtn.disabled = true;
        elements.saveImageBtn.disabled = true;
        stopDetection();
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        elements.uploadedImage.src = e.target.result;
        elements.uploadedImage.style.display = 'block';
        elements.uploadZone.style.display = 'none';
        elements.detectImageBtn.disabled = false;

        elements.uploadedImage.onload = () => {
            canvas.width = elements.uploadedImage.width;
            canvas.height = elements.uploadedImage.height;
            ctx = canvas.getContext('2d');
        };
    };
    reader.readAsDataURL(file);
}

async function detectOnImage() {
    if (!model || !elements.uploadedImage.src) return;

    const startTime = performance.now();
    const predictions = await model.detect(elements.uploadedImage);
    const detectionTime = Math.round(performance.now() - startTime);

    stats.detectionTimes.push(detectionTime);
    stats.totalDetections++;
    updatePerformanceMetrics();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const filteredPredictions = predictions.filter(p =>
        p.score >= settings.threshold && shouldFilterObject(p.class)
    );

    drawPredictions(filteredPredictions);
    updateStats(filteredPredictions);
    elements.saveImageBtn.disabled = false;
}

async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        elements.video.srcObject = stream;

        return new Promise((resolve) => {
            elements.video.onloadedmetadata = () => {
                elements.video.play();
                canvas = elements.canvas;
                canvas.width = elements.video.videoWidth;
                canvas.height = elements.video.videoHeight;
                ctx = canvas.getContext('2d');
                resolve();
            };
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Could not access camera. Please make sure you have granted camera permissions.');
    }
}

async function startDetection() {
    if (!model) {
        alert('Model not loaded yet. Please wait.');
        return;
    }

    await setupCamera();
    isDetecting = true;
    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.snapshotBtn.disabled = false;

    stats.lastFrameTime = performance.now();
    stats.fpsUpdateTime = performance.now();
    detectFrame();
}

function stopDetection() {
    isDetecting = false;

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    if (elements.video.srcObject) {
        elements.video.srcObject.getTracks().forEach(track => track.stop());
        elements.video.srcObject = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.snapshotBtn.disabled = true;
}

async function detectFrame() {
    if (!isDetecting) return;

    const startTime = performance.now();
    const predictions = await model.detect(elements.video);
    const detectionTime = Math.round(performance.now() - startTime);

    stats.detectionTimes.push(detectionTime);
    if (stats.detectionTimes.length > 30) stats.detectionTimes.shift();
    stats.totalDetections++;

    updatePerformanceMetrics();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const filteredPredictions = predictions.filter(p =>
        p.score >= settings.threshold && shouldFilterObject(p.class)
    );

    drawPredictions(filteredPredictions);
    updateStats(filteredPredictions);

    updateFPS();

    animationId = requestAnimationFrame(detectFrame);
}

function drawPredictions(predictions) {
    predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const color = getObjectColor(prediction.class);

        if (settings.showBoxes) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(x, y, width, height);
            ctx.globalAlpha = 1.0;
        }

        if (settings.showLabels || settings.showConfidence) {
            let labelText = '';
            if (settings.showLabels) {
                labelText = prediction.class;
            }
            if (settings.showConfidence) {
                const confidence = Math.round(prediction.score * 100);
                labelText += settings.showLabels ? ` ${confidence}%` : `${confidence}%`;
            }

            ctx.fillStyle = color;
            ctx.font = 'bold 16px Arial';
            const textWidth = ctx.measureText(labelText).width;
            const textHeight = 20;

            ctx.fillRect(x, y - textHeight - 4, textWidth + 10, textHeight + 4);

            ctx.fillStyle = 'white';
            ctx.fillText(labelText, x + 5, y - 8);
        }
    });
}

function updateStats(predictions) {
    elements.totalObjects.textContent = predictions.length;

    const objectCounts = {};
    predictions.forEach(p => {
        objectCounts[p.class] = (objectCounts[p.class] || 0) + 1;
    });

    elements.uniqueObjects.textContent = Object.keys(objectCounts).length;

    if (predictions.length > 0) {
        const avgConf = predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length;
        elements.avgConfidence.textContent = Math.round(avgConf * 100) + '%';
    } else {
        elements.avgConfidence.textContent = '0%';
    }

    updateObjectList(objectCounts);
}

function updateObjectList(objectCounts) {
    if (Object.keys(objectCounts).length === 0) {
        elements.objectList.innerHTML = '<p class="empty-state">No objects detected yet</p>';
        return;
    }

    const sortedObjects = Object.entries(objectCounts)
        .sort((a, b) => b[1] - a[1]);

    elements.objectList.innerHTML = sortedObjects
        .map(([name, count]) => `
            <div class="object-item">
                <span class="object-name">${name}</span>
                <span class="object-count">${count}</span>
            </div>
        `)
        .join('');
}

function updatePerformanceMetrics() {
    if (stats.detectionTimes.length > 0) {
        const avgTime = Math.round(
            stats.detectionTimes.reduce((a, b) => a + b, 0) / stats.detectionTimes.length
        );
        elements.avgDetectionTime.textContent = `${avgTime}ms`;
    }
    elements.totalDetectionsEl.textContent = stats.totalDetections;
}

function updateFPS() {
    const now = performance.now();
    stats.frameCount++;

    if (now - stats.fpsUpdateTime >= 1000) {
        stats.fps = Math.round(stats.frameCount * 1000 / (now - stats.fpsUpdateTime));
        elements.fps.textContent = stats.fps;
        stats.frameCount = 0;
        stats.fpsUpdateTime = now;
    }

    stats.lastFrameTime = now;
}

function takeSnapshot() {
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = canvas.width;
    snapshotCanvas.height = canvas.height;
    const snapshotCtx = snapshotCanvas.getContext('2d');

    if (currentMode === 'webcam') {
        snapshotCtx.drawImage(elements.video, 0, 0);
    } else {
        snapshotCtx.drawImage(elements.uploadedImage, 0, 0);
    }
    snapshotCtx.drawImage(canvas, 0, 0);

    snapshotCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);

        detectionHistory.push({
            url: url,
            timestamp: Date.now()
        });

        if (detectionHistory.length > 12) {
            URL.revokeObjectURL(detectionHistory[0].url);
            detectionHistory.shift();
        }

        updateHistoryGallery();

        const link = document.createElement('a');
        link.href = url;
        link.download = `detection-${Date.now()}.png`;
        link.click();
    });
}

function saveImageResult() {
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = canvas.width;
    snapshotCanvas.height = canvas.height;
    const snapshotCtx = snapshotCanvas.getContext('2d');

    snapshotCtx.drawImage(elements.uploadedImage, 0, 0);
    snapshotCtx.drawImage(canvas, 0, 0);

    snapshotCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);

        detectionHistory.push({
            url: url,
            timestamp: Date.now()
        });

        if (detectionHistory.length > 12) {
            URL.revokeObjectURL(detectionHistory[0].url);
            detectionHistory.shift();
        }

        updateHistoryGallery();

        const link = document.createElement('a');
        link.href = url;
        link.download = `detection-${Date.now()}.png`;
        link.click();
    });
}

function updateHistoryGallery() {
    if (detectionHistory.length === 0) {
        elements.historyGallery.innerHTML = '<p class="empty-state">No snapshots yet</p>';
        return;
    }

    elements.historyGallery.innerHTML = detectionHistory
        .map((item, index) => `
            <div class="history-item" data-index="${index}">
                <img src="${item.url}" alt="Detection snapshot">
                <button class="delete-btn" onclick="deleteHistoryItem(${index})">✕</button>
            </div>
        `)
        .join('');
}

window.deleteHistoryItem = function(index) {
    URL.revokeObjectURL(detectionHistory[index].url);
    detectionHistory.splice(index, 1);
    updateHistoryGallery();
}

elements.webcamModeBtn.addEventListener('click', () => switchMode('webcam'));
elements.imageModeBtn.addEventListener('click', () => switchMode('image'));

elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
    }
});

elements.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.add('drag-over');
});

elements.uploadZone.addEventListener('dragleave', () => {
    elements.uploadZone.classList.remove('drag-over');
});

elements.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files[0]);
    }
});

elements.detectImageBtn.addEventListener('click', detectOnImage);
elements.saveImageBtn.addEventListener('click', saveImageResult);
elements.startBtn.addEventListener('click', startDetection);
elements.stopBtn.addEventListener('click', stopDetection);
elements.snapshotBtn.addEventListener('click', takeSnapshot);

elements.threshold.addEventListener('input', (e) => {
    settings.threshold = parseFloat(e.target.value);
    document.getElementById('threshold-val').textContent = settings.threshold.toFixed(1);
});

elements.showBoxes.addEventListener('change', (e) => {
    settings.showBoxes = e.target.checked;
});

elements.showLabels.addEventListener('change', (e) => {
    settings.showLabels = e.target.checked;
});

elements.showConfidence.addEventListener('change', (e) => {
    settings.showConfidence = e.target.checked;
});

document.querySelectorAll('.filter-check').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        settings.filters[e.target.value] = e.target.checked;
    });
});

window.addEventListener('beforeunload', () => {
    if (isDetecting) {
        stopDetection();
    }
});

canvas = elements.canvas;
ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;

loadModel();
