// Region Analysis & Helper Functions

// 1. Analyze the image to find all distinct fillable regions and group them into a palette
window.analyzeImage = function(ctx, width, height) {
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
                            // Boundary, don't add to queue
                        } else {
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
    
    // Sort palette by area descending
    palette.sort((a, b) => {
        const areaA = a.regionIds.reduce((sum, rid) => sum + regions.find(r => r.id===rid).pixels.length, 0);
        const areaB = b.regionIds.reduce((sum, rid) => sum + regions.find(r => r.id===rid).pixels.length, 0);
        return areaB - areaA;
    });

    // Re-index palette IDs after sort
    palette.forEach((p, idx) => {
        p.originalId = p.id; 
        p.id = idx;
    });
    
    // Update regions with new sorted palette IDs
    regions.forEach(r => {
        const p = palette.find(pal => pal.regionIds.includes(r.id));
        if (p) r.paletteId = p.id;
    });

    return { regions, regionMap, palette };
};