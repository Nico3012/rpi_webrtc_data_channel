/**
 * 3D Camera Rotation and Projection Utilities
 * Uses Three.js for 3D transformations and camera projections
 */

class Camera3D {
    constructor(canvasWidth = 640, canvasHeight = 480, fov = 75, depth = 100) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.depth = depth; // Constant depth for 2D to 3D conversion
        
        // Create Three.js scene, camera, and renderer (without actually rendering)
        this.scene = new THREE.Scene();
        
        // Create perspective camera
        this.camera = new THREE.PerspectiveCamera(
            fov, // field of view
            canvasWidth / canvasHeight, // aspect ratio
            0.1, // near clipping plane
            1000 // far clipping plane
        );
        
        // Position camera at origin looking down negative Z axis (Three.js default)
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(0, 0, -1);
        
        // Camera rotation (in radians)
        this.cameraRotationX = 0; // pitch
        this.cameraRotationY = 0; // yaw
        this.cameraRotationZ = 0; // roll
        
        // Helper objects for calculations
        this.vector3 = new THREE.Vector3();
        this.projectedVector = new THREE.Vector3();
    }
    
    /**
     * Set camera rotation angles
     * @param {number} rotationX - Pitch rotation in radians
     * @param {number} rotationY - Yaw rotation in radians  
     * @param {number} rotationZ - Roll rotation in radians
     */
    setCameraRotation(rotationX, rotationY, rotationZ) {
        this.cameraRotationX = rotationX;
        this.cameraRotationY = rotationY;
        this.cameraRotationZ = rotationZ;
        
        // Apply rotation to camera
        this.camera.rotation.set(rotationX, rotationY, rotationZ);
        this.camera.updateMatrixWorld();
    }
    
    /**
     * Convert 2D canvas coordinates to 3D world coordinates
     * @param {number} x2d - X coordinate on canvas (0,0 is center)
     * @param {number} y2d - Y coordinate on canvas (0,0 is center)
     * @param {number} depth - Z depth (optional, uses default if not provided)
     * @returns {THREE.Vector3} 3D world position
     */
    convert2DTo3D(x2d, y2d, depth = null) {
        if (depth === null) {
            depth = this.depth;
        }
        
        // Convert canvas coordinates (center = 0,0) to normalized device coordinates (-1 to 1)
        const ndcX = (x2d / (this.canvasWidth / 2));
        const ndcY = -(y2d / (this.canvasHeight / 2)); // Flip Y axis
        
        // Create vector in normalized device coordinates
        this.vector3.set(ndcX, ndcY, -1); // Z = -1 for screen plane
        
        // Unproject from screen space to world space
        this.vector3.unproject(this.camera);
        
        // Get camera position and direction
        const cameraPosition = this.camera.position.clone();
        const direction = this.vector3.sub(cameraPosition).normalize();
        
        // Calculate 3D position at specified depth
        const worldPosition = cameraPosition.clone().add(direction.multiplyScalar(depth));
        
        return worldPosition;
    }
    
    /**
     * Project 3D world coordinates back to 2D canvas coordinates
     * @param {THREE.Vector3} worldPosition - 3D world position
     * @returns {Object} Object containing {x, y, visible}
     */
    project3DTo2D(worldPosition) {
        // Clone the world position to avoid modifying the original
        this.projectedVector.copy(worldPosition);
        
        // Project 3D point to screen coordinates
        this.projectedVector.project(this.camera);
        
        // Check if point is behind camera (z > 1 means behind camera)
        const isVisible = this.projectedVector.z <= 1;
        
        // Convert normalized device coordinates back to canvas coordinates
        const canvasX = (this.projectedVector.x * (this.canvasWidth / 2));
        const canvasY = -(this.projectedVector.y * (this.canvasHeight / 2)); // Flip Y axis back
        
        // Check if point is within canvas bounds (additional visibility check)
        const withinBounds = Math.abs(canvasX) <= this.canvasWidth / 2 && 
                           Math.abs(canvasY) <= this.canvasHeight / 2;
        
        return {
            x: canvasX,
            y: canvasY,
            visible: isVisible && withinBounds
        };
    }
    
    /**
     * Main function: Transform 2D point through 3D space with camera rotation
     * @param {number} x2d - Input X coordinate (canvas space, center = 0)
     * @param {number} y2d - Input Y coordinate (canvas space, center = 0)
     * @param {number} rotationX - Camera pitch rotation in radians
     * @param {number} rotationY - Camera yaw rotation in radians
     * @param {number} rotationZ - Camera roll rotation in radians
     * @param {number} depth - Z depth for 3D conversion (optional)
     * @returns {Object} {x, y, visible} - transformed 2D coordinates and visibility
     */
    transform2DPoint(x2d, y2d, rotationX, rotationY, rotationZ, depth = null) {
        const useDepth = depth !== null ? depth : this.depth;
        
        console.log(`Input: x2d=${x2d}, y2d=${y2d}, rotX=${rotationX}, rotY=${rotationY}, rotZ=${rotationZ}, depth=${useDepth}`);
        
        // Convert 2D canvas coordinates to normalized coordinates (-1 to 1)
        const normalizedX = (x2d * 2) / this.canvasWidth;
        const normalizedY = -(y2d * 2) / this.canvasHeight; // Flip Y axis for Three.js
        
        // Create 3D point at specified depth
        const point3D = new THREE.Vector3(normalizedX, normalizedY, -1);
        
        // Convert from normalized screen coordinates to world coordinates
        point3D.unproject(this.camera);
        
        // Get direction from camera to the unprojected point
        const direction = point3D.sub(this.camera.position).normalize();
        
        // Place the point at the specified depth
        const worldPoint = this.camera.position.clone().add(direction.multiplyScalar(useDepth));
        
        console.log(`World point before rotation: ${worldPoint.x.toFixed(3)}, ${worldPoint.y.toFixed(3)}, ${worldPoint.z.toFixed(3)}`);
        
        // Apply rotations - this is the key part that was missing
        if (rotationX !== 0 || rotationY !== 0 || rotationZ !== 0) {
            // Create rotation matrices for each axis
            const rotMatrix = new THREE.Matrix4();
            
            // Apply rotations in XYZ order (pitch, yaw, roll)
            const euler = new THREE.Euler(rotationX, rotationY, rotationZ, 'XYZ');
            rotMatrix.makeRotationFromEuler(euler);
            
            // Apply rotation to the world point
            worldPoint.applyMatrix4(rotMatrix);
            
            console.log(`World point after rotation: ${worldPoint.x.toFixed(3)}, ${worldPoint.y.toFixed(3)}, ${worldPoint.z.toFixed(3)}`);
        }
        
        // Project the rotated 3D point back to 2D screen coordinates
        const screenPoint = worldPoint.clone().project(this.camera);
        
        // Convert from normalized device coordinates back to canvas coordinates
        const finalX = (screenPoint.x * this.canvasWidth) / 2;
        const finalY = -(screenPoint.y * this.canvasHeight) / 2; // Flip Y back
        
        // Check visibility (z < 1 means in front of camera in NDC space)
        const visible = screenPoint.z < 1 && 
                       Math.abs(finalX) <= this.canvasWidth / 2 && 
                       Math.abs(finalY) <= this.canvasHeight / 2;
        
        console.log(`Final result: x=${finalX.toFixed(3)}, y=${finalY.toFixed(3)}, visible=${visible}`);
        
        return {
            x: finalX,
            y: finalY,
            visible: visible
        };
    }
    
    /**
     * Update canvas dimensions (call this if canvas size changes)
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    updateCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Set the default depth for 2D to 3D conversion
     * @param {number} depth - New default depth value
     */
    setDepth(depth) {
        this.depth = depth;
    }
    
    /**
     * Get current camera rotation angles
     * @returns {Object} {x, y, z} rotation angles in radians
     */
    getCameraRotation() {
        return {
            x: this.cameraRotationX,
            y: this.cameraRotationY,
            z: this.cameraRotationZ
        };
    }
}

/**
 * Utility function to convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Utility function to convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

// Example usage:
/*
// Create camera instance
const camera3D = new Camera3D(640, 480, 75, 100);

// Transform a 2D point with camera rotation
const result = camera3D.transform2DPoint(
    100,  // x2d (100 pixels right of center)
    -50,  // y2d (50 pixels above center)
    degreesToRadians(10),  // 10 degrees pitch
    degreesToRadians(20),  // 20 degrees yaw
    degreesToRadians(5)    // 5 degrees roll
);

console.log(`Transformed point: x=${result.x}, y=${result.y}, visible=${result.visible}`);
*/
