/**
 * 3D Visualization Module
 * Creates and updates a 3D visualization of the plant and irrigation system
 */

const PlantVisualization = {
  scene: null,
  camera: null,
  renderer: null,
  container: null,
  
  // Plant elements
  pot: null,
  soil: null,
  plant: null,
  waterDrops: [],
  
  // Animation properties
  rotationSpeed: 0.005,
  waterAnimation: false,
  waterLevel: 0,
  animationId: null,
  
  // Initialize 3D scene
  init() {
    this.container = document.getElementById('plant-3d-container');
    if (!this.container) return false;
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera setup
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 1.5, 5);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    
    // Lights
    this.addLights();
    
    // Create 3D objects
    this.createPot();
    this.createSoil();
    this.createPlant();
    
    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Start animation
    this.animate();
    
    return true;
  },
  
  // Add lights to the scene
  addLights() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    // Directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);
    
    // Add a soft light from the front
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.3);
    frontLight.position.set(0, 2, 5);
    this.scene.add(frontLight);
  },
  
  // Create pot geometry
  createPot() {
    // Create a cylinder for the pot
    const potGeometry = new THREE.CylinderGeometry(1, 0.7, 1.2, 32);
    const potMaterial = new THREE.MeshLambertMaterial({ color: 0xa85032 });
    this.pot = new THREE.Mesh(potGeometry, potMaterial);
    this.pot.position.y = -0.6;
    this.pot.castShadow = true;
    this.pot.receiveShadow = true;
    this.scene.add(this.pot);
    
    // Add a ring at the top of the pot
    const ringGeometry = new THREE.TorusGeometry(1, 0.1, 16, 100);
    const ringMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0;
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    this.pot.add(ring);
  },
  
  // Create soil in the pot
  createSoil() {
    // Create soil (slightly smaller than pot opening)
    const soilGeometry = new THREE.CylinderGeometry(0.95, 0.95, 0.2, 32);
    const soilMaterial = new THREE.MeshLambertMaterial({ color: 0x3d2817 });
    this.soil = new THREE.Mesh(soilGeometry, soilMaterial);
    this.soil.position.y = 0.1;
    this.soil.castShadow = true;
    this.soil.receiveShadow = true;
    this.scene.add(this.soil);
  },
  
  // Create plant with leaves
  createPlant() {
    // Create a group for the plant
    this.plant = new THREE.Group();
    this.plant.position.y = 0.2;
    this.scene.add(this.plant);
    
    // Create stem
    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.07, 2, 8);
    const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 1;
    stem.castShadow = true;
    this.plant.add(stem);
    
    // Create leaves
    const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x32cd32, side: THREE.DoubleSide });
    
    // Add several leaves
    for (let i = 0; i < 5; i++) {
      const leafGeometry = this.createLeafShape();
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      
      // Position leaf along the stem
      leaf.position.y = 0.6 + (i * 0.3);
      
      // Random rotation and slight tilt
      leaf.rotation.y = Math.random() * Math.PI * 2;
      leaf.rotation.x = Math.PI / 2 - Math.random() * 0.3;
      
      leaf.castShadow = true;
      this.plant.add(leaf);
    }
    
    // Add a flower or bud at the top
    const budGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const budMaterial = new THREE.MeshLambertMaterial({ color: 0xff69b4 });
    const bud = new THREE.Mesh(budGeometry, budMaterial);
    bud.position.y = 2.1;
    bud.castShadow = true;
    this.plant.add(bud);
  },
  
  // Create a leaf shape
  createLeafShape() {
    const shape = new THREE.Shape();
    
    // Define the leaf shape points
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.1, 0.2, 0.3, 0.4, 0.5, 0.2);
    shape.bezierCurveTo(0.7, 0, 0.8, -0.2, 0.5, -0.5);
    shape.bezierCurveTo(0.3, -0.7, 0.1, -0.5, 0, 0);
    
    // Extrude the shape to create a 3D leaf
    const extrudeSettings = {
      steps: 1,
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.02,
      bevelSegments: 2
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  },
  
  // Create water drops
  createWaterDrops() {
    // Clear any existing water drops
    while (this.waterDrops.length > 0) {
      const drop = this.waterDrops.pop();
      this.scene.remove(drop);
    }
    
    // Create new water drops
    const dropGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const dropMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1e90ff, 
      transparent: true, 
      opacity: 0.8 
    });
    
    // Increase number of drops for more visual effect
    for (let i = 0; i < 15; i++) {
      const drop = new THREE.Mesh(dropGeometry, dropMaterial);
      
      // Position drops in a spiral pattern around the plant
      const angle = (i / 15) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.4;
      drop.position.x = Math.cos(angle) * radius;
      drop.position.z = Math.sin(angle) * radius;
      drop.position.y = 3 + Math.random() * 0.5;
      
      // Add random initial velocities for more natural movement
      drop.userData = {
        velocity: 0.03 + Math.random() * 0.04,
        wobble: {
          x: Math.random() * 0.01 - 0.005,
          z: Math.random() * 0.01 - 0.005
        }
      };
      
      this.waterDrops.push(drop);
      this.scene.add(drop);
    }
    
    // Optional: Create a small puddle/water ripple effect
    if (!this.waterRipple) {
      const rippleGeometry = new THREE.CircleGeometry(0.8, 32);
      const rippleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1e90ff, 
        transparent: true, 
        opacity: 0.2,
        side: THREE.DoubleSide
      });
      this.waterRipple = new THREE.Mesh(rippleGeometry, rippleMaterial);
      this.waterRipple.rotation.x = -Math.PI / 2; // Lay flat
      this.waterRipple.position.y = 0.21; // Just above soil
      this.waterRipple.scale.set(0.1, 0.1, 0.1); // Start small
      this.scene.add(this.waterRipple);
    }
  },
  
  // Update visualization based on sensor data
  updateWithSensorData(sensorData) {
    if (!this.scene) return;
    
    // Update soil color based on moisture level
    if (this.soil && sensorData.soilMoisture !== undefined) {
      const moisture = sensorData.soilMoisture;
      
      // Interpolate color based on thresholds
      let soilColor;
      if (moisture < 30) {
        // Dry soil - light brown
        soilColor = new THREE.Color(0x8b4513);
      } else if (moisture > 55) {
        // Wet soil - dark brown
        soilColor = new THREE.Color(0x2e1a0a);
      } else {
        // Calculate intermediate color for 30-55% range
        const normalizedValue = (moisture - 30) / 25; // Map 30-55 to 0-1
        const dryColor = new THREE.Color(0x8b4513); // Light brown for dry soil
        const wetColor = new THREE.Color(0x4d2b10); // Medium brown for moist soil
        
        soilColor = new THREE.Color();
        soilColor.lerpColors(dryColor, wetColor, normalizedValue);
      }
      
      // Update soil color
      this.soil.material.color = soilColor;
    }
    
    // Start/stop water animation based on pump status
    if (sensorData.pumpStatus !== undefined) {
      if (sensorData.pumpStatus && !this.waterAnimation) {
        this.startWaterAnimation();
      } else if (!sensorData.pumpStatus && this.waterAnimation) {
        this.stopWaterAnimation();
      }
    }
    
    // Update plant color/size based on moisture level
    if (this.plant && sensorData.soilMoisture !== undefined) {
      const moisture = sensorData.soilMoisture;
      let plantHealth;
      
      // Calculate plant health based on moisture thresholds
      if (moisture < 15) {
        // Very dry, plant is suffering
        plantHealth = 0.2;
      } else if (moisture < 30) {
        // Dry, but not critical
        plantHealth = 0.5 + ((moisture - 15) / 30) * 0.3;
      } else if (moisture <= 55) {
        // Optimal range
        plantHealth = 0.8 + ((moisture - 30) / 25) * 0.2;
      } else if (moisture <= 75) {
        // Wet but still ok
        plantHealth = 0.8 - ((moisture - 55) / 20) * 0.3;
      } else {
        // Too wet, plant health declining
        plantHealth = 0.5 - ((moisture - 75) / 25) * 0.3;
      }
      
      // Ensure health is within 0-1 range
      plantHealth = Math.max(0, Math.min(1, plantHealth));
      
      // Scale plant based on health
      const scale = 0.7 + plantHealth * 0.5;
      this.plant.scale.set(scale, scale, scale);
      
      // Adjust plant color based on health
      this.plant.children.forEach(child => {
        if (child.material && child.material.color) {
          // Only adjust green elements (stem and leaves)
          if (child.material.color.g > 0.5) {
            const healthColor = new THREE.Color();
            const poorColor = new THREE.Color(0x97a97c); // Yellowish green for poor health
            const goodColor = new THREE.Color(0x228b22); // Green for good health
            
            healthColor.lerpColors(poorColor, goodColor, plantHealth);
            child.material.color = healthColor;
          }
        }
      });
    }
  },
  
  // Start water animation
  startWaterAnimation() {
    if (this.waterAnimation) return;
    
    this.waterAnimation = true;
    this.createWaterDrops();
    
    // Reset ripple if it exists
    if (this.waterRipple) {
      this.waterRipple.scale.set(0.1, 0.1, 0.1);
      this.waterRipple.material.opacity = 0.2;
    }
  },
  
  // Stop water animation
  stopWaterAnimation() {
    this.waterAnimation = false;
    
    // Remove water drops
    while (this.waterDrops.length > 0) {
      const drop = this.waterDrops.pop();
      this.scene.remove(drop);
    }
    
    // Fade out ripple if it exists
    if (this.waterRipple) {
      this.waterRipple.material.opacity = 0;
    }
  },
  
  // Animate water drops
  animateWaterDrops() {
    if (!this.waterAnimation) return;
    
    this.waterDrops.forEach((drop, index) => {
      // Get drop data
      const data = drop.userData;
      
      // Move drop down with its specific velocity
      drop.position.y -= data.velocity;
      
      // Add slight wobble for realism
      drop.position.x += data.wobble.x;
      drop.position.z += data.wobble.z;
      
      // If drop reaches the soil, reset it to top
      if (drop.position.y < 0.22) {
        // Randomize position for next drop
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.4;
        drop.position.x = Math.cos(angle) * radius;
        drop.position.z = Math.sin(angle) * radius;
        drop.position.y = 3 + Math.random() * 0.5;
        
        // Randomize velocity for variation
        data.velocity = 0.03 + Math.random() * 0.04;
        data.wobble = {
          x: Math.random() * 0.01 - 0.005,
          z: Math.random() * 0.01 - 0.005
        };
      }
    });
    
    // Animate water ripple effect
    if (this.waterRipple) {
      // Expand ripple
      const currentScale = this.waterRipple.scale.x;
      if (currentScale < 1.0) {
        const newScale = currentScale + 0.01;
        this.waterRipple.scale.set(newScale, newScale, newScale);
      }
      
      // Fade out as it expands
      if (this.waterRipple.material.opacity > 0.05) {
        this.waterRipple.material.opacity -= 0.002;
      } else {
        // Reset ripple when it gets too transparent
        this.waterRipple.scale.set(0.1, 0.1, 0.1);
        this.waterRipple.material.opacity = 0.2;
      }
    }
  },
  
  // Animation loop
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // Rotate scene slightly
    if (this.scene && this.pot) {
      this.pot.rotation.y += this.rotationSpeed;
    }
    
    // Animate water drops
    this.animateWaterDrops();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  },
  
  // Handle window resize
  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },
  
  // Cleanup
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Remove event listener
    window.removeEventListener('resize', this.onWindowResize);
    
    // Remove renderer from container
    if (this.container && this.renderer) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.pot = null;
    this.soil = null;
    this.plant = null;
    this.waterDrops = [];
  }
};

// Initialize 3D visualization when dashboard is ready
window.addEventListener('authStateChanged', (e) => {
  if (e.detail.isLoggedIn) {
    setTimeout(() => {
      PlantVisualization.init();
    }, 500); // Short delay to ensure container is ready
  }
});

// Update visualization when sensor data is received
window.addEventListener('sensorDataUpdated', (e) => {
  if (e.detail.sensorData) {
    PlantVisualization.updateWithSensorData(e.detail.sensorData);
  }
}); 