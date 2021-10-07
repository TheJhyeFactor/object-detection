# Real-Time Object Detection

AI-powered object detection using TensorFlow.js and COCO-SSD model. Detects and identifies 80+ common objects in real-time through your webcam.

## Features

### Real-Time Detection
- Live webcam object detection
- Bounding boxes around detected objects
- Labels with confidence scores
- 80+ object categories supported
- FPS counter for performance monitoring

### Interactive Controls
- Start/stop camera
- Take snapshots with detections
- Adjustable confidence threshold
- Toggle bounding boxes, labels, and confidence scores

### Statistics Dashboard
- Total objects detected
- Unique object types
- Average confidence score
- Live object counter by category
- Real-time FPS display

### Detected Object Categories
Person, bicycle, car, motorcycle, airplane, bus, train, truck, boat, traffic light, fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee, skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard, tennis racket, bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, chair, couch, potted plant, bed, dining table, toilet, tv, laptop, mouse, remote, keyboard, cell phone, microwave, oven, toaster, sink, refrigerator, book, clock, vase, scissors, teddy bear, hair drier, toothbrush.

## How to Use

1. **Allow Camera Access**: Click "Start Camera" and grant camera permissions
2. **Adjust Threshold**: Use the slider to set minimum confidence level (0.1 - 0.9)
3. **Customize Display**: Toggle bounding boxes, labels, and confidence scores
4. **Take Snapshots**: Click snapshot to download an image with detections
5. **Monitor Stats**: View real-time detection statistics and FPS

## Technology Stack

- **TensorFlow.js** - Machine learning framework for browser
- **COCO-SSD** - Pre-trained object detection model
- **Web APIs**: MediaDevices (webcam), Canvas (rendering)
- **Vanilla JavaScript** - No framework dependencies
- **HTML5 Canvas** - For drawing bounding boxes and overlays

## Privacy

All processing happens **100% in your browser**. No images or video are sent to any server. The AI model runs entirely on your device using TensorFlow.js.

## Performance

- Target: 15-30 FPS on modern devices
- GPU acceleration when available (WebGL)
- Optimized for real-time performance
- Mobile browser compatible

## Running Locally

Simply open `index.html` in a modern browser. Requires:
- Modern browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- Internet connection (for loading TensorFlow.js CDN on first load)

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 14.5+)
- Requires HTTPS for camera access (or localhost)

## Model Information

**COCO-SSD** (Common Objects in Context - Single Shot Detector)
- Pre-trained on COCO dataset
- 80 object categories
- Real-time inference
- Accuracy: ~25% mAP (mean Average Precision)
- Model size: ~13MB

## Credits

Built with TensorFlow.js and the COCO-SSD model developed by Google.
