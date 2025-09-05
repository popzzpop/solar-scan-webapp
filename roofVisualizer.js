import * as THREE from 'three';

class RoofVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.roofMesh = null;
        this.panels = [];
        this.maxPanels = 0;
        this.currentPanelCount = 0;
        this.solarData = null;
        this.panelSize = { width: 1.65, height: 1.0 }; // Standard panel size in meters
        
        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(10, 15, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Controls (basic orbit controls simulation)
        this.setupControls();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        this.animate();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        // Add sun indicator
        const sunGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.copy(directionalLight.position);
        this.scene.add(sun);
    }

    setupControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaMove = {
                    x: e.clientX - previousMousePosition.x,
                    y: e.clientY - previousMousePosition.y
                };

                const deltaRotationQuaternion = new THREE.Quaternion()
                    .setFromEuler(new THREE.Euler(
                        this.toRadians(deltaMove.y * 1),
                        this.toRadians(deltaMove.x * 1),
                        0,
                        'XYZ'
                    ));

                this.camera.quaternion.multiplyQuaternions(deltaRotationQuaternion, this.camera.quaternion);
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Zoom with mouse wheel
        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scale = e.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(scale);
        });
    }

    toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    async loadSolarData(lat, lng, buildingData) {
        this.solarData = buildingData;
        
        if (!buildingData.solarPotential) {
            console.error('No solar potential data available');
            return;
        }

        this.maxPanels = buildingData.solarPotential.maxArrayPanelsCount || 20;
        
        // Update UI
        document.getElementById('maxPanels').textContent = this.maxPanels;
        const slider = document.getElementById('panelSlider');
        slider.max = this.maxPanels;
        slider.value = 0;

        // Create simplified roof geometry
        this.createRoofGeometry(buildingData);
        
        // Setup panel placement grid
        this.setupPanelGrid();
    }

    createRoofGeometry(buildingData) {
        // Create a simplified roof based on building data
        const roofArea = buildingData.solarPotential?.wholeRoofStats?.areaMeters2 || 100;
        const roofSize = Math.sqrt(roofArea);
        
        // Create roof geometry
        const roofGeometry = new THREE.BoxGeometry(roofSize, 0.5, roofSize * 0.7);
        const roofMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            transparent: true,
            opacity: 0.8
        });
        
        this.roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        this.roofMesh.receiveShadow = true;
        this.scene.add(this.roofMesh);

        // Add roof texture overlay to show solar potential
        const overlayGeometry = new THREE.PlaneGeometry(roofSize, roofSize * 0.7);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3
        });
        
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.rotation.x = -Math.PI / 2;
        overlay.position.y = 0.26;
        this.scene.add(overlay);
    }

    setupPanelGrid() {
        if (!this.roofMesh) return;

        // Calculate panel grid based on roof dimensions
        const roofBox = new THREE.Box3().setFromObject(this.roofMesh);
        const roofWidth = roofBox.max.x - roofBox.min.x;
        const roofDepth = roofBox.max.z - roofBox.min.z;

        // Calculate how many panels fit
        const panelsX = Math.floor(roofWidth / this.panelSize.width);
        const panelsZ = Math.floor(roofDepth / this.panelSize.height);
        
        this.panelPositions = [];
        
        for (let x = 0; x < panelsX; x++) {
            for (let z = 0; z < panelsZ; z++) {
                if (this.panelPositions.length >= this.maxPanels) break;
                
                const posX = (x - panelsX / 2) * this.panelSize.width + this.panelSize.width / 2;
                const posZ = (z - panelsZ / 2) * this.panelSize.height + this.panelSize.height / 2;
                
                this.panelPositions.push({
                    x: posX,
                    y: 0.5,
                    z: posZ,
                    efficiency: Math.random() * 0.3 + 0.7 // Random efficiency between 0.7-1.0
                });
            }
        }
    }

    updatePanelCount(count) {
        if (count === this.currentPanelCount) return;

        // Remove excess panels
        while (this.panels.length > count) {
            const panel = this.panels.pop();
            this.scene.remove(panel);
        }

        // Add new panels
        while (this.panels.length < count && this.panels.length < this.panelPositions.length) {
            this.addPanel(this.panels.length);
        }

        this.currentPanelCount = count;
        this.updateEnergyCalculations();
    }

    addPanel(index) {
        if (!this.panelPositions[index]) return;

        const position = this.panelPositions[index];
        
        // Create panel geometry
        const panelGeometry = new THREE.BoxGeometry(
            this.panelSize.width - 0.05,
            0.05,
            this.panelSize.height - 0.05
        );
        
        // Create panel material with efficiency-based color
        const efficiency = position.efficiency;
        const color = new THREE.Color().setHSL(0.6, 1, 0.3 + efficiency * 0.2);
        const panelMaterial = new THREE.MeshLambertMaterial({ color });
        
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.set(position.x, position.y, position.z);
        panel.castShadow = true;
        panel.userData = { efficiency };

        this.scene.add(panel);
        this.panels.push(panel);
    }

    updateEnergyCalculations() {
        if (!this.solarData) return;

        const panelsInstalled = this.currentPanelCount;
        const totalPanels = this.maxPanels;
        
        // Calculate proportional energy generation
        const maxGeneration = (this.solarData.solarPotential?.maxArrayAreaMeters2 || 0) * 200; // kWh per year per m²
        const currentGeneration = (maxGeneration * panelsInstalled) / totalPanels;
        
        // Calculate savings (assuming $0.12 per kWh)
        const annualSavings = currentGeneration * 0.12;

        // Update UI
        document.getElementById('panelCount').textContent = panelsInstalled;
        document.getElementById('annualGeneration').textContent = 
            Math.round(currentGeneration).toLocaleString() + ' kWh';
        document.getElementById('annualSavings').textContent = 
            '$' + Math.round(annualSavings).toLocaleString();
    }

    clearAllPanels() {
        this.updatePanelCount(0);
        document.getElementById('panelSlider').value = 0;
    }

    setMaxPanels() {
        this.updatePanelCount(this.maxPanels);
        document.getElementById('panelSlider').value = this.maxPanels;
    }

    toggle2DView() {
        // Simple camera position toggle
        const button = document.getElementById('toggleView');
        if (button.textContent === '2D View') {
            this.camera.position.set(0, 30, 0);
            this.camera.lookAt(0, 0, 0);
            button.textContent = '3D View';
        } else {
            this.camera.position.set(10, 15, 10);
            this.camera.lookAt(0, 0, 0);
            button.textContent = '2D View';
        }
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    show() {
        document.getElementById('roofVisualizerPanel').classList.remove('hidden');
    }

    hide() {
        document.getElementById('roofVisualizerPanel').classList.add('hidden');
    }
}

export default RoofVisualizer;