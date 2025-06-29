/**
 * Demo file showing how to use the Camera3D class
 * This demonstrates the 2D to 3D transformation with camera rotation
 */

// Example usage of Camera3D class
function demonstrateCamera3D() {
    console.log('=== Camera3D Demo ===');
    
    // Create a camera instance with canvas size 640x480, FOV 75°, depth 100 units
    const camera3D = new Camera3D(640, 480, 75, 100);
    
    // Test points in 2D space (canvas coordinates where 0,0 is center)
    const testPoints = [
        { x: 0, y: 0, name: "Center" },
        { x: 100, y: 0, name: "Right of center" },
        { x: -100, y: 0, name: "Left of center" },
        { x: 0, y: 100, name: "Below center" },
        { x: 0, y: -100, name: "Above center" },
        { x: 320, y: 240, name: "Bottom-right corner" },
        { x: -320, y: -240, name: "Top-left corner" }
    ];
    
    console.log('\n--- Testing with no rotation ---');
    testPoints.forEach(point => {
        const result = camera3D.transform2DPoint(point.x, point.y, 0, 0, 0);
        console.log(`${point.name} (${point.x}, ${point.y}) -> (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) visible: ${result.visible}`);
    });
    
    console.log('\n--- Testing with 30° yaw (camera looking right) ---');
    const yawRotation = degreesToRadians(30);
    testPoints.forEach(point => {
        const result = camera3D.transform2DPoint(point.x, point.y, 0, yawRotation, 0);
        console.log(`${point.name} (${point.x}, ${point.y}) -> (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) visible: ${result.visible}`);
    });
    
    console.log('\n--- Testing with 45° pitch (camera looking up) ---');
    const pitchRotation = degreesToRadians(45);
    testPoints.forEach(point => {
        const result = camera3D.transform2DPoint(point.x, point.y, pitchRotation, 0, 0);
        console.log(`${point.name} (${point.x}, ${point.y}) -> (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) visible: ${result.visible}`);
    });
    
    console.log('\n--- Testing with combined rotations (30° yaw, 15° pitch, 10° roll) ---');
    const combinedYaw = degreesToRadians(30);
    const combinedPitch = degreesToRadians(15);
    const combinedRoll = degreesToRadians(10);
    testPoints.forEach(point => {
        const result = camera3D.transform2DPoint(point.x, point.y, combinedPitch, combinedYaw, combinedRoll);
        console.log(`${point.name} (${point.x}, ${point.y}) -> (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) visible: ${result.visible}`);
    });
    
    console.log('\n--- Testing visibility with extreme rotation (180° yaw - looking backwards) ---');
    const backwardRotation = degreesToRadians(180);
    testPoints.forEach(point => {
        const result = camera3D.transform2DPoint(point.x, point.y, 0, backwardRotation, 0);
        console.log(`${point.name} (${point.x}, ${point.y}) -> (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) visible: ${result.visible}`);
    });
}

// Function to integrate with the existing feature detection system
function transformFeaturePoints(featurePoints, rotationX, rotationY, rotationZ, canvasWidth, canvasHeight) {
    // Create camera instance matching the canvas size
    const camera3D = new Camera3D(canvasWidth, canvasHeight);
    
    // Transform each feature point
    const transformedPoints = featurePoints.map(point => {
        // Convert from canvas coordinates (top-left origin) to center-origin coordinates
        const centerX = point.x - (canvasWidth / 2);
        const centerY = point.y - (canvasHeight / 2);
        
        // Apply 3D transformation
        const result = camera3D.transform2DPoint(centerX, centerY, rotationX, rotationY, rotationZ);
        
        return {
            original: { x: point.x, y: point.y },
            transformed: {
                // Convert back to canvas coordinates (top-left origin)
                x: result.x + (canvasWidth / 2),
                y: result.y + (canvasHeight / 2)
            },
            visible: result.visible,
            centerCoords: { x: result.x, y: result.y } // Keep center-origin coords for reference
        };
    });
    
    return transformedPoints;
}

// Function to animate camera rotation for demo purposes
function animateCamera3DDemo(camera3D, canvas, ctx, duration = 5000) {
    const startTime = Date.now();
    const centerPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: -100, y: 0 },
        { x: 0, y: 100 },
        { x: 0, y: -100 }
    ];
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed % duration) / duration;
        
        // Create smooth rotation animation
        const yaw = Math.sin(progress * Math.PI * 2) * Math.PI / 4; // ±45°
        const pitch = Math.cos(progress * Math.PI * 2) * Math.PI / 6; // ±30°
        const roll = Math.sin(progress * Math.PI * 4) * Math.PI / 12; // ±15°
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Transform and draw points
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        
        centerPoints.forEach((point, index) => {
            const result = camera3D.transform2DPoint(point.x, point.y, pitch, yaw, roll);
            
            if (result.visible) {
                // Convert center coordinates back to canvas coordinates
                const canvasX = result.x + canvas.width / 2;
                const canvasY = result.y + canvas.height / 2;
                
                // Draw point
                ctx.beginPath();
                ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw label
                ctx.fillText(`P${index}`, canvasX + 10, canvasY - 10);
            }
        });
        
        // Continue animation
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        demonstrateCamera3D,
        transformFeaturePoints,
        animateCamera3DDemo
    };
}
