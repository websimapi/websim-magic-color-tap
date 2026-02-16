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
        <React.Fragment>
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
        </React.Fragment>
    );
}

window.App = App;