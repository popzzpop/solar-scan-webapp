let map;
let currentMarker;
let googleApiKey;

document.addEventListener('DOMContentLoaded', async function() {
    // Load Google API key and initialize Google Maps
    await loadGoogleMapsAPI();
    setupEventListeners();
    // Setup panel configuration once (not per location)
    setupPanelConfiguration();
});

async function loadGoogleMapsAPI() {
    try {
        // Get API key from server
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        googleApiKey = config.googleApiKey;
        
        // Load Google Maps JavaScript API
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=geometry,drawing`;
        script.onload = initializeMap;
        document.head.appendChild(script);
        
    } catch (error) {
        console.error('Error loading Google Maps API:', error);
        // Fallback initialization
        initializeMap();
    }
}

function initializeMap() {
    const mapOptions = {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 13,
        mapTypeId: 'hybrid', // Show satellite imagery
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_CENTER,
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        }
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    // Add click listener for solar analysis
    map.addListener('click', function(event) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        analyzeSolarPotential(lat, lng);
        
        // Remove previous marker
        if (currentMarker) {
            currentMarker.setMap(null);
        }
        
        // Add new marker
        currentMarker = new google.maps.Marker({
            position: { lat: lat, lng: lng },
            map: map,
            title: `Solar Analysis: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: `Analyzing solar potential for<br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
        });
        infoWindow.open(map, currentMarker);
    });
}

// Fallback initialization if Google Maps fails to load
window.initMap = function() {
    if (typeof google === 'undefined') {
        console.warn('Google Maps API not available');
        return;
    }
    initializeMap();
};

function setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const addressInput = document.getElementById('addressInput');

    searchBtn.addEventListener('click', handleAddressSearch);
    addressInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAddressSearch();
        }
    });
}

async function handleAddressSearch() {
    const address = document.getElementById('addressInput').value.trim();
    if (!address) {
        alert('Please enter an address');
        return;
    }

    try {
        const coords = await geocodeAddress(address);
        if (coords) {
            map.setCenter({ lat: coords.lat, lng: coords.lng });
            map.setZoom(18);
            analyzeSolarPotential(coords.lat, coords.lng);
            
            // Remove previous marker
            if (currentMarker) {
                currentMarker.setMap(null);
            }
            
            // Add new marker
            currentMarker = new google.maps.Marker({
                position: { lat: coords.lat, lng: coords.lng },
                map: map,
                title: `Solar analysis for: ${address}`
            });
            
            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `Solar analysis for:<br>${address}`
            });
            infoWindow.open(map, currentMarker);
        }
    } catch (error) {
        alert('Could not find the specified address');
    }
}

async function geocodeAddress(address) {
    // Use Google's Geocoding API through our server
    try {
        const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
        const data = await response.json();
        
        if (data.lat && data.lng) {
            return {
                lat: data.lat,
                lng: data.lng
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Clear all state from previous analysis to prevent chaos
function clearPreviousAnalysisState() {
    console.log('Clearing previous analysis state');
    
    // Clear global variables
    currentSolarData = null;
    maxPanels = 0;
    satelliteImage = null;
    maskImage = null;
    fluxImage = null;
    showFluxOverlay = false;
    
    // Clear building bounds and background state
    window.buildingBounds = null;
    window.canvasDimensions = null;
    window.backgroundDrawn = false;
    
    // Clear all canvas layers
    if (roofContexts) {
        Object.keys(roofContexts).forEach(layer => {
            const context = roofContexts[layer];
            const canvas = roofCanvases[layer];
            if (context && canvas) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    }
    
    // Reset slider to 0
    const slider = document.getElementById('panelCountSlider');
    if (slider) {
        slider.value = 0;
        slider.max = 0;
        updatePanelDisplay(0);
    }
    
    // Reset counters
    const maxCountEl = document.getElementById('maxPanelCount');
    const maxLabelEl = document.getElementById('maxPanelCountLabel');
    if (maxCountEl) maxCountEl.textContent = '0';
    if (maxLabelEl) maxLabelEl.textContent = '0';
    
    // Clear live calculations
    document.getElementById('liveGeneration').textContent = '0 kWh';
    document.getElementById('livePanelArea').textContent = '0 m²';
    document.getElementById('liveCO2').textContent = '0 kg';
    document.getElementById('liveCoverage').textContent = '0%';
    
    // Reset flux overlay toggle
    const fluxToggle = document.getElementById('fluxOverlayToggle');
    if (fluxToggle) {
        fluxToggle.checked = false;
    }
    
    // Hide roof visualization panel
    const roofVisualizationPanel = document.getElementById('roofVisualizationPanel');
    if (roofVisualizationPanel) {
        roofVisualizationPanel.classList.add('hidden');
    }
}

async function analyzeSolarPotential(lat, lng) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsPanel = document.getElementById('resultsPanel');
    
    // Clear previous state before analyzing new location
    clearPreviousAnalysisState();
    
    loadingIndicator.classList.remove('hidden');
    resultsPanel.classList.add('hidden');

    try {
        const buildingData = await fetchBuildingInsights(lat, lng);
        
        if (buildingData.error) {
            throw new Error(buildingData.error);
        }

        // Fetch data layers in parallel
        const dataLayersResponse = await fetchDataLayers(lat, lng);
        
        // Combine building data and data layers
        const combinedData = { ...buildingData };
        if (dataLayersResponse && !dataLayersResponse.error) {
            combinedData.dataLayers = dataLayersResponse;
            console.log('Data layers loaded successfully:', dataLayersResponse);
        } else {
            console.warn('Data layers not available or failed to load');
        }
        
        // Store combined data and display results
        currentSolarData = combinedData;
        displayResults(combinedData);
        
        loadingIndicator.classList.add('hidden');
        resultsPanel.classList.remove('hidden');

    } catch (error) {
        console.error('Analysis error:', error);
        loadingIndicator.classList.add('hidden');
        
        const resultsDiv = document.getElementById('solarResults');
        resultsDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded p-4">
                <h4 class="text-red-800 font-medium">Analysis Error</h4>
                <p class="text-red-600 text-sm mt-1">${error.message}</p>
                <p class="text-gray-600 text-sm mt-2">This could be due to:</p>
                <ul class="text-gray-600 text-sm ml-4 mt-1 list-disc">
                    <li>Location not covered by Google Solar API</li>
                    <li>API key not configured</li>
                    <li>Building not found in the area</li>
                </ul>
            </div>
        `;
        resultsPanel.classList.remove('hidden');
    }
}

async function fetchBuildingInsights(lat, lng) {
    const response = await fetch(`/api/solar/building/${lat}/${lng}`);
    return await response.json();
}

async function fetchDataLayers(lat, lng) {
    try {
        const response = await fetch(`/api/solar/data-layers/${lat}/${lng}?radius=100&view=FULL_LAYERS`);
        return await response.json();
    } catch (error) {
        console.error('Data layers error:', error);
        return null;
    }
}

function displayResults(data) {
    const resultsDiv = document.getElementById('solarResults');
    
    if (!data.solarPotential) {
        resultsDiv.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded p-4">
                <h4 class="text-yellow-800 font-medium">Limited Data Available</h4>
                <p class="text-yellow-700 text-sm mt-1">Solar potential data is not available for this location.</p>
            </div>
        `;
        return;
    }

    const solar = data.solarPotential;
    const roof = data.roofSegmentStats || {};
    
    resultsDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-green-50 p-4 rounded">
                <h4 class="font-medium text-green-800">☀️ Solar Potential</h4>
                <p class="text-2xl font-bold text-green-600">${Math.round(solar.maxArrayPanelsCount || 0)}</p>
                <p class="text-sm text-green-700">Max Solar Panels</p>
            </div>
            <div class="bg-blue-50 p-4 rounded">
                <h4 class="font-medium text-blue-800">⚡ Annual Generation</h4>
                <p class="text-2xl font-bold text-blue-600">${Math.round((solar.maxArrayAreaMeters2 || 0) * 150)}</p>
                <p class="text-sm text-blue-700">kWh per year</p>
            </div>
            <div class="bg-purple-50 p-4 rounded">
                <h4 class="font-medium text-purple-800">🏠 Roof Area</h4>
                <p class="text-2xl font-bold text-purple-600">${Math.round(solar.wholeRoofStats?.areaMeters2 || 0)}</p>
                <p class="text-sm text-purple-700">Square meters</p>
            </div>
            <div class="bg-orange-50 p-4 rounded">
                <h4 class="font-medium text-orange-800">📊 Data Quality</h4>
                <p class="text-2xl font-bold text-orange-600">${data.imageQuality || 'N/A'}</p>
                <p class="text-sm text-orange-700">Imagery Quality</p>
            </div>
        </div>
    `;
}


// Global variables for panel configuration
let currentSolarData = null;
let roofCanvases = {
    base: null,
    mask: null,  
    flux: null,
    panels: null
};
let roofContexts = {
    base: null,
    mask: null,
    flux: null, 
    panels: null
};
let maxPanels = 0;
let satelliteImage = null;
let maskImage = null;
let fluxImage = null;
let showFluxOverlay = false;

// For backwards compatibility
let roofCanvas = null;
let roofContext = null;

// Enhanced setup to include panel configuration
function setupPanelConfiguration() {
    const slider = document.getElementById('panelCountSlider');
    const fluxToggle = document.getElementById('fluxOverlayToggle');
    
    // Initialize multi-layer canvas system
    const canvasIds = ['roofCanvasBase', 'roofCanvasMask', 'roofCanvasFlux', 'roofCanvasPanels'];
    const layers = ['base', 'mask', 'flux', 'panels'];
    
    for (let i = 0; i < canvasIds.length; i++) {
        const canvas = document.getElementById(canvasIds[i]);
        const layer = layers[i];
        
        if (canvas) {
            roofCanvases[layer] = canvas;
            roofContexts[layer] = canvas.getContext('2d');
            
            // Set backwards compatibility references
            if (layer === 'panels') {
                roofCanvas = canvas;
                roofContext = canvas.getContext('2d');
            }
        }
    }
    
    if (slider) {
        slider.addEventListener('input', handlePanelCountChange);
        slider.addEventListener('change', handlePanelCountChange);
    }
    
    if (fluxToggle) {
        fluxToggle.addEventListener('change', handleFluxToggle);
    }
}

// Panel configuration is now setup once on page load

// Handle slider changes
function handlePanelCountChange(event) {
    const selectedPanels = parseInt(event.target.value);
    updatePanelDisplay(selectedPanels);
    updateLiveCalculations(selectedPanels);
    updateRoofVisualization(selectedPanels);
}

// Handle flux overlay toggle
function handleFluxToggle(event) {
    showFluxOverlay = event.target.checked;
    console.log('Flux overlay toggled:', showFluxOverlay);
    
    // Just update the flux overlay without redrawing everything
    updateFluxOverlay();
}

// Update panel count display
function updatePanelDisplay(selectedPanels) {
    const selectedCountEl = document.getElementById('selectedPanelCount');
    const sliderEl = document.getElementById('panelCountSlider');
    
    if (selectedCountEl) {
        selectedCountEl.textContent = selectedPanels;
    }
    
    // Update slider visual progress
    if (sliderEl && maxPanels > 0) {
        const percentage = (selectedPanels / maxPanels) * 100;
        sliderEl.style.background = `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`;
    }
}

// Update live calculations based on selected panels
function updateLiveCalculations(selectedPanels) {
    if (!currentSolarData) return;
    
    const maxGeneration = (currentSolarData.maxArrayAreaMeters2 || 0) * 150; // kWh per year per m²
    const panelGeneration = selectedPanels > 0 ? (maxGeneration * selectedPanels) / maxPanels : 0;
    const co2Offset = panelGeneration * 0.4; // 0.4 kg CO2 per kWh
    const coverage = maxPanels > 0 ? (selectedPanels / maxPanels) * 100 : 0;
    const panelArea = selectedPanels > 0 ? Math.round((currentSolarData.maxArrayAreaMeters2 || 0) * selectedPanels / maxPanels) : 0;
    
    // Update display elements
    document.getElementById('liveGeneration').textContent = Math.round(panelGeneration).toLocaleString() + ' kWh';
    document.getElementById('livePanelArea').textContent = panelArea + ' m²';
    document.getElementById('liveCO2').textContent = Math.round(co2Offset).toLocaleString() + ' kg';
    document.getElementById('liveCoverage').textContent = Math.round(coverage) + '%';
}

// Enhanced displayResults function to show panel configuration
const originalDisplayResults = displayResults;
displayResults = function(data) {
    originalDisplayResults(data);
    
    // Note: currentSolarData is already set in analyzeSolarPotential
    // Don't overwrite it here to preserve dataLayers
    
    if (data.solarPotential) {
        setupPanelSelector(data.solarPotential);
        showPanelPanels();
    }
};

// Setup panel selector with API data
function setupPanelSelector(solarPotential) {
    // Use actual panels array length, not maxArrayPanelsCount
    const actualPanels = solarPotential.solarPanels || [];
    maxPanels = actualPanels.length;
    
    console.log('Setting up panel selector:', {
        actualPanelsCount: maxPanels,
        maxArrayPanelsCount: solarPotential.maxArrayPanelsCount
    });
    
    const slider = document.getElementById('panelCountSlider');
    const maxCountEl = document.getElementById('maxPanelCount');
    const maxLabelEl = document.getElementById('maxPanelCountLabel');
    
    if (slider && maxPanels > 0) {
        slider.max = maxPanels;
        slider.value = Math.round(maxPanels * 0.8); // Default to 80% of max
        
        if (maxCountEl) maxCountEl.textContent = maxPanels;
        if (maxLabelEl) maxLabelEl.textContent = maxPanels;
        
        // Update slider visual style
        updatePanelDisplay(slider.value);
        
        // Trigger initial update
        handlePanelCountChange({ target: slider });
    } else if (slider) {
        // No panels available
        slider.max = 0;
        slider.value = 0;
        if (maxCountEl) maxCountEl.textContent = '0';
        if (maxLabelEl) maxLabelEl.textContent = '0';
    }
}

// Show panel configuration panels (now integrated into roof visualization)
function showPanelPanels() {
    const panelConfigPanel = document.getElementById('panelConfigPanel');
    const roofVisualizationPanel = document.getElementById('roofVisualizationPanel');

    if (panelConfigPanel) {
        panelConfigPanel.classList.add('hidden'); // Hide the old separate panel
    }

    if (roofVisualizationPanel) {
        roofVisualizationPanel.classList.remove('hidden');
        // Initialize roof visualization
        initializeRoofVisualization();
    }
}

// Initialize roof canvas visualization
async function initializeRoofVisualization() {
    if (!roofContexts.base || !currentSolarData) return;
    
    // Clear all canvas layers
    Object.keys(roofContexts).forEach(layer => {
        const context = roofContexts[layer];
        const canvas = roofCanvases[layer];
        if (context && canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    });
    
    // Use simplified visualization approach
    await drawSimplifiedRoofVisualization();
}

// Proper roof visualization using real Google Solar API data
async function drawSimplifiedRoofVisualization() {
    const ctx = roofContexts.base;
    const width = roofCanvases.base.width;
    const height = roofCanvases.base.height;
    
    if (!ctx) return;
    
    console.log('Drawing roof visualization with real API data');
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate building bounds from solar data
    if (currentSolarData && currentSolarData.solarPotential && currentSolarData.solarPotential.solarPanels) {
        await drawRealBuildingWithSatellite(ctx, width, height);
    } else {
        // Fallback for no solar data
        drawNoDataFallback(ctx, width, height);
    }
    
    // Load flux data for heat map overlay if available
    if (currentSolarData.dataLayers && currentSolarData.dataLayers.annualFluxUrl) {
        try {
            const fluxImg = await loadImageViaProxy(currentSolarData.dataLayers.annualFluxUrl, 'flux');
            fluxImage = fluxImg;
            console.log('Flux image loaded for heat map overlay');
        } catch (err) {
            console.warn('Flux overlay not available:', err);
        }
    }
    
    console.log('Roof visualization ready');
}

// Draw real building using satellite imagery and panel bounds
async function drawRealBuildingWithSatellite(ctx, width, height) {
    const solar = currentSolarData.solarPotential;
    const panels = solar.solarPanels || [];
    const buildingCenter = currentSolarData.center;
    
    if (panels.length === 0 || !buildingCenter) {
        drawNoDataFallback(ctx, width, height);
        return;
    }
    
    console.log('Drawing real building with satellite imagery', {
        panelCount: panels.length,
        center: buildingCenter
    });
    
    // Calculate bounds from all panels
    const bounds = calculatePanelBounds(panels);
    console.log('Panel bounds:', bounds);
    
    // Store bounds globally for panel coordinate conversion
    window.buildingBounds = bounds;
    window.canvasDimensions = { width, height };
    
    // Try to load Google Static Maps API satellite image
    try {
        const satelliteImg = await loadGoogleSatelliteImage(buildingCenter, bounds, width, height);
        if (satelliteImg) {
            ctx.drawImage(satelliteImg, 0, 0, width, height);
            console.log('Satellite imagery loaded successfully');
            return;
        }
    } catch (err) {
        console.warn('Could not load satellite imagery:', err);
    }
    
    // Fallback: Draw satellite-style background with building outline
    drawSatelliteStyleBackground(ctx, width, height, bounds);
}

// Calculate bounds from all solar panels
function calculatePanelBounds(panels) {
    if (panels.length === 0) return null;
    
    let minLat = panels[0].center.latitude;
    let maxLat = panels[0].center.latitude;
    let minLng = panels[0].center.longitude;
    let maxLng = panels[0].center.longitude;
    
    for (const panel of panels) {
        const lat = panel.center.latitude;
        const lng = panel.center.longitude;
        
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    }
    
    // Add generous padding to prevent overlapping
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    
    // Use minimum padding to ensure good visualization
    const minLatPadding = Math.max(latDiff * 0.5, 0.0001); // At least 50% padding or 0.0001 degrees
    const minLngPadding = Math.max(lngDiff * 0.5, 0.0001);
    
    const latPadding = minLatPadding;
    const lngPadding = minLngPadding;
    
    return {
        minLat: minLat - latPadding,
        maxLat: maxLat + latPadding,
        minLng: minLng - lngPadding,
        maxLng: maxLng + lngPadding,
        centerLat: (minLat + maxLat) / 2,
        centerLng: (minLng + maxLng) / 2
    };
}

// Load Google Static Maps satellite image
async function loadGoogleSatelliteImage(center, bounds, width, height) {
    if (!googleApiKey) return null;
    
    const zoom = calculateOptimalZoom(bounds, width, height);
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
        `center=${center.latitude},${center.longitude}` +
        `&zoom=${zoom}` +
        `&size=${width}x${height}` +
        `&maptype=satellite` +
        `&scale=2` +
        `&key=${googleApiKey}`;
    
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = staticMapUrl;
    });
}

// Calculate optimal zoom level for the bounds
function calculateOptimalZoom(bounds, width, height) {
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    
    // Rough zoom calculation
    const latZoom = Math.floor(Math.log2(360 / latDiff)) - 1;
    const lngZoom = Math.floor(Math.log2(360 / lngDiff)) - 1;
    
    return Math.max(15, Math.min(21, Math.min(latZoom, lngZoom)));
}

// Fallback satellite-style background
function drawSatelliteStyleBackground(ctx, width, height, bounds) {
    // Create realistic satellite-like gradient
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
    gradient.addColorStop(0, '#d4d4aa');
    gradient.addColorStop(0.3, '#b8b894');
    gradient.addColorStop(0.6, '#a0a080');
    gradient.addColorStop(1, '#8a8a6a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add some texture to look like satellite imagery
    ctx.fillStyle = 'rgba(100, 100, 60, 0.1)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 3 + 1;
        ctx.fillRect(x, y, size, size);
    }
    
    // Draw building outline based on bounds
    if (bounds) {
        const margin = 30;
        ctx.strokeStyle = '#555544';
        ctx.lineWidth = 2;
        ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
        
        ctx.fillStyle = 'rgba(80, 80, 60, 0.3)';
        ctx.fillRect(margin, margin, width - margin * 2, height - margin * 2);
    }
}

// Fallback when no solar data is available
function drawNoDataFallback(ctx, width, height) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No solar panel data available', width/2, height/2 - 10);
    ctx.font = '12px sans-serif';
    ctx.fillText('Please analyze a different location', width/2, height/2 + 15);
}

// Helper function to load image via server proxy
async function loadImageViaProxy(geoTiffUrl, type) {
    try {
        // Request the server to fetch and convert the GeoTIFF to an image
        const response = await fetch(`/api/solar/image-proxy?url=${encodeURIComponent(geoTiffUrl)}&type=${type}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load image: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(imageUrl); // Clean up
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(imageUrl); // Clean up
                reject(new Error(`Failed to load image: ${type}`));
            };
            img.src = imageUrl;
        });
        
    } catch (error) {
        console.error(`Error loading ${type} image via proxy:`, error);
        throw error;
    }
}


// Draw basic roof representation (LEGACY - redirects to enhanced fallback)
function drawBasicRoof() {
    console.log('drawBasicRoof called - redirecting to enhanced fallback');
    drawEnhancedFallbackRoof();
}

// Enhanced fallback roof visualization when no satellite imagery is available
function drawEnhancedFallbackRoof() {
    if (!roofContexts.base) return;

    const width = roofCanvases.base.width;
    const height = roofCanvases.base.height;
    const ctx = roofContexts.base;
    const padding = 20;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f1f5f9');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw main roof structure
    const roofCenterX = width / 2;
    const roofTopY = padding + 30;
    const roofBottomY = height - padding - 30;
    const roofLeftX = padding + 20;
    const roofRightX = width - padding - 20;

    // Roof outline (gabled roof)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#d1d5db';

    ctx.beginPath();
    ctx.moveTo(roofLeftX, roofBottomY);
    ctx.lineTo(roofCenterX, roofTopY);
    ctx.lineTo(roofRightX, roofBottomY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Add roof shading for depth
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(roofLeftX, roofBottomY);
    ctx.lineTo(roofCenterX, roofTopY);
    ctx.lineTo(roofRightX, roofBottomY);
    ctx.stroke();

    // Add shingles pattern
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 0.5;
    const shingleSpacing = 8;
    for (let y = roofTopY + 10; y < roofBottomY; y += shingleSpacing) {
        const ratio = (y - roofTopY) / (roofBottomY - roofTopY);
        const startX = roofLeftX + (roofCenterX - roofLeftX) * ratio;
        const endX = roofRightX - (roofRightX - roofCenterX) * ratio;

        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }

    // Draw house base
    const houseLeftX = roofLeftX + 20;
    const houseRightX = roofRightX - 20;
    const houseTopY = roofBottomY + 10;
    const houseBottomY = height - padding;

    ctx.fillStyle = '#f9fafb';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.fillRect(houseLeftX, houseTopY, houseRightX - houseLeftX, houseBottomY - houseTopY);
    ctx.strokeRect(houseLeftX, houseTopY, houseRightX - houseLeftX, houseBottomY - houseTopY);

    // Add windows
    const windowWidth = 25;
    const windowHeight = 20;
    const windowY = houseTopY + (houseBottomY - houseTopY) * 0.25;

    // Left window
    const leftWindowX = houseLeftX + (houseRightX - houseLeftX) * 0.25 - windowWidth / 2;
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(leftWindowX, windowY, windowWidth, windowHeight);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftWindowX, windowY, windowWidth, windowHeight);
    ctx.strokeRect(leftWindowX + windowWidth / 2, windowY, 0, windowHeight);

    // Right window
    const rightWindowX = houseLeftX + (houseRightX - houseLeftX) * 0.75 - windowWidth / 2;
    ctx.fillRect(rightWindowX, windowY, windowWidth, windowHeight);
    ctx.strokeRect(rightWindowX, windowY, windowWidth, windowHeight);
    ctx.strokeRect(rightWindowX + windowWidth / 2, windowY, 0, windowHeight);

    // Add friendly message
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Solar Analysis Ready', width / 2, height - 15);

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('(Interactive panels will appear here)', width / 2, height - 2);
}

// Update roof visualization with selected panels (optimized - don't redraw background)
async function updateRoofVisualization(selectedPanels) {
    if (!roofContexts.base || maxPanels === 0) return;
    
    // Only redraw background if it's the first time or specifically requested
    if (!window.backgroundDrawn) {
        await drawSimplifiedRoofVisualization();
        window.backgroundDrawn = true;
    }
    
    // Update flux overlay if enabled
    updateFluxOverlay();
    
    // Always clear and redraw panels layer
    if (roofContexts.panels) {
        const width = roofCanvases.panels.width;
        const height = roofCanvases.panels.height;
        roofContexts.panels.clearRect(0, 0, width, height);
    }
    
    if (selectedPanels > 0) {
        drawSolarPanelsOnRealRoof(selectedPanels);
    }
}

// Separate function for flux overlay updates
function updateFluxOverlay() {
    if (!roofContexts.flux) return;
    
    const width = roofCanvases.flux.width;
    const height = roofCanvases.flux.height;
    roofContexts.flux.clearRect(0, 0, width, height);
    
    if (showFluxOverlay && fluxImage) {
        console.log('Drawing flux overlay');
        roofContexts.flux.globalAlpha = 0.7; // Make it semi-transparent so background shows through
        roofContexts.flux.drawImage(fluxImage, 0, 0, width, height);
        roofContexts.flux.globalAlpha = 1.0; // Reset alpha
    }
}

// Draw solar panels on the roof (LEGACY - redirects to new system)
function drawSolarPanels(panelCount) {
    console.log('drawSolarPanels called - redirecting to new system');
    drawBasicPanelsOnLayer(panelCount);
}

// Draw solar panels using actual coordinates from Google Solar API
function drawSolarPanelsOnRealRoof(selectedPanels) {
    if (!roofContexts.panels || !currentSolarData.solarPotential) return;
    
    const solarPotential = currentSolarData.solarPotential;
    const panels = solarPotential.solarPanels || [];
    
    // Clear panels layer first
    const width = roofCanvases.panels.width;
    const height = roofCanvases.panels.height;
    roofContexts.panels.clearRect(0, 0, width, height);
    
    if (panels.length === 0) {
        console.log('No solar panels data available');
        return;
    }
    
    // Sort panels by energy production (highest first)
    const sortedPanels = [...panels].sort((a, b) => 
        (b.yearlyEnergyDcKwh || 0) - (a.yearlyEnergyDcKwh || 0)
    );
    
    // Take only the first N panels based on slider
    const panelsToShow = sortedPanels.slice(0, selectedPanels);
    
    console.log(`Drawing ${panelsToShow.length} real panels from API data`);
    
    // Draw each panel at its actual GPS coordinates
    drawRealPanelsAtCoordinates(panelsToShow, roofContexts.panels, width, height);
}

// Convert GPS coordinates to canvas coordinates and draw panels
function drawRealPanelsAtCoordinates(panels, ctx, canvasWidth, canvasHeight) {
    const bounds = window.buildingBounds;
    if (!bounds) {
        console.error('Building bounds not available for coordinate conversion');
        return;
    }
    
    // Standard solar panel dimensions (approximately 2m x 1m)
    const panelWidthMeters = 1.65; // Standard panel width
    const panelHeightMeters = 0.99; // Standard panel height
    
    panels.forEach((panel, index) => {
        const coords = latLngToCanvasCoords(
            panel.center.latitude, 
            panel.center.longitude, 
            bounds, 
            canvasWidth, 
            canvasHeight
        );
        
        if (coords) {
            // Calculate panel size on canvas based on zoom level
            const panelSize = calculatePanelSizeOnCanvas(bounds, canvasWidth, canvasHeight, panelWidthMeters, panelHeightMeters);
            
            // Color based on energy production
            const efficiency = (panel.yearlyEnergyDcKwh || 0) / 800; // Normalize to 0-1
            const panelColor = getPanelColorByEfficiency(Math.min(efficiency, 1));
            
            // Draw panel
            drawPanelRectangle(ctx, coords.x, coords.y, panelSize.width, panelSize.height, 
                            panel.orientation || 'LANDSCAPE', panelColor, index);
        }
    });
    
    // Add panel count overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, canvasHeight - 40, 200, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${panels.length} Solar Panels Shown`, 15, canvasHeight - 20);
}

// Convert latitude/longitude to canvas x/y coordinates
function latLngToCanvasCoords(lat, lng, bounds, canvasWidth, canvasHeight) {
    if (!bounds) return null;
    
    // Convert lat/lng to normalized coordinates (0-1)
    const normalizedX = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    const normalizedY = (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat); // Flip Y axis
    
    // Convert to canvas coordinates
    const x = normalizedX * canvasWidth;
    const y = normalizedY * canvasHeight;
    
    return { x, y };
}

// Calculate how big a panel should appear on canvas based on real-world size
function calculatePanelSizeOnCanvas(bounds, canvasWidth, canvasHeight, panelWidthMeters, panelHeightMeters) {
    // Rough conversion: 1 degree lat ≈ 111km, lng varies by latitude
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    
    // Approximate meters per degree at this latitude
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos(bounds.centerLat * Math.PI / 180);
    
    // Calculate panel dimensions in canvas pixels
    const panelWidthPixels = (panelWidthMeters / metersPerDegreeLng) * (canvasWidth / lngDiff);
    const panelHeightPixels = (panelHeightMeters / metersPerDegreeLat) * (canvasHeight / latDiff);
    
    // Scale factor to make panels more visible on larger canvas
    const scaleFactor = Math.min(canvasWidth / 400, canvasHeight / 300); // Scale relative to original 400x300
    
    return {
        width: Math.max(8, Math.min(40, panelWidthPixels * scaleFactor)), // Min 8px, max 40px
        height: Math.max(6, Math.min(30, panelHeightPixels * scaleFactor)) // Min 6px, max 30px
    };
}

// Draw individual panel rectangle
function drawPanelRectangle(ctx, x, y, width, height, orientation, color, index) {
    // Adjust position to center the panel
    const panelX = x - width / 2;
    const panelY = y - height / 2;
    
    // Draw panel background
    ctx.fillStyle = color;
    ctx.fillRect(panelX, panelY, width, height);
    
    // Draw panel border
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, width, height);
    
    // Draw panel grid lines for detail (if big enough)
    if (width > 8 && height > 6) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        
        // Draw grid
        const gridLines = Math.min(4, Math.floor(width / 8));
        for (let i = 1; i < gridLines; i++) {
            const lineX = panelX + (i * width) / gridLines;
            ctx.beginPath();
            ctx.moveTo(lineX, panelY);
            ctx.lineTo(lineX, panelY + height);
            ctx.stroke();
        }
        
        const gridRows = Math.min(3, Math.floor(height / 6));
        for (let i = 1; i < gridRows; i++) {
            const lineY = panelY + (i * height) / gridRows;
            ctx.beginPath();
            ctx.moveTo(panelX, lineY);
            ctx.lineTo(panelX + width, lineY);
            ctx.stroke();
        }
    }
}

// Get panel color based on efficiency
function getPanelColorByEfficiency(efficiency) {
    if (efficiency > 0.8) return '#10b981'; // High efficiency - emerald green
    if (efficiency > 0.6) return '#3b82f6'; // Good efficiency - blue
    if (efficiency > 0.4) return '#f59e0b'; // Medium efficiency - amber
    if (efficiency > 0.2) return '#ef4444'; // Lower efficiency - red
    return '#6b7280'; // Very low efficiency - gray
}

// Draw panels using Google Solar API panel configurations (NEW APPROACH)
function drawPanelsFromApiConfigs(selectedPanels, panelConfigs) {
    if (!roofContexts.panels) return;
    
    const ctx = roofContexts.panels;
    const width = roofCanvases.panels.width;
    const height = roofCanvases.panels.height;
    
    console.log('API Panel Configs:', panelConfigs);
    
    // Find the best configuration for the requested number of panels
    let bestConfig = null;
    let closestCount = 0;
    
    for (const config of panelConfigs) {
        const configPanelCount = config.panelsCount || 0;
        if (configPanelCount >= selectedPanels) {
            if (!bestConfig || configPanelCount < bestConfig.panelsCount) {
                bestConfig = config;
            }
        } else if (configPanelCount > closestCount) {
            closestCount = configPanelCount;
            if (!bestConfig) bestConfig = config;
        }
    }
    
    if (!bestConfig) {
        console.log('No suitable panel configuration found, using fallback');
        drawBasicPanelsOnLayer(selectedPanels);
        return;
    }
    
    console.log('Using panel configuration:', bestConfig);
    
    // Draw panels from the selected configuration
    if (bestConfig.roofSegmentSummaries) {
        drawPanelsFromRoofSegments(selectedPanels, bestConfig.roofSegmentSummaries, ctx, width, height);
    }
}

// Draw panels using roof segment data from Google Solar API
function drawPanelsFromRoofSegments(selectedPanels, roofSegments, ctx, canvasWidth, canvasHeight) {
    let panelsPlaced = 0;
    
    // Sort segments by their efficiency (azimuth and pitch)
    const sortedSegments = [...roofSegments].sort((a, b) => {
        const efficiencyA = calculatePanelEfficiency(a.azimuthDegrees, a.pitchDegrees);
        const efficiencyB = calculatePanelEfficiency(b.azimuthDegrees, b.pitchDegrees);
        return efficiencyB - efficiencyA; // Best efficiency first
    });
    
    for (const segment of sortedSegments) {
        if (panelsPlaced >= selectedPanels) break;
        
        const panelsForThisSegment = Math.min(
            segment.panelsCount, 
            selectedPanels - panelsPlaced
        );
        
        if (panelsForThisSegment > 0) {
            drawPanelsOnSegment(segment, panelsForThisSegment, ctx, canvasWidth, canvasHeight, panelsPlaced);
            panelsPlaced += panelsForThisSegment;
        }
    }
    
    // Add panel count overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvasHeight - 35, 150, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${selectedPanels} Solar Panels`, 15, canvasHeight - 18);
}

// Draw panels on a specific roof segment
function drawPanelsOnSegment(segment, panelCount, ctx, canvasWidth, canvasHeight, offset = 0) {
    // Calculate panel layout for this segment
    const cols = Math.min(Math.ceil(Math.sqrt(panelCount)), 6);
    const rows = Math.ceil(panelCount / cols);
    
    // Map segment to a portion of the canvas
    // This is simplified - ideally we'd use actual geometry from the API
    const segmentIndex = segment.segmentIndex || offset % 4;
    const segmentWidth = canvasWidth / 2 - 20;
    const segmentHeight = canvasHeight / 2 - 20;
    
    const segmentX = (segmentIndex % 2) * (canvasWidth / 2) + 15;
    const segmentY = Math.floor(segmentIndex / 2) * (canvasHeight / 2) + 15;
    
    const panelWidth = Math.max((segmentWidth - 10) / cols, 8);
    const panelHeight = Math.max((segmentHeight - 10) / rows, 6);
    
    // Get panel efficiency for coloring
    const efficiency = calculatePanelEfficiency(segment.azimuthDegrees, segment.pitchDegrees);
    const panelColor = getPanelColor(efficiency);
    
    ctx.fillStyle = panelColor;
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    
    let panelsDrawn = 0;
    for (let row = 0; row < rows && panelsDrawn < panelCount; row++) {
        for (let col = 0; col < cols && panelsDrawn < panelCount; col++) {
            const x = segmentX + col * (panelWidth + 2);
            const y = segmentY + row * (panelHeight + 2);
            
            // Draw panel with rounded corners
            drawRoundedRect(ctx, x, y, panelWidth, panelHeight, 2);
            ctx.fill();
            ctx.stroke();
            
            // Add subtle shading effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            drawRoundedRect(ctx, x + 1, y + 1, panelWidth - 2, 2, 1);
            ctx.fill();
            
            ctx.fillStyle = panelColor; // Reset for next panel
            panelsDrawn++;
        }
    }
}

// Helper function to draw rounded rectangles
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Fallback function for basic panel placement on the panels layer
function drawBasicPanelsOnLayer(selectedPanels) {
    if (!roofContexts.panels) return;
    
    const ctx = roofContexts.panels;
    const width = roofCanvases.panels.width;
    const height = roofCanvases.panels.height;
    const padding = 30;
    
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    
    // Calculate optimal layout
    const cols = Math.min(Math.ceil(Math.sqrt(selectedPanels * (availableWidth / availableHeight))), 10);
    const rows = Math.ceil(selectedPanels / cols);
    
    const panelWidth = Math.max((availableWidth - cols * 2) / cols, 12);
    const panelHeight = Math.max((availableHeight - rows * 2) / rows, 9);
    
    const startX = padding + (availableWidth - (cols * panelWidth + (cols - 1) * 2)) / 2;
    const startY = padding + (availableHeight - (rows * panelHeight + (rows - 1) * 2)) / 2;
    
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    
    let panelsDrawn = 0;
    for (let row = 0; row < rows && panelsDrawn < selectedPanels; row++) {
        for (let col = 0; col < cols && panelsDrawn < selectedPanels; col++) {
            const x = startX + col * (panelWidth + 2);
            const y = startY + row * (panelHeight + 2);
            
            drawRoundedRect(ctx, x, y, panelWidth, panelHeight, 2);
            ctx.fill();
            ctx.stroke();
            
            panelsDrawn++;
        }
    }
    
    // Add count overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, height - 35, 150, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${selectedPanels} Solar Panels`, 15, height - 18);
}


// Calculate panel efficiency based on roof orientation
function calculatePanelEfficiency(azimuth, pitch) {
    // Optimal: South-facing (180°), 30° pitch
    const optimalAzimuth = 180;
    const optimalPitch = 30;
    
    const azimuthDiff = Math.abs(azimuth - optimalAzimuth);
    const pitchDiff = Math.abs(pitch - optimalPitch);
    
    // Simple efficiency calculation (0.6 to 1.0)
    const azimuthEfficiency = Math.max(0.6, 1 - (azimuthDiff / 180) * 0.4);
    const pitchEfficiency = Math.max(0.6, 1 - (pitchDiff / 60) * 0.4);
    
    return (azimuthEfficiency + pitchEfficiency) / 2;
}

// Get panel color based on efficiency
function getPanelColor(efficiency) {
    if (efficiency > 0.9) return '#10b981'; // High efficiency - green
    if (efficiency > 0.8) return '#3b82f6'; // Good efficiency - blue
    if (efficiency > 0.7) return '#f59e0b'; // Medium efficiency - orange
    return '#ef4444'; // Lower efficiency - red
}
