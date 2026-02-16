function CanvasScreen({ imageObj, gameMode, onBack, onComplete }) {
    const canvasRef = useRef(null);
    const [ctx, setCtx] = useState(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [analyzing, setAnalyzing] = useState(true);
    
    // Engine State
    const [regions, setRegions] = useState([]);
    const [palette, setPalette] = useState([]);
    const [regionMap, setRegionMap] = useState(null);
    const [selectedPaletteId, setSelectedPaletteId] = useState(null);

    // Helper: Repaint the canvas based on current region states
    const repaintCanvas = useCallback((currentRegions, currentPalette, currentSelectedId) => {
        if (!ctx || !currentRegions) return;
        
        const imageData = ctx.getImageData(0, 0, dims.w, dims.h);
        const data = imageData.data;

        currentRegions.forEach(reg => {
            const isSelectedGroup = (gameMode === 'numbered' && reg.paletteId === currentSelectedId);
            
            // Determine color for this region
            let r, g, b;
            
            if (reg.filled) {
                // Show real color
                [r, g, b] = reg.color;
            } else if (isSelectedGroup) {
                // Show hint grey
                r = 220; g = 220; b = 220;
            } else {
                // Show white (empty)
                r = 255; g = 255; b = 255;
            }

            const len = reg.pixels.length;
            for(let i=0; i<len; i++) {
                const pxIdx = reg.pixels[i] * 4;
                data[pxIdx] = r;
                data[pxIdx+1] = g;
                data[pxIdx+2] = b;
            }
        });
        
        ctx.putImageData(imageData, 0, 0);

    }, [ctx, dims, gameMode]);

    // Initial Load & Analysis
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        setCtx(context);

        const maxSize = Math.min(window.innerWidth - 20, window.innerHeight - 300, 600);
        canvas.width = maxSize;
        canvas.height = maxSize;
        setDims({ w: maxSize, h: maxSize });

        const img = imageObj.img;
        context.drawImage(img, 0, 0, maxSize, maxSize);

        // Run Analysis (Async)
        setTimeout(() => {
            const { regions: r, regionMap: rm, palette: p } = window.analyzeImage(context, maxSize, maxSize);
            setRegions(r);
            setRegionMap(rm);
            setPalette(p);
            setAnalyzing(false);
            
            // Initial Paint
            const imageData = context.getImageData(0, 0, maxSize, maxSize);
            const data = imageData.data;
            r.forEach(reg => {
                const len = reg.pixels.length;
                for(let i=0; i<len; i++) {
                    const idx = reg.pixels[i] * 4;
                    data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255;
                }
            });
            context.putImageData(imageData, 0, 0);

        }, 50);

    }, [imageObj]);

    // Handle Palette Selection Paint
    useEffect(() => {
        if (!analyzing && regions.length > 0) {
            repaintCanvas(regions, palette, selectedPaletteId);
        }
    }, [selectedPaletteId, analyzing, regions, palette, repaintCanvas]);


    const handleTap = (e) => {
        if (analyzing || completed || !regionMap) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (dims.w / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (dims.h / rect.height));

        if (x < 0 || y < 0 || x >= dims.w || y >= dims.h) return;

        const idx = y * dims.w + x;
        const regionId = regionMap[idx];

        if (regionId === -1) return; // Clicked a line or invalid

        const region = regions[regionId];
        if (region.filled) return; // Already done

        // Game Logic
        let success = false;
        
        if (gameMode === 'simple') {
            success = true;
        } else {
            // Numbered Mode
            if (selectedPaletteId !== null && region.paletteId === selectedPaletteId) {
                success = true;
            }
        }

        if (success) {
            // Update Region
            const newRegions = [...regions];
            newRegions[regionId] = { ...region, filled: true };
            setRegions(newRegions);
            
            // Check Palette Completion (for numbered mode)
            if (gameMode === 'numbered') {
                const pal = palette.find(p => p.id === region.paletteId);
                const allFilled = pal.regionIds.every(rid => newRegions[rid].filled);
                if (allFilled) {
                    const newPalette = [...palette];
                    const pIdx = newPalette.findIndex(p => p.id === region.paletteId);
                    newPalette[pIdx] = { ...newPalette[pIdx], completed: true };
                    setPalette(newPalette);
                    setSelectedPaletteId(null); // Deselect
                }
            }
        }
    };

    // Check Total Completion
    useEffect(() => {
        if (regions.length > 0 && regions.every(r => r.filled)) {
            if (!completed) {
                setCompleted(true);
                onComplete();
                if (window.confetti) {
                    window.confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            }
        }
    }, [regions, completed, onComplete]);

    // Delay Overlay
    useEffect(() => {
        if (completed) {
            const timer = setTimeout(() => setShowOverlay(true), 2500);
            return () => clearTimeout(timer);
        }
    }, [completed]);

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
            {analyzing && (
                 <div className="loading-overlay" style={{position:'absolute', borderRadius: 8}}>
                    <div className="spinner"></div>
                    <p>Preparing Magic...</p>
                </div>
            )}
            
            <div className="canvas-container">
                <canvas 
                    ref={canvasRef}
                    onPointerDown={handleTap}
                />
                
                {showOverlay && (
                    <div className="congrats-overlay">
                        <div className="congrats-content">
                            <span className="big-star">⭐</span>
                            <h2>Amazing!</h2>
                            <p>You earned a Star!</p>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                {isSubmitting ? 'Saving...' : 'Save to Gallery'}
                            </button>
                            <button className="btn btn-secondary" style={{marginTop:'10px', background:'transparent', color:'#444', boxShadow:'none'}} onClick={onBack}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {gameMode === 'numbered' && !analyzing && !completed && (
                <div className="palette-bar">
                    {palette.map((p, i) => (
                        <div 
                            key={p.id}
                            className={`palette-item ${selectedPaletteId === p.id ? 'selected' : ''} ${p.completed ? 'completed' : ''}`}
                            style={{backgroundColor: `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`}}
                            onClick={() => setSelectedPaletteId(p.id)}
                        >
                            <div className="palette-number">{i + 1}</div>
                            {p.completed && <div className="palette-check">✓</div>}
                        </div>
                    ))}
                </div>
            )}
            
            <div className="controls">
                <button className="btn btn-secondary" onClick={onBack}>Back</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting || completed}>
                    {isSubmitting ? 'Saving...' : 'Save Art'}
                </button>
            </div>
        </div>
    );
}

window.CanvasScreen = CanvasScreen;