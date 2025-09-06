let map;
let currentMarker;
let savingsChart;
let googleApiKey;

document.addEventListener('DOMContentLoaded', async function() {
    // Load Google API key and initialize Google Maps
    await loadGoogleMapsAPI();
    setupEventListeners();
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

async function analyzeSolarPotential(lat, lng) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsPanel = document.getElementById('resultsPanel');
    const savingsPanel = document.getElementById('savingsPanel');
    
    loadingIndicator.classList.remove('hidden');
    resultsPanel.classList.add('hidden');
    savingsPanel.classList.add('hidden');

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
        }
        
        // Store combined data and display results
        currentSolarData = combinedData;
        displayResults(combinedData);
        
        loadingIndicator.classList.add('hidden');
        resultsPanel.classList.remove('hidden');
        savingsPanel.classList.remove('hidden');

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
        
        ${solar.financialAnalyses && solar.financialAnalyses.length > 0 ? `
        <div class="mt-4 p-4 bg-gray-50 rounded">
            <h4 class="font-medium mb-3">💰 Financial Analysis</h4>
            <div class="space-y-2">
                ${solar.financialAnalyses.map(analysis => `
                    <div class="flex justify-between">
                        <span class="text-sm">20-year savings:</span>
                        <span class="font-medium text-green-600">$${Math.round(analysis.cashPurchaseSavings?.savings?.savingsLifetime?.units || 0)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-sm">Payback period:</span>
                        <span class="font-medium">${Math.round(analysis.cashPurchaseSavings?.paybackYears || 0)} years</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;

    createSavingsChart(solar);
}

function createSavingsChart(solarData) {
    const ctx = document.getElementById('savingsChart');
    
    if (savingsChart) {
        savingsChart.destroy();
    }

    const yearlyGeneration = (solarData.maxArrayAreaMeters2 || 0) * 150;
    const yearlySavings = yearlyGeneration * 0.12; // Assume $0.12 per kWh
    
    const years = Array.from({length: 20}, (_, i) => i + 1);
    const cumulativeSavings = years.map(year => yearlySavings * year);

    savingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Cumulative Savings ($)',
                data: cumulativeSavings,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Projected Solar Savings Over Time'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
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

// Add to existing setupEventListeners function
const originalSetupEventListeners = setupEventListeners;
setupEventListeners = function() {
    originalSetupEventListeners();
    setupPanelConfiguration();
};

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
    
    // Redraw the roof with or without flux overlay
    const slider = document.getElementById('panelCountSlider');
    if (slider) {
        const selectedPanels = parseInt(slider.value);
        updateRoofVisualization(selectedPanels);
    } else {
        // Just redraw the roof background
        if (satelliteImage) {
            drawSatelliteRoof();
        } else {
            drawBasicRoof();
        }
    }
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
    const yearlySavings = panelGeneration * 0.12; // $0.12 per kWh
    const co2Offset = panelGeneration * 0.4; // 0.4 kg CO2 per kWh
    const coverage = maxPanels > 0 ? (selectedPanels / maxPanels) * 100 : 0;
    
    // Update display elements
    document.getElementById('liveGeneration').textContent = Math.round(panelGeneration).toLocaleString() + ' kWh';
    document.getElementById('liveSavings').textContent = '$' + Math.round(yearlySavings).toLocaleString();
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
    maxPanels = solarPotential.maxArrayPanelsCount || 0;
    
    const slider = document.getElementById('panelCountSlider');
    const maxCountEl = document.getElementById('maxPanelCount');
    const maxLabelEl = document.getElementById('maxPanelCountLabel');
    
    if (slider && maxPanels > 0) {
        slider.max = maxPanels;
        slider.value = Math.round(maxPanels * 0.8); // Default to 80% of max
        
        if (maxCountEl) maxCountEl.textContent = maxPanels;
        if (maxLabelEl) maxLabelEl.textContent = maxPanels;
        
        // Trigger initial update
        handlePanelCountChange({ target: slider });
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
    
    // Load satellite imagery if available
    if (currentSolarData.dataLayers && currentSolarData.dataLayers.rgbUrl) {
        await loadSatelliteImagery();
    } else {
        // Fallback to enhanced roof outline
        drawEnhancedFallbackRoof();
    }
}

// Load satellite imagery from Google Solar API
async function loadSatelliteImagery() {
    const dataLayers = currentSolarData.dataLayers;

    // Show loading state
    if (roofContext) {
        const width = roofCanvas.width;
        const height = roofCanvas.height;

        roofContext.clearRect(0, 0, width, height);
        roofContext.fillStyle = '#f8fafc';
        roofContext.fillRect(0, 0, width, height);

        roofContext.fillStyle = '#64748b';
        roofContext.font = '14px sans-serif';
        roofContext.textAlign = 'center';
        roofContext.fillText('Loading satellite imagery...', width/2, height/2);
    }

    try {
        console.log('Loading satellite imagery with data layers:', dataLayers);

        const loadPromises = [];

        // Load RGB satellite image via our server proxy
        if (dataLayers.rgbUrl) {
            console.log('Loading RGB image from:', dataLayers.rgbUrl);
            loadPromises.push(
                loadImageViaProxy(dataLayers.rgbUrl, 'rgb')
                    .then(img => { satelliteImage = img; console.log('RGB image loaded successfully'); })
                    .catch(err => console.warn('Failed to load RGB image:', err))
            );
        }

        // Load mask (roof boundaries)
        if (dataLayers.maskUrl) {
            console.log('Loading mask image from:', dataLayers.maskUrl);
            loadPromises.push(
                loadImageViaProxy(dataLayers.maskUrl, 'mask')
                    .then(img => { maskImage = img; console.log('Mask image loaded successfully'); })
                    .catch(err => console.warn('Failed to load mask image:', err))
            );
        }

        // Load flux data (solar heat map)
        if (dataLayers.annualFluxUrl) {
            console.log('Loading flux image from:', dataLayers.annualFluxUrl);
            loadPromises.push(
                loadImageViaProxy(dataLayers.annualFluxUrl, 'flux')
                    .then(img => { fluxImage = img; console.log('Flux image loaded successfully'); })
                    .catch(err => console.warn('Failed to load flux image:', err))
            );
        }

        // Wait for all images to load (or fail)
        await Promise.allSettled(loadPromises);

        console.log('Satellite imagery loading complete. Available images:',
            { rgb: !!satelliteImage, mask: !!maskImage, flux: !!fluxImage });

        // Draw the satellite view
        if (satelliteImage || maskImage || fluxImage) {
            drawSatelliteRoof();
        } else {
            // No images loaded successfully
            drawEnhancedFallbackRoof();
        }

    } catch (error) {
        console.error('Error loading satellite imagery:', error);
        drawEnhancedFallbackRoof();
    }
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

// Helper function to load image from URL (fallback)
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Draw satellite roof with imagery using layered approach
function drawSatelliteRoof() {
    if (!roofContexts.base) return;
    
    const width = roofCanvases.base.width;
    const height = roofCanvases.base.height;
    
    // Layer 1: Base satellite image
    if (satelliteImage && roofContexts.base) {
        console.log('Drawing satellite image on base layer...');
        roofContexts.base.clearRect(0, 0, width, height);
        roofContexts.base.drawImage(satelliteImage, 0, 0, width, height);
    }
    
    // Layer 2: Roof mask overlay
    if (maskImage && roofContexts.mask) {
        console.log('Drawing roof mask on mask layer...');
        roofContexts.mask.clearRect(0, 0, width, height);
        roofContexts.mask.drawImage(maskImage, 0, 0, width, height);
    }
    
    // Layer 3: Solar flux heat map (only if enabled)
    if (roofContexts.flux) {
        roofContexts.flux.clearRect(0, 0, width, height);
        if (showFluxOverlay && fluxImage) {
            console.log('Drawing flux overlay on flux layer...');
            roofContexts.flux.drawImage(fluxImage, 0, 0, width, height);
        }
    }
    
    // Layer 4: Panels layer (will be drawn separately)
    if (roofContexts.panels) {
        roofContexts.panels.clearRect(0, 0, width, height);
    }
    
    // Fallback message if no satellite image
    if (!satelliteImage && roofContexts.base) {
        console.log('No satellite image available, showing placeholder...');
        roofContexts.base.fillStyle = '#f8fafc';
        roofContexts.base.fillRect(0, 0, width, height);
        
        roofContexts.base.fillStyle = '#64748b';
        roofContexts.base.font = '16px sans-serif';
        roofContexts.base.textAlign = 'center';
        roofContexts.base.fillText('Loading satellite imagery...', width/2, height/2 - 10);
        roofContexts.base.font = '12px sans-serif';
        roofContexts.base.fillText('(Satellite data may not be available for all locations)', width/2, height/2 + 15);
    }
}

// Draw basic roof representation
function drawBasicRoof() {
    if (!roofContext) return;

    const width = roofCanvas.width;
    const height = roofCanvas.height;
    const padding = 40;

    // Clear canvas with light background
    roofContext.fillStyle = '#f8fafc';
    roofContext.fillRect(0, 0, width, height);

    // Draw roof outline (simple rectangle for now)
    const roofWidth = width - padding * 2;
    const roofHeight = height - padding * 2;
    const roofX = padding;
    const roofY = padding;

    // Roof background
    roofContext.fillStyle = '#e2e8f0';
    roofContext.fillRect(roofX, roofY, roofWidth, roofHeight);

    // Roof border
    roofContext.strokeStyle = '#64748b';
    roofContext.lineWidth = 2;
    roofContext.strokeRect(roofX, roofY, roofWidth, roofHeight);

    // Add roof ridge line for depth
    roofContext.strokeStyle = '#475569';
    roofContext.lineWidth = 1;
    roofContext.beginPath();
    roofContext.moveTo(roofX + roofWidth * 0.5, roofY);
    roofContext.lineTo(roofX + roofWidth * 0.5, roofY + roofHeight);
    roofContext.stroke();
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

// Update roof visualization with selected panels
async function updateRoofVisualization(selectedPanels) {
    if (!roofContext || maxPanels === 0) return;
    
    // Redraw roof background (satellite or basic)
    if (satelliteImage) {
        drawSatelliteRoof();
    } else {
        drawBasicRoof();
    }
    
    if (selectedPanels > 0) {
        drawSolarPanelsOnRealRoof(selectedPanels);
    }
}

// Draw solar panels on the roof
function drawSolarPanels(panelCount) {
    if (!roofContext) return;
    
    const width = roofCanvas.width;
    const height = roofCanvas.height;
    const padding = 40;
    const roofWidth = width - padding * 2;
    const roofHeight = height - padding * 2;
    const roofX = padding;
    const roofY = padding;
    
    // Calculate panel dimensions and layout
    const panelsPerRow = Math.ceil(Math.sqrt(maxPanels * (roofWidth / roofHeight)));
    const rows = Math.ceil(maxPanels / panelsPerRow);
    
    const panelWidth = (roofWidth - 20) / panelsPerRow; // 20px for spacing
    const panelHeight = (roofHeight - 20) / rows;
    
    const startX = roofX + 10;
    const startY = roofY + 10;
    
    // Draw panels
    roofContext.fillStyle = '#3b82f6';
    roofContext.strokeStyle = '#1e40af';
    roofContext.lineWidth = 1;
    
    let panelsDrawn = 0;
    
    for (let row = 0; row < rows && panelsDrawn < panelCount; row++) {
        for (let col = 0; col < panelsPerRow && panelsDrawn < panelCount; col++) {
            const x = startX + col * panelWidth;
            const y = startY + row * panelHeight;
            
            // Panel rectangle
            roofContext.fillRect(x, y, panelWidth - 2, panelHeight - 2);
            roofContext.strokeRect(x, y, panelWidth - 2, panelHeight - 2);
            
            // Panel grid lines for detail
            roofContext.strokeStyle = '#60a5fa';
            roofContext.lineWidth = 0.5;
            
            // Vertical lines
            const verticalLines = 3;
            for (let i = 1; i < verticalLines; i++) {
                const lineX = x + (i * (panelWidth - 2)) / verticalLines;
                roofContext.beginPath();
                roofContext.moveTo(lineX, y);
                roofContext.lineTo(lineX, y + panelHeight - 2);
                roofContext.stroke();
            }
            
            // Horizontal lines
            const horizontalLines = 4;
            for (let i = 1; i < horizontalLines; i++) {
                const lineY = y + (i * (panelHeight - 2)) / horizontalLines;
                roofContext.beginPath();
                roofContext.moveTo(x, lineY);
                roofContext.lineTo(x + panelWidth - 2, lineY);
                roofContext.stroke();
            }
            
            roofContext.strokeStyle = '#1e40af';
            roofContext.lineWidth = 1;
            panelsDrawn++;
        }
    }
    
    // Add panel count text
    roofContext.fillStyle = '#1f2937';
    roofContext.font = '14px sans-serif';
    roofContext.textAlign = 'center';
    roofContext.fillText(
        `${panelCount} Solar Panels`, 
        width / 2, 
        height - 10
    );
}

// Draw solar panels using actual roof segment data
function drawSolarPanelsOnRealRoof(selectedPanels) {
    if (!roofContexts.panels || !currentSolarData.solarPotential) return;
    
    const solarPotential = currentSolarData.solarPotential;
    
    // Clear panels layer first
    const width = roofCanvases.panels.width;
    const height = roofCanvases.panels.height;
    roofContexts.panels.clearRect(0, 0, width, height);
    
    // Use actual panel configurations if available
    if (solarPotential.solarPanelConfigs && solarPotential.solarPanelConfigs.length > 0) {
        console.log('Drawing panels using real API configurations:', solarPotential.solarPanelConfigs);
        drawPanelsFromApiConfigs(selectedPanels, solarPotential.solarPanelConfigs);
    } else {
        // Fallback to basic grid placement
        console.log('Using fallback panel placement');
        drawBasicPanelsOnLayer(selectedPanels);
    }
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

// Legacy function (keep for backwards compatibility but redirect to layers)
function drawPanelsFromConfigs(selectedPanels, panelConfigs) {
    
    const width = roofCanvas.width;
    const height = roofCanvas.height;
    
    let totalPanelsToPlace = selectedPanels;
    let panelsPlaced = 0;
    
    // Sort configurations by panel count (largest first for better placement)
    const sortedConfigs = [...panelConfigs].sort((a, b) => b.panelsCount - a.panelsCount);
    
    for (const config of sortedConfigs) {
        if (panelsPlaced >= selectedPanels) break;
        
        const panelsInThisConfig = Math.min(config.panelsCount, totalPanelsToPlace - panelsPlaced);
        
        if (panelsInThisConfig > 0) {
            // Draw panels for this configuration
            drawPanelsForConfig(config, panelsInThisConfig);
            panelsPlaced += panelsInThisConfig;
        }
    }
    
    // Add panel count text overlay
    roofContext.fillStyle = 'rgba(255, 255, 255, 0.9)';
    roofContext.fillRect(10, height - 40, 120, 30);
    roofContext.fillStyle = '#1f2937';
    roofContext.font = 'bold 14px sans-serif';
    roofContext.textAlign = 'left';
    roofContext.fillText(`${selectedPanels} Solar Panels`, 15, height - 20);
}

// Draw panels for a specific configuration
function drawPanelsForConfig(config, panelCount) {
    if (!roofContext || !config.roofSegmentSummaries) return;
    
    const width = roofCanvas.width;
    const height = roofCanvas.height;
    
    // Distribute panels across roof segments in this configuration
    let panelsRemaining = panelCount;
    
    for (const segment of config.roofSegmentSummaries) {
        if (panelsRemaining <= 0) break;
        
        const segmentPanels = Math.min(segment.panelsCount, panelsRemaining);
        
        if (segmentPanels > 0) {
            drawPanelsForSegment(segment, segmentPanels, width, height);
            panelsRemaining -= segmentPanels;
        }
    }
}

// Draw panels for a specific roof segment
function drawPanelsForSegment(segment, panelCount, canvasWidth, canvasHeight) {
    if (!roofContext) return;
    
    // Use a better distribution approach that doesn't create grid conflicts
    const padding = 20;
    const availableWidth = canvasWidth - (padding * 2);
    const availableHeight = canvasHeight - (padding * 2);
    
    // Calculate optimal panel layout
    const cols = Math.min(Math.ceil(Math.sqrt(panelCount * (availableWidth / availableHeight))), 8);
    const rows = Math.ceil(panelCount / cols);
    
    // Calculate panel dimensions with proper spacing
    const spacing = 2;
    const panelWidth = Math.max((availableWidth - (cols - 1) * spacing) / cols, 20);
    const panelHeight = Math.max((availableHeight - (rows - 1) * spacing) / rows, 15);
    
    // Center the panel array
    const totalWidth = cols * panelWidth + (cols - 1) * spacing;
    const totalHeight = rows * panelHeight + (rows - 1) * spacing;
    const startX = padding + (availableWidth - totalWidth) / 2;
    const startY = padding + (availableHeight - totalHeight) / 2;
    
    // Set panel color based on efficiency (azimuth/pitch affect efficiency)
    const efficiency = calculatePanelEfficiency(segment.azimuthDegrees, segment.pitchDegrees);
    roofContext.fillStyle = getPanelColor(efficiency);
    roofContext.strokeStyle = '#1e40af';
    roofContext.lineWidth = 1;
    
    let panelsDrawn = 0;
    
    for (let row = 0; row < rows && panelsDrawn < panelCount; row++) {
        for (let col = 0; col < cols && panelsDrawn < panelCount; col++) {
            const x = startX + col * (panelWidth + spacing);
            const y = startY + row * (panelHeight + spacing);
            
            // Draw panel
            roofContext.fillRect(x, y, panelWidth, panelHeight);
            roofContext.strokeRect(x, y, panelWidth, panelHeight);
            
            // Add solar cell grid pattern
            roofContext.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            roofContext.lineWidth = 0.5;
            
            // Draw grid lines
            const gridLines = 4;
            for (let i = 1; i < gridLines; i++) {
                // Vertical lines
                const lineX = x + (i * panelWidth) / gridLines;
                roofContext.beginPath();
                roofContext.moveTo(lineX, y);
                roofContext.lineTo(lineX, y + panelHeight);
                roofContext.stroke();
                
                // Horizontal lines
                const lineY = y + (i * panelHeight) / gridLines;
                roofContext.beginPath();
                roofContext.moveTo(x, lineY);
                roofContext.lineTo(x + panelWidth, lineY);
                roofContext.stroke();
            }
            
            roofContext.strokeStyle = '#1e40af';
            roofContext.lineWidth = 1;
            panelsDrawn++;
        }
    }
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
