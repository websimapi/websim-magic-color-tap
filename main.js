// Utils
const room = new WebsimSocket();

// Optimized Flood Fill with Visited Tracking and Loop Prevention
function floodFill(displayData, referenceData, startX, startY, width, height) {
    const startIdx = (startY * width + startX) * 4;
    
    // Colors
    const startR = displayData[startIdx];
    const startG = displayData[startIdx + 1];
    const startB = displayData[startIdx + 2];

    const targetR = referenceData[startIdx];
    const targetG = referenceData[startIdx + 1];
    const targetB = referenceData[startIdx + 2];

    // 1. Boundary Check: If clicked pixel is a dark line, stop.
    if (startR < 50 && startG < 50 && startB < 50) return;

    // 2. Optimization: If already colored (matches reference), stop.
    if (Math.abs(startR - targetR) < 15 && 
        Math.abs(startG - targetG) < 15 && 
        Math.abs(startB - targetB) < 15) return;

    // 3. Setup Loop
    // Uint8Array is efficient for large canvases (visited map)
    const visited = new Uint8Array(width * height);
    const stack = [startIdx];
    visited[startIdx / 4] = 1;
    
    const maxIdx = width * height * 4;
    const tolerance = 40; 

    while (stack.length) {
        const idx = stack.pop();
        
        // Reveal Color
        displayData[idx] = referenceData[idx];
        displayData[idx + 1] = referenceData[idx + 1];
        displayData[idx + 2] = referenceData[idx + 2];
        displayData[idx + 3] = 255; 

        // Neighbors
        const pxIndex = idx / 4;
        const cx = pxIndex % width; 
        
        const offsets = [-4, 4, -width * 4, width * 4];

        for (let i = 0; i < 4; i++) {
            const offset = offsets[i];
            const nIdx = idx + offset;
            
            if (nIdx < 0 || nIdx >= maxIdx) continue;
            
            // Wrap checks
            if (offset === -4 && cx === 0) continue;
            if (offset === 4 && cx === width - 1) continue;
            
            const nPxIndex = nIdx / 4;
            if (visited[nPxIndex]) continue;
            
            // Match against original Empty color (flood region)
            const nr = displayData[nIdx];
            const ng = displayData[nIdx + 1];
            const nb = displayData[nIdx + 2];
            
            if (Math.abs(nr - startR) < tolerance && 
                Math.abs(ng - startG) < tolerance && 
                Math.abs(nb - startB) < tolerance) {
                
                visited[nPxIndex] = 1;
                stack.push(nIdx);
            }
        }
    }
}

// React Components
const { useState, useEffect, useRef, useCallback } = React;

const PRESETS = [
    { id: 1, src: 'preset_pizza.png', label: 'Pizza' },
    { id: 2, src: 'preset_cat.png', label: 'Cat' },
    { id: 3, src: 'preset_flower.png', label: 'Flower' },
    { id: 4, src: 'preset_car.png', label: 'Car' },
    { id: 5, src: 'preset_house.png', label: 'House' },
    { id: 6, src: 'preset_robot.png', label: 'Robot' },
    { id: 7, src: 'preset_unicorn.png', label: 'Unicorn' },
    { id: 8, src: 'preset_cupcake.png', label: 'Cupcake' },
    { id: 9, src: 'preset_butterfly.png', label: 'Butterfly' },
    { id: 10, src: 'preset_dino.png', label: 'Dino' },
];

function Gallery() {
    // We use a collection called 'submissions_v2' to simulate our "1 row" concept but make it functional.
    // The user instruction "only get 1 row... each column is a json object" is best interpreted 
    // as a collection of JSON documents in a NoSQL store like WebSim's.
    const submissions = React.useSyncExternalStore(
        room.collection('submissions_v2').subscribe,
        room.collection('submissions_v2').getList
    );

    return (
        <div className="gallery-section">
            <h3 className="presets-label">Community Gallery</h3>
            <div className="gallery-grid">
                {submissions.map(sub => (
                    <div key={sub.id} className="gallery-item">
                        <img src={sub.image_url} alt={sub.prompt} />
                        <div className="gallery-author">by {sub.username}</div>
                    </div>
                ))}
                {submissions.length === 0 && <p style={{textAlign:'center', width: '100%', gridColumn: '1/-1', opacity: 0.5}}>No art yet. Be the first!</p>}
            </div>
        </div>
    );
}

function App() {
    const [screen, setScreen] = useState('home'); // home, canvas
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentImage, setCurrentImage] = useState(null); // The original color image
    const [canvasRef, setCanvasRef] = useState(null); // Ref to the visible canvas
    
    // Debounce Logic for typing
    useEffect(() => {
        if (!prompt || screen !== 'home') return;
        
        const timer = setTimeout(() => {
            handleGenerate(prompt);
        }, 5000); // 5 seconds auto-submit

        return () => clearTimeout(timer);
    }, [prompt, screen]);

    const handleGenerate = async (text) => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            // "Solid Black Lines (Has color though HD)"
            const result = await websim.imageGen({
                prompt: `${text}, coloring book style with solid black outlines, flat vibrant colors, white background, vector art, high contrast`,
                aspect_ratio: "1:1"
            });
            startColoring(result.url, text);
        } catch (e) {
            console.error(e);
            alert("AI generation failed. Try again.");
            setLoading(false);
        }
    };

    const handlePreset = (preset) => {
        startColoring(preset.src, preset.label);
    };

    const startColoring = (url, promptText) => {
        setLoading(true);
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            setCurrentImage({ img, prompt: promptText });
            setScreen('canvas');
            setLoading(false);
        };
        img.src = url;
    };

    const handleBack = () => {
        setScreen('home');
        setPrompt('');
        setCurrentImage(null);
    };

    return (
        <>
            {screen === 'home' && (
                <HomeScreen 
                    prompt={prompt} 
                    setPrompt={setPrompt} 
                    onGenerate={handleGenerate}
                    onPreset={handlePreset}
                />
            )}
            
            {screen === 'canvas' && currentImage && (
                <CanvasScreen 
                    imageObj={currentImage} 
                    onBack={handleBack}
                />
            )}

            {loading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Creating Magic...</p>
                </div>
            )}
        </>
    );
}

function HomeScreen({ prompt, setPrompt, onGenerate, onPreset }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onGenerate(prompt);
        }
    };

    return (
        <div className="screen center-content">
            <h1>Magic Color Tap</h1>
            <p className="subtitle">Type what you want to Color</p>
            
            <div className="prompt-container">
                <input 
                    className="magic-input" 
                    placeholder="e.g. A flying turtle..." 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            </div>

            <p className="presets-label">Or pick a preset</p>
            <div className="presets-grid">
                {PRESETS.map(p => (
                    <div key={p.id} className="preset-thumb" onClick={() => onPreset(p)}>
                        <img src={p.src} alt={p.label} />
                    </div>
                ))}
            </div>

            <Gallery />
        </div>
    );
}

function CanvasScreen({ imageObj, onBack }) {
    const canvasRef = useRef(null);
    const [ctx, setCtx] = useState(null);
    const [displayData, setDisplayData] = useState(null); // Uint8ClampedArray
    const [referenceData, setReferenceData] = useState(null); // Uint8ClampedArray (Original)
    const [dims, setDims] = useState({ w: 0, h: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        setCtx(context);

        // Setup Canvas Size
        const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 200, 600);
        canvas.width = maxSize;
        canvas.height = maxSize;
        setDims({ w: maxSize, h: maxSize });

        // Draw and Process
        // 1. Draw Original to get Reference Data
        context.drawImage(imageObj.img, 0, 0, maxSize, maxSize);
        const refImageData = context.getImageData(0, 0, maxSize, maxSize);
        const refData = refImageData.data;
        setReferenceData(new Uint8ClampedArray(refData)); // Deep copy for reference

        // 2. Process for Display (Remove Colors -> White)
        // Algorithm: If pixel is not black (line), make it white.
        const dispImageData = context.getImageData(0, 0, maxSize, maxSize);
        const dData = dispImageData.data;

        for (let i = 0; i < dData.length; i += 4) {
            const r = dData[i];
            const g = dData[i+1];
            const b = dData[i+2];

            // Calculate luminance to detect dark lines
            const lum = 0.2126*r + 0.7152*g + 0.0722*b;

            if (lum > 50) { // If it's not dark
                dData[i] = 255;   // R
                dData[i+1] = 255; // G
                dData[i+2] = 255; // B
            } else {
                // Ensure lines are pure black for consistency
                dData[i] = 0;
                dData[i+1] = 0;
                dData[i+2] = 0;
            }
        }
        
        context.putImageData(dispImageData, 0, 0);
        setDisplayData(dData); // Keep reference to current live data

    }, [canvasRef, imageObj]);

    const handleTap = (e) => {
        if (!ctx || !displayData || !referenceData) return;

        const rect = canvasRef.current.getBoundingClientRect();
        
        // Pointer events provide unified coordinates
        const x = Math.floor((e.clientX - rect.left) * (dims.w / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (dims.h / rect.height));

        if (x < 0 || y < 0 || x >= dims.w || y >= dims.h) return;

        // Perform Logic
        floodFill(displayData, referenceData, x, y, dims.w, dims.h);
        
        // Put back to canvas
        const newImageData = new ImageData(displayData, dims.w, dims.h);
        ctx.putImageData(newImageData, 0, 0);
    };

    const handleSubmit = async () => {
        if (!canvasRef.current) return;
        setIsSubmitting(true);
        try {
            // Convert canvas to blob/url
            const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));
            const url = await websim.upload(blob);
            
            await room.collection('submissions_v2').create({
                prompt: imageObj.prompt,
                image_url: url
            });
            
            alert("Masterpiece saved to gallery!");
            onBack();
        } catch (e) {
            console.error(e);
            alert("Failed to save.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="screen center-content">
            <div className="canvas-container">
                <canvas 
                    ref={canvasRef}
                    onPointerDown={handleTap}
                />
            </div>
            
            <div className="controls">
                <button className="btn btn-secondary" onClick={onBack}>Back</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Art'}
                </button>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);