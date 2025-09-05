let map;
let currentMarker;
let savingsChart;

document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
});

function initializeMap() {
    map = L.map('map').setView([37.7749, -122.4194], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        analyzeSolarPotential(lat, lng);
        
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        
        currentMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`Analyzing solar potential for<br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
            .openPopup();
    });
}

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
            map.setView([coords.lat, coords.lng], 18);
            analyzeSolarPotential(coords.lat, coords.lng);
            
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            
            currentMarker = L.marker([coords.lat, coords.lng]).addTo(map)
                .bindPopup(`Solar analysis for:<br>${address}`)
                .openPopup();
        }
    } catch (error) {
        alert('Could not find the specified address');
    }
}

async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
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

        displayResults(buildingData);
        
        const dataLayersResponse = await fetchDataLayers(lat, lng);
        
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