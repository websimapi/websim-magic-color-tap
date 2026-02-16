// Utils
const room = new WebsimSocket();

// Region Analysis & Helper Functions

// 1. Analyze the image to find all distinct fillable regions and group them into a palette
function analyzeImage(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;
    
    // Visited array: 0 = unvisited, 1 = visited
    const visited = new Uint8Array(totalPixels);
    // Region Map: pixelIndex -> regionID (or -1 for lines)
    const regionMap = new Int32Array(totalPixels).fill(-1);
    
    let regions = [];
    let regionIdCounter = 0;

    // Iterate all pixels to find connected components
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x);
            const dataIdx = idx * 4;
            
            if (visited[idx]) continue;
            
            // Check if Line (Black)
            const r = data[dataIdx];
            const g = data[dataIdx+1];
            const b = data[dataIdx+2];
            const isLine = (r < 50 && g < 50 && b < 50);

            if (isLine) {
                visited[idx] = 1;
                continue;
            }

            // Found a new region start
            const region = {
                id: regionIdCounter++,
                pixels: [], // List of pixel INDICES (divide by 4)
                color: [0, 0, 0], // To be averaged
                filled: false,
                paletteId: -1
            };

            // BFS Flood Fill to find extent of region
            const queue = [idx];
            visited[idx] = 1;
            regionMap[idx] = region.id;
            
            let sumR = 0, sumG = 0, sumB = 0;
            
            while(queue.length) {
                const currIdx = queue.pop();
                region.pixels.push(currIdx);
                
                const cBase = currIdx * 4;
                sumR += data[cBase];
                sumG += data[cBase+1];
                sumB += data[cBase+2];

                const cx = currIdx % width;
                const cy = Math.floor(currIdx / width);

                const neighbors = [
                    { nx: cx + 1, ny: cy, nIdx: currIdx + 1 },
                    { nx: cx - 1, ny: cy, nIdx: currIdx - 1 },
                    { nx: cx, ny: cy + 1, nIdx: currIdx + width },
                    { nx: cx, ny: cy - 1, nIdx: currIdx - width }
                ];

                for (let i = 0; i < neighbors.length; i++) {
                    const { nx, ny, nIdx } = neighbors[i];
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nIdx]) {
                        const nBase = nIdx * 4;
                        const nr = data[nBase];
                        const ng = data[nBase+1];
                        const nb = data[nBase+2];
                        
                        // Treat dark pixels as boundaries
                        if (nr < 50 && ng < 50 && nb < 50) {
                            // Boundary, don't add to queue, but mark visited if you want to avoid re-checking? 
                            // Actually, keep lines unvisited by flood fill logic usually, but here we scan everything.
                            // If we encounter a line here, just ignore it, the main loop handles lines.
                        } else {
                            // Check color similarity to keep regions distinct? 
                            // For "Cartoon" style images, usually regions are separated by black lines.
                            // So we just fill until we hit lines.
                            visited[nIdx] = 1;
                            regionMap[nIdx] = region.id;
                            queue.push(nIdx);
                        }
                    }
                }
            }
            
            // Average Color
            if (region.pixels.length > 0) {
                region.color = [
                    Math.round(sumR / region.pixels.length),
                    Math.round(sumG / region.pixels.length),
                    Math.round(sumB / region.pixels.length)
                ];
                regions.push(region);
            }
        }
    }

    // 2. Generate Palette (Group Regions)
    // Simple clustering: Merge regions with very similar colors
    let palette = [];
    const colorThreshold = 30; // RGB distance

    regions.forEach(reg => {
        // Try to find a matching palette color
        let match = palette.find(p => {
            const dr = Math.abs(p.color[0] - reg.color[0]);
            const dg = Math.abs(p.color[1] - reg.color[1]);
            const db = Math.abs(p.color[2] - reg.color[2]);
            return (dr + dg + db) < colorThreshold * 3;
        });

        if (match) {
            match.regionIds.push(reg.id);
            reg.paletteId = match.id;
        } else {
            const newPal = {
                id: palette.length,
                color: reg.color,
                regionIds: [reg.id],
                completed: false
            };
            palette.push(newPal);
            reg.paletteId = newPal.id;
        }
    });
    
    // Sort palette by frequency (number of regions or pixels?)
    // Let's sort by pixel count (area) descending so big colors are first
    palette.sort((a, b) => {
        const areaA = a.regionIds.reduce((sum, rid) => sum + regions.find(r => r.id===rid).pixels.length, 0);
        const areaB = b.regionIds.reduce((sum, rid) => sum + regions.find(r => r.id===rid).pixels.length, 0);
        return areaB - areaA;
    });

    // Re-index palette IDs after sort
    palette.forEach((p, idx) => {
        p.originalId = p.id; // Keep track if needed, or just update regions
        p.id = idx;
    });
    
    // Update regions with new sorted palette IDs
    regions.forEach(r => {
        const p = palette.find(pal => pal.regionIds.includes(r.id));
        if (p) r.paletteId = p.id;
    });

    return { regions, regionMap, palette };
}

// React Components
const { useState, useEffect, useRef, useCallback } = React;

// Helper to generate 100 presets using available assets
const generatePresets = () => {
    const baseAssets = [
        { src: 'preset_pizza.png', label: 'Pizza', tags: ['food', 'lunch', 'yummy'] },
        { src: 'preset_cat.png', label: 'Cat', tags: ['animal', 'pet', 'cute', 'kitten'] },
        { src: 'preset_flower.png', label: 'Flower', tags: ['nature', 'plant', 'garden'] },
        { src: 'preset_car.png', label: 'Car', tags: ['vehicle', 'transport', 'fast'] },
        { src: 'preset_house.png', label: 'House', tags: ['building', 'home', 'cottage'] },
        { src: 'preset_robot.png', label: 'Robot', tags: ['tech', 'scifi', 'toy'] },
        { src: 'preset_unicorn.png', label: 'Unicorn', tags: ['fantasy', 'magic', 'horse'] },
        { src: 'preset_cupcake.png', label: 'Cupcake', tags: ['food', 'dessert', 'sweet'] },
        { src: 'preset_butterfly.png', label: 'Butterfly', tags: ['insect', 'nature', 'fly'] },
        { src: 'preset_dino.png', label: 'Dino', tags: ['animal', 'prehistoric', 'rex'] },
        // New Assets
        { src: 'preset_rocket.png', label: 'Rocket', tags: ['space', 'fly', 'scifi'] },
        { src: 'preset_turtle.png', label: 'Turtle', tags: ['animal', 'ocean', 'slow'] },
        { src: 'preset_castle.png', label: 'Castle', tags: ['fantasy', 'building', 'royal'] },
        { src: 'preset_dragon.png', label: 'Dragon', tags: ['fantasy', 'monster', 'fire'] },
        { src: 'preset_icecream.png', label: 'Ice Cream', tags: ['food', 'dessert', 'summer'] },
        { src: 'preset_sun.png', label: 'Sun', tags: ['nature', 'sky', 'hot'] },
        { src: 'preset_fish.png', label: 'Fish', tags: ['animal', 'ocean', 'water'] },
        { src: 'preset_bird.png', label: 'Bird', tags: ['animal', 'fly', 'sky'] },
        { src: 'preset_tree.png', label: 'Tree', tags: ['nature', 'plant', 'fruit'] },
        { src: 'preset_plane.png', label: 'Plane', tags: ['vehicle', 'fly', 'transport'] },
        // Set 3 (21-30)
        { src: 'preset_balloon.png', label: 'Balloon', tags: ['sky', 'fly', 'travel'] },
        { src: 'preset_bear.png', label: 'Bear', tags: ['animal', 'cute', 'forest'] },
        { src: 'preset_train.png', label: 'Train', tags: ['vehicle', 'transport', 'toy'] },
        { src: 'preset_rainbow.png', label: 'Rainbow', tags: ['nature', 'sky', 'weather'] },
        { src: 'preset_guitar.png', label: 'Guitar', tags: ['music', 'instrument', 'song'] },
        { src: 'preset_octopus.png', label: 'Octopus', tags: ['animal', 'ocean', 'water'] },
        { src: 'preset_mushroom.png', label: 'Mushroom', tags: ['nature', 'plant', 'forest'] },
        { src: 'preset_snowman.png', label: 'Snowman', tags: ['winter', 'snow', 'cold'] },
        { src: 'preset_boat.png', label: 'Boat', tags: ['vehicle', 'water', 'ocean'] },
        { src: 'preset_burger.png', label: 'Burger', tags: ['food', 'lunch', 'yummy'] },
        // Set 4 (31-40)
        { src: 'preset_basketball.png', label: 'Basketball', tags: ['sport', 'play', 'ball'] },
        { src: 'preset_ufo.png', label: 'UFO', tags: ['space', 'scifi', 'alien'] },
        { src: 'preset_owl.png', label: 'Owl', tags: ['animal', 'bird', 'night'] },
        { src: 'preset_crown.png', label: 'Crown', tags: ['fantasy', 'royal', 'king'] },
        { src: 'preset_diamond.png', label: 'Diamond', tags: ['treasure', 'gem', 'shiny'] },
        { src: 'preset_cake.png', label: 'Cake', tags: ['food', 'dessert', 'party'] },
        { src: 'preset_robot_dog.png', label: 'Robo Dog', tags: ['tech', 'animal', 'scifi'] },
        { src: 'preset_planet.png', label: 'Planet', tags: ['space', 'universe', 'stars'] },
        { src: 'preset_anchor.png', label: 'Anchor', tags: ['ocean', 'boat', 'sea'] },
        { src: 'preset_key.png', label: 'Key', tags: ['object', 'mystery', 'lock'] },
        // Set 5 (41-50)
        { src: 'preset_apple.png', label: 'Apple', tags: ['food', 'fruit', 'red'] },
        { src: 'preset_duck.png', label: 'Duck', tags: ['animal', 'bird', 'water'] },
        { src: 'preset_hat.png', label: 'Hat', tags: ['clothing', 'magic', 'wear'] },
        { src: 'preset_moon.png', label: 'Moon', tags: ['space', 'night', 'sleep'] },
        { src: 'preset_shoe.png', label: 'Shoe', tags: ['clothing', 'walk', 'run'] },
        { src: 'preset_bell.png', label: 'Bell', tags: ['object', 'music', 'sound'] },
        { src: 'preset_book.png', label: 'Book', tags: ['object', 'read', 'school'] },
        { src: 'preset_camera.png', label: 'Camera', tags: ['object', 'photo', 'picture'] },
        { src: 'preset_ghost.png', label: 'Ghost', tags: ['fantasy', 'spooky', 'halloween'] },
        { src: 'preset_star.png', label: 'Star', tags: ['space', 'sky', 'shine'] },
        // Set 6 (51-60)
        { src: 'preset_bee.png', label: 'Bee', tags: ['insect', 'nature', 'honey'] },
        { src: 'preset_ladybug.png', label: 'Ladybug', tags: ['insect', 'nature', 'red'] },
        { src: 'preset_snail.png', label: 'Snail', tags: ['animal', 'garden', 'shell'] },
        { src: 'preset_dolphin.png', label: 'Dolphin', tags: ['animal', 'ocean', 'swim'] },
        { src: 'preset_crab.png', label: 'Crab', tags: ['animal', 'beach', 'ocean'] },
        { src: 'preset_whale.png', label: 'Whale', tags: ['animal', 'ocean', 'big'] },
        { src: 'preset_fox.png', label: 'Fox', tags: ['animal', 'forest', 'orange'] },
        { src: 'preset_koala.png', label: 'Koala', tags: ['animal', 'australia', 'cute'] },
        { src: 'preset_lion.png', label: 'Lion', tags: ['animal', 'safari', 'king'] },
        { src: 'preset_tiger.png', label: 'Tiger', tags: ['animal', 'safari', 'stripes'] },
    ];

    const adjectives = ['Super', 'Happy', 'Magic', 'Little', 'Big', 'Funny', 'Cool', 'Wild', 'Space', 'Rainbow'];
    let list = [];
    let id = 1;

    // Add base items first
    baseAssets.forEach(a => list.push({ ...a, id: id++, label: a.label }));

    // Generate variations to reach ~100
    for (let i = 0; i < 9; i++) {
        baseAssets.forEach(asset => {
            list.push({
                id: id++,
                src: asset.src,
                label: `${adjectives[i]} ${asset.label}`,
                tags: asset.tags
            });
        });
    }
    
    return list;
};

const PRESETS = generatePresets();

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
    const [gameMode, setGameMode] = useState('simple'); // 'simple' | 'numbered'
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentImage, setCurrentImage] = useState(null); 
    const [stars, setStars] = useState(0);

    // Initialize Stars
    useEffect(() => {
        const saved = localStorage.getItem('magic_color_stars');
        if (saved) setStars(parseInt(saved, 10));
    }, []);

    const addStar = () => {
        const newStars = stars + 1;
        setStars(newStars);
        localStorage.setItem('magic_color_stars', newStars);
        
        // Attempt to save to "1 row" DB concept
        room.collection('player_stats').create({
            stars: newStars,
            timestamp: Date.now()
        }).catch(e => console.log('Stat sync skip', e));
    };
    
    // Handle Generation with Search Fallback
    const handleGenerate = async (text) => {
        if (!text.trim() || loading) return;
        setLoading(true);
        try {
            // "Solid Black Lines (Has color though HD)"
            const result = await websim.imageGen({
                prompt: `${text}, coloring book style with solid black outlines, flat vibrant colors, white background, vector art, high contrast`,
                aspect_ratio: "1:1"
            });
            startColoring(result.url, text);
        } catch (e) {
            console.error("AI Generation failed, falling back to search", e);
            setLoading(false);
            throw new Error("SEARCH_FALLBACK");
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
                    stars={stars}
                    gameMode={gameMode}
                    setGameMode={setGameMode}
                />
            )}
            
            {screen === 'canvas' && currentImage && (
                <CanvasScreen 
                    imageObj={currentImage} 
                    gameMode={gameMode}
                    onBack={handleBack}
                    onComplete={addStar}
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

function HomeScreen({ prompt, setPrompt, onGenerate, onPreset, stars, gameMode, setGameMode }) {
    const [filteredPresets, setFilteredPresets] = useState(PRESETS);
    const [page, setPage] = useState(0);
    const [searchMode, setSearchMode] = useState(false);
    
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(filteredPresets.length / PAGE_SIZE);

    // Reset filtering when prompt is cleared
    useEffect(() => {
        if (prompt === '') {
            setFilteredPresets(PRESETS);
            setSearchMode(false);
            setPage(0);
        }
    }, [prompt]);

    const performSearch = () => {
        const lower = prompt.toLowerCase();
        const results = PRESETS.filter(p => 
            p.label.toLowerCase().includes(lower) || 
            (p.tags && p.tags.some(t => t.toLowerCase().includes(lower)))
        );
        setFilteredPresets(results);
        setPage(0);
        setSearchMode(true);
    };

    const handleAction = async () => {
        if (!prompt.trim()) return;
        
        try {
            await onGenerate(prompt);
        } catch (error) {
            if (error.message === "SEARCH_FALLBACK") {
                performSearch();
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleAction();
        }
    };

    // Pagination
    const nextPage = () => setPage(p => Math.min(p + 1, totalPages - 1));
    const prevPage = () => setPage(p => Math.max(p - 1, 0));

    // Swipe Logic
    const touchStartX = useRef(null);
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e) => {
        if (!touchStartX.current) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;

        if (Math.abs(diff) > 50) { // Threshold
            if (diff > 0) nextPage();
            else prevPage();
        }
        touchStartX.current = null;
    };

    const currentItems = filteredPresets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="screen center-content">
            <div className="header-top">
                <div style={{width: 50}}></div>
                <h1>Magic Color Tap</h1>
                <div className="star-badge" title="Your collected stars">
                    <svg className="star-icon" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {stars}
                </div>
            </div>
            
            <p className="subtitle">Type what you want to Color</p>
            
            <div className="prompt-container">
                <div className="input-wrapper">
                    <input 
                        className="magic-input" 
                        placeholder="e.g. A flying turtle..." 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                    <button className="go-btn" onClick={handleAction}>
                        GO
                    </button>
                </div>
            </div>

            <div className="mode-toggle-container">
                <button 
                    className={`mode-btn ${gameMode === 'simple' ? 'active' : ''}`}
                    onClick={() => setGameMode('simple')}
                >
                    Simple Mode
                </button>
                <button 
                    className={`mode-btn ${gameMode === 'numbered' ? 'active' : ''}`}
                    onClick={() => setGameMode('numbered')}
                >
                    Numbered Mode
                </button>
            </div>

            <p className="presets-label">
                {searchMode ? `Found ${filteredPresets.length} matching presets` : 'Pick a preset'}
            </p>
            
            <div className="carousel-container">
                <button 
                    className="nav-btn prev" 
                    onClick={prevPage} 
                    disabled={page === 0}
                >‹</button>
                
                <div 
                    className="presets-grid"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {currentItems.map(p => (
                        <div key={p.id} className="preset-thumb" onClick={() => onPreset(p)}>
                            <img src={p.src} alt={p.label} />
                            <div className="preset-label">{p.label}</div>
                        </div>
                    ))}
                    {currentItems.length === 0 && (
                        <div style={{gridColumn: '1/-1', textAlign: 'center', padding: 20}}>
                            No presets found. Try a different search!
                        </div>
                    )}
                </div>

                <button 
                    className="nav-btn next" 
                    onClick={nextPage} 
                    disabled={page >= totalPages - 1}
                >›</button>
            </div>
            
            <div className="pagination-dots">
                {Array.from({length: Math.min(totalPages, 10)}).map((_, i) => (
                     <span key={i} className={`dot ${i === page ? 'active' : ''}`} />
                ))}
                {totalPages > 10 && <span className="dot-more">...</span>}
            </div>

            <Gallery />
        </div>
    );
}

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
        
        // We act on a fresh buffer or modifying existing is hard without pixel access.
        // Easiest is to modify the ImageData directly.
        const imageData = ctx.getImageData(0, 0, dims.w, dims.h);
        const data = imageData.data;

        // We assume the imageData currently has the black lines intact.
        // We only need to update the regions.
        
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

            // Paint all pixels in this region
            // Note: This loop over pixels is fast enough for interaction? 
            // If many regions update, maybe slow. But usually only one fills or all change on palette switch.
            // Optimization: Only update regions that changed? 
            // For palette switch, many change. 
            // The pixel list makes this efficient.
            const len = reg.pixels.length;
            for(let i=0; i<len; i++) {
                const pxIdx = reg.pixels[i] * 4;
                data[pxIdx] = r;
                data[pxIdx+1] = g;
                data[pxIdx+2] = b;
                // Alpha is already 255 or whatever from original
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

        // Run Analysis (Async to allow UI to show spinner if needed)
        setTimeout(() => {
            const { regions: r, regionMap: rm, palette: p } = analyzeImage(context, maxSize, maxSize);
            setRegions(r);
            setRegionMap(rm);
            setPalette(p);
            setAnalyzing(false);
            
            // Initial Paint (Everything white except lines)
            // We need to clear the colors first
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

        }, 50); // Small delay to render loader

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

            // Repaint happens via effect or we can optimize and just paint this region here?
            // Repainting all via effect is safer but let's see performance.
            // For strict sync, we depend on state.
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);