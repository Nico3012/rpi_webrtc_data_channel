import cv2
import numpy as np
import math
from collections import deque

class VisualSLAM:
    def __init__(self, camera_index=0):
        self.camera_index = camera_index
        
        # Camera intrinsic parameters (estimated for 640x480 webcam)
        # You should calibrate your camera for better accuracy
        self.K = np.array([[500, 0, 320],
                          [0, 500, 240], 
                          [0, 0, 1]], dtype=np.float32)
        
        # ORB feature detector
        self.orb = cv2.ORB_create(nfeatures=1000, scaleFactor=1.2, nlevels=8)
        
        # Feature matcher
        self.matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        
        # Previous frame data
        self.prev_frame = None
        self.prev_keypoints = None
        self.prev_descriptors = None
        
        # Camera pose (position and rotation)
        self.position = np.array([0.0, 0.0, 0.0])  # X, Y, Z
        self.rotation = np.eye(3)  # 3x3 rotation matrix
        
        # Trajectory storage
        self.trajectory = deque(maxlen=1000)
        self.trajectory.append(self.position.copy())
        
        # Scale factor (you may need to adjust this)
        self.scale = 1.0
        
        # Minimum number of matches required
        self.min_matches = 50
        
        # Frame counter
        self.frame_count = 0
        
    def estimate_pose(self, kp1, kp2, matches):
        """Estimate camera pose from matched keypoints"""
        if len(matches) < self.min_matches:
            return False
            
        # Extract matched points
        pts1 = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
        pts2 = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
        
        # Find essential matrix
        E, mask = cv2.findEssentialMat(pts2, pts1, self.K, method=cv2.RANSAC, 
                                       prob=0.999, threshold=1.0)
        
        if E is None:
            return False
            
        # Recover pose from essential matrix
        _, R, t, mask = cv2.recoverPose(E, pts2, pts1, self.K)
        
        # Update camera pose
        if R is not None and t is not None:
            # Apply scale (simple approach - you might want to use triangulation for better scale)
            translation = self.scale * (self.rotation @ t.flatten())
            
            # Update position and rotation
            self.position += translation
            self.rotation = R @ self.rotation
            
            # Store trajectory point
            self.trajectory.append(self.position.copy())
            
            return True
            
        return False
    
    def draw_keypoints_and_matches(self, frame, keypoints, matches_count=0):
        """Draw ORB keypoints on the frame"""
        # Draw keypoints
        frame_with_kp = cv2.drawKeypoints(frame, keypoints, None, 
                                         color=(0, 255, 0), flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)
        
        # Add information overlay
        h, w = frame.shape[:2]
        
        # Position info
        pos_text = f"Position: X={self.position[0]:.2f}, Y={self.position[1]:.2f}, Z={self.position[2]:.2f}"
        cv2.putText(frame_with_kp, pos_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Keypoints info
        kp_text = f"Keypoints: {len(keypoints)}"
        cv2.putText(frame_with_kp, kp_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Matches info
        if matches_count > 0:
            match_text = f"Matches: {matches_count}"
            cv2.putText(frame_with_kp, match_text, (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Frame counter
        frame_text = f"Frame: {self.frame_count}"
        cv2.putText(frame_with_kp, frame_text, (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Instructions
        cv2.putText(frame_with_kp, "Press 'q' to quit, 'r' to reset", (10, h-20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        # Draw trajectory on frame (top-down view)
        self.draw_trajectory_overlay(frame_with_kp)
        
        return frame_with_kp
    
    def draw_trajectory_overlay(self, frame):
        """Draw a small trajectory overlay on the frame"""
        if len(self.trajectory) < 2:
            return
            
        h, w = frame.shape[:2]
        overlay_size = 200
        overlay_x = w - overlay_size - 10
        overlay_y = 10
        
        # Create overlay background
        cv2.rectangle(frame, (overlay_x, overlay_y), 
                     (overlay_x + overlay_size, overlay_y + overlay_size), (50, 50, 50), -1)
        cv2.rectangle(frame, (overlay_x, overlay_y), 
                     (overlay_x + overlay_size, overlay_y + overlay_size), (255, 255, 255), 2)
        
        # Draw trajectory points
        if len(self.trajectory) > 1:
            # Scale trajectory to fit overlay
            traj_array = np.array(list(self.trajectory))
            
            if len(traj_array) > 1:
                # Use X-Z plane for top-down view
                x_coords = traj_array[:, 0]
                z_coords = traj_array[:, 2]
                
                # Scale to overlay size
                if np.max(np.abs(x_coords)) > 0 or np.max(np.abs(z_coords)) > 0:
                    scale_factor = overlay_size * 0.8 / max(np.max(np.abs(x_coords)), np.max(np.abs(z_coords)), 0.1)
                    
                    scaled_x = (x_coords * scale_factor + overlay_size // 2 + overlay_x).astype(int)
                    scaled_z = (z_coords * scale_factor + overlay_size // 2 + overlay_y).astype(int)
                    
                    # Draw trajectory lines
                    for i in range(1, len(scaled_x)):
                        cv2.line(frame, (scaled_x[i-1], scaled_z[i-1]), 
                                (scaled_x[i], scaled_z[i]), (0, 255, 0), 2)
                    
                    # Draw current position
                    if len(scaled_x) > 0:
                        cv2.circle(frame, (scaled_x[-1], scaled_z[-1]), 5, (0, 0, 255), -1)
        
        # Add overlay title
        cv2.putText(frame, "Trajectory (X-Z)", (overlay_x + 5, overlay_y + 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    def reset_pose(self):
        """Reset camera pose to origin"""
        self.position = np.array([0.0, 0.0, 0.0])
        self.rotation = np.eye(3)
        self.trajectory.clear()
        self.trajectory.append(self.position.copy())
        print("Pose reset to origin")
    
    def process_frame(self, frame):
        """Process a single frame"""
        self.frame_count += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect ORB keypoints and descriptors
        keypoints, descriptors = self.orb.detectAndCompute(gray, None)
        
        matches_count = 0
        
        # If we have a previous frame, estimate motion
        if (self.prev_frame is not None and 
            self.prev_keypoints is not None and 
            self.prev_descriptors is not None and
            descriptors is not None):
            
            # Match features between frames
            matches = self.matcher.match(self.prev_descriptors, descriptors)
            matches = sorted(matches, key=lambda x: x.distance)
            
            matches_count = len(matches)
            
            # Estimate pose if we have enough matches
            if len(matches) >= self.min_matches:
                pose_estimated = self.estimate_pose(self.prev_keypoints, keypoints, matches)
                if pose_estimated:
                    # Print current position to console
                    print(f"Frame {self.frame_count}: Position X={self.position[0]:.3f}, Y={self.position[1]:.3f}, Z={self.position[2]:.3f}")
        
        # Update previous frame data
        self.prev_frame = gray.copy()
        self.prev_keypoints = keypoints
        self.prev_descriptors = descriptors
        
        # Draw keypoints and information on frame
        output_frame = self.draw_keypoints_and_matches(frame, keypoints, matches_count)
        
        return output_frame
    
    def run(self):
        """Main SLAM loop"""
        print("=== Visual SLAM with ORB Features ===")
        print(f"Starting camera {self.camera_index}...")
        print("Controls:")
        print("  'q' - Quit")
        print("  'r' - Reset pose to origin")
        print("  's' - Save current frame")
        print()
        
        # Initialize camera
        cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
        
        if not cap.isOpened():
            print(f"Error: Could not open camera {self.camera_index}")
            return
        
        # Set camera properties
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Camera initialized: {width}x{height}")
        print("Position tracking started...\n")
        
        window_name = "Visual SLAM - ORB Features"
        cv2.namedWindow(window_name, cv2.WINDOW_AUTOSIZE)
        
        try:
            while True:
                ret, frame = cap.read()
                
                if not ret:
                    print("Failed to capture frame")
                    break
                
                # Process frame with SLAM
                output_frame = self.process_frame(frame)
                
                # Display frame
                cv2.imshow(window_name, output_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('r'):
                    self.reset_pose()
                elif key == ord('s'):
                    filename = f"slam_frame_{self.frame_count}.jpg"
                    cv2.imwrite(filename, output_frame)
                    print(f"Saved frame to {filename}")
        
        except KeyboardInterrupt:
            print("\nStopped by user")
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            
            # Print final trajectory summary
            print(f"\nSLAM Session Summary:")
            print(f"Total frames processed: {self.frame_count}")
            print(f"Final position: X={self.position[0]:.3f}, Y={self.position[1]:.3f}, Z={self.position[2]:.3f}")
            print(f"Trajectory points: {len(self.trajectory)}")

def detect_cameras():
    """Detect available cameras and let user choose"""
    print("Detecting available cameras...")
    available_cameras = []
    
    # Test camera indices from 0 to 5
    for i in range(6):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                
                available_cameras.append({
                    'index': i,
                    'resolution': f"{width}x{height}",
                    'fps': fps
                })
                print(f"Camera {i}: {width}x{height} @ {fps:.1f}fps")
            
            cap.release()
    
    if not available_cameras:
        print("No cameras found!")
        return None
    
    if len(available_cameras) == 1:
        selected = available_cameras[0]
        print(f"Using camera {selected['index']} ({selected['resolution']})")
        return selected['index']
    
    print(f"\nFound {len(available_cameras)} camera(s):")
    for i, cam in enumerate(available_cameras):
        print(f"{i + 1}. Camera {cam['index']}: {cam['resolution']} @ {cam['fps']:.1f}fps")
    
    while True:
        try:
            choice = input(f"\nSelect camera (1-{len(available_cameras)}): ")
            choice_idx = int(choice) - 1
            
            if 0 <= choice_idx < len(available_cameras):
                selected = available_cameras[choice_idx]
                print(f"Selected camera {selected['index']}")
                return selected['index']
            else:
                print(f"Please enter a number between 1 and {len(available_cameras)}")
        
        except (ValueError, KeyboardInterrupt):
            print("\nExiting...")
            return None

def main():
    print("=== Visual SLAM Tracker ===")
    
    # Detect and select camera
    camera_index = detect_cameras()
    if camera_index is None:
        return
    
    print("\nStarting Visual SLAM...")
    print("Controls:")
    print("- 'q': Quit")
    print("- 'r': Reset position")
    print("- 'c': Clear trajectory")
    print("- 's': Save frame")
    
    # Create and run SLAM system
    slam = VisualSLAM(camera_index=camera_index)
    slam.run()

if __name__ == "__main__":
    main()
