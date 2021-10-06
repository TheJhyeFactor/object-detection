let model;
let video;
let canvas;
let ctx;
let isDetecting = false;
let animationId;

let settings = {
    threshold: 0.5,
    showBoxes: true,
    showLabels: true,
    showConfidence: true
};

let stats = {
    fps: 0,
    lastFrameTime: 0,
    frameCount: 0,
    fpsUpdateTime: 0
};

const elements = {
    video: document.getElementById('webcam'),
    canvas: document.getElementById('canvas'),
    loading: document.getElementById('loading'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    snapshotBtn: document.getElementById('snapshot-btn'),
    threshold: document.getElementById('threshold'),
    showBoxes: document.getElementById('show-boxes'),
    showLabels: document.getElementById('show-labels'),
    showConfidence: document.getElementById('show-confidence'),
    fps: document.getElementById('fps'),
    totalObjects: document.getElementById('total-objects'),
    uniqueObjects: document.getElementById('unique-objects'),
    avgConfidence: document.getElementById('avg-confidence'),
    objectList: document.getElementById('object-list')
};

async function loadModel() {
    try {
        elements.loading.querySelector('p').textContent = 'Loading AI Model...';
        model = await cocoSsd.load();
        elements.loading.classList.add('hidden');
        elements.startBtn.disabled = false;
        console.log('Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error);
        elements.loading.querySelector('p').textContent = 'Error loading model. Please refresh.';
    }
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

    const predictions = await model.detect(elements.video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const filteredPredictions = predictions.filter(p => p.score >= settings.threshold);

    drawPredictions(filteredPredictions);
    updateStats(filteredPredictions);

    updateFPS();

    animationId = requestAnimationFrame(detectFrame);
}

function drawPredictions(predictions) {
    predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;

        const colors = {
            'person': '#FF6B6B',
            'car': '#4ECDC4',
            'dog': '#45B7D1',
            'cat': '#FFA07A',
            'bicycle': '#98D8C8',
            'motorcycle': '#F7DC6F',
            'default': '#667eea'
        };

        const color = colors[prediction.class] || colors.default;

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

    snapshotCtx.drawImage(elements.video, 0, 0);
    snapshotCtx.drawImage(canvas, 0, 0);

    snapshotCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `detection-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

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

window.addEventListener('beforeunload', () => {
    if (isDetecting) {
        stopDetection();
    }
});

loadModel();
