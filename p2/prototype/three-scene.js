// three-scene.js
const canvas = document.querySelector('#three-canvas');
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true, // Transparent background
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x2563EB, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

const pointLight2 = new THREE.PointLight(0x60A5FA, 1);
pointLight2.position.set(-5, -5, 5);
scene.add(pointLight2);

// Geometric Shapes (The cool floating elements)
const colors = [0x2563EB, 0x1D4ED8, 0x60A5FA, 0x1E40AF];
const shapes = [];
const shapeCount = 25; // Decreased count to prevent scrolling lag and ensure smooth rendering

for (let i = 0; i < shapeCount; i++) {
    const type = Math.random();
    let geometry;

    if (type > 0.6) {
        // Torus
        geometry = new THREE.TorusGeometry(0.3, 0.12, 16, 32);
    } else if (type > 0.3) {
        // Box
        geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    } else {
        // Icosahedron (gem)
        geometry = new THREE.IcosahedronGeometry(0.3, 0);
    }

    const color = colors[Math.floor(Math.random() * colors.length)];
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.2, // Shinier
        metalness: 0.9,
        emissive: color,
        emissiveIntensity: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Spread widely
    mesh.position.x = (Math.random() - 0.5) * 35; // Wider X covers full screen
    mesh.position.y = (Math.random() - 0.5) * 40; // Taller Y spread
    mesh.position.z = (Math.random() - 0.5) * 15 - 5; // Deeper Z

    // Random initial rotation
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;

    // Store animation parameters
    mesh.userData = {
        speed: 0.2 + Math.random() * 0.5, // Faster, varied float speed
        rotationSpeedX: (Math.random() - 0.5) * 0.02,
        rotationSpeedY: (Math.random() - 0.5) * 0.02,
    };

    scene.add(mesh);
    shapes.push(mesh);
}

// Mouse interaction
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

document.addEventListener('mousemove', (e) => {
    // Normalized coordinates -1 to 1
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // Smooth mouse follow (Parallax effect on CAMERA only)
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    // Camera slightly rotates based on mouse, but position is fixed Z=5
    // NO SCROLL interaction here.
    camera.position.x = targetX * 0.5;
    camera.position.y = -targetY * 0.5;
    camera.lookAt(0, 0, 0);

    // Animate shapes
    shapes.forEach((mesh) => {
        const { speed, rotationSpeedX, rotationSpeedY } = mesh.userData;

        // Rotation
        mesh.rotation.x += rotationSpeedX;
        mesh.rotation.y += rotationSpeedY;

        // CONSTANT UPWARD FLOW (Free fluid movement)
        // Independent of scroll. Just strictly time based.
        // We move them UP continuously to look like rising bubbles/data.
        mesh.position.y += speed * 0.03;

        // WRAP LOGIC: absolute Y bounds
        // If it goes too high (above camera view), reset to bottom
        if (mesh.position.y > 20) {
            mesh.position.y = -20;
            // Randomize X and Z slightly on respawn for variety
            mesh.position.x = (Math.random() - 0.5) * 35;
        }
    });

    renderer.render(scene, camera);
}

animate();
