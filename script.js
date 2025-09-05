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
        const response = await fetch(`/api/solar/data-layers/${lat}/${lng}?radius=100&view=IMAGERY_AND_ANNUAL_FLUX_LAYERS`);
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
let roofCanvas = null;
let roofContext = null;
let maxPanels = 0;
let satelliteImage = null;
let maskImage = null;
let fluxImage = null;
let showFluxOverlay = false;

// Enhanced setup to include panel configuration
function setupPanelConfiguration() {
    const slider = document.getElementById('panelCountSlider');
    const canvas = document.getElementById('roofCanvas');
    const fluxToggle = document.getElementById('fluxOverlayToggle');
    
    if (canvas) {
        roofCanvas = canvas;
        roofContext = canvas.getContext('2d');
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

// Show panel configuration panels
function showPanelPanels() {
    const panelConfigPanel = document.getElementById('panelConfigPanel');
    const roofVisualizationPanel = document.getElementById('roofVisualizationPanel');
    
    if (panelConfigPanel) {
        panelConfigPanel.classList.remove('hidden');
    }
    
    if (roofVisualizationPanel) {
        roofVisualizationPanel.classList.remove('hidden');
        // Initialize roof visualization
        initializeRoofVisualization();
    }
}

// Initialize roof canvas visualization
async function initializeRoofVisualization() {
    if (!roofContext || !currentSolarData) return;
    
    // Clear canvas
    roofContext.clearRect(0, 0, roofCanvas.width, roofCanvas.height);
    
    // Load satellite imagery if available
    if (currentSolarData.dataLayers && currentSolarData.dataLayers.rgbUrl) {
        await loadSatelliteImagery();
    } else {
        // Fallback to basic roof outline
        drawBasicRoof();
    }
}

// Load satellite imagery from Google Solar API
async function loadSatelliteImagery() {
    const dataLayers = currentSolarData.dataLayers;
    
    try {
        console.log('Loading satellite imagery with data layers:', dataLayers);
        
        // Load RGB satellite image via our server proxy
        if (dataLayers.rgbUrl) {
            console.log('Loading RGB image from:', dataLayers.rgbUrl);
            satelliteImage = await loadImageViaProxy(dataLayers.rgbUrl, 'rgb');
        }
        
        // Load mask (roof boundaries)
        if (dataLayers.maskUrl) {
            console.log('Loading mask image from:', dataLayers.maskUrl);
            maskImage = await loadImageViaProxy(dataLayers.maskUrl, 'mask');
        }
        
        // Load flux data (solar heat map)
        if (dataLayers.annualFluxUrl) {
            console.log('Loading flux image from:', dataLayers.annualFluxUrl);
            fluxImage = await loadImageViaProxy(dataLayers.annualFluxUrl, 'flux');
        }
        
        // Draw the satellite view
        drawSatelliteRoof();
        
    } catch (error) {
        console.error('Error loading satellite imagery:', error);
        // Fallback to basic roof
        drawBasicRoof();
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

// Draw satellite roof with imagery
function drawSatelliteRoof() {
    if (!roofContext) return;
    
    const width = roofCanvas.width;
    const height = roofCanvas.height;
    
    // Clear canvas
    roofContext.clearRect(0, 0, width, height);
    
    // Draw satellite image as background if available
    if (satelliteImage) {
        console.log('Drawing satellite image...');
        roofContext.drawImage(satelliteImage, 0, 0, width, height);
        
        // Apply mask overlay to highlight roof
        if (maskImage) {
            console.log('Applying roof mask...');
            roofContext.globalCompositeOperation = 'source-atop';
            roofContext.drawImage(maskImage, 0, 0, width, height);
            roofContext.globalCompositeOperation = 'source-over';
        }
        
        // Optional: Show solar flux heat map
        if (showFluxOverlay && fluxImage) {
            console.log('Adding flux overlay...');
            roofContext.globalAlpha = 0.7;
            roofContext.globalCompositeOperation = 'multiply';
            roofContext.drawImage(fluxImage, 0, 0, width, height);
            roofContext.globalCompositeOperation = 'source-over';
            roofContext.globalAlpha = 1.0;
        }
    } else {
        console.log('No satellite image available, showing placeholder...');
        // Show a message if no satellite imagery is available
        roofContext.fillStyle = '#f8fafc';
        roofContext.fillRect(0, 0, width, height);
        
        roofContext.fillStyle = '#64748b';
        roofContext.font = '16px sans-serif';
        roofContext.textAlign = 'center';
        roofContext.fillText('Loading satellite imagery...', width/2, height/2 - 10);
        roofContext.font = '12px sans-serif';
        roofContext.fillText('(Satellite data may not be available for all locations)', width/2, height/2 + 15);
    }
    
    // Add a border
    roofContext.strokeStyle = '#e2e8f0';
    roofContext.lineWidth = 2;
    roofContext.strokeRect(0, 0, width, height);
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
    if (!roofContext || !currentSolarData.solarPotential) return;
    
    const solarPotential = currentSolarData.solarPotential;
    
    // Use actual panel configurations if available
    if (solarPotential.solarPanelConfigs && solarPotential.solarPanelConfigs.length > 0) {
        drawPanelsFromConfigs(selectedPanels, solarPotential.solarPanelConfigs);
    } else {
        // Fallback to basic grid placement
        drawSolarPanels(selectedPanels);
    }
}

// Draw panels using Google Solar API panel configurations
function drawPanelsFromConfigs(selectedPanels, panelConfigs) {
    if (!roofContext) return;
    
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