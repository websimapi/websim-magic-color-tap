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

window.HomeScreen = HomeScreen;