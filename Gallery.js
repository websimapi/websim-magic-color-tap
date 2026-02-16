function Gallery() {
    // We use a collection called 'submissions_v2' to simulate our "1 row" concept but make it functional.
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

// Make available globally
window.Gallery = Gallery;