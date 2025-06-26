import cv2
import sys

class CameraDetector:
    def __init__(self):
        self.available_cameras = []
    
    def detect_cameras(self):
        """Detect all available cameras on Windows"""
        print("Detecting available cameras...")
        
        # Test camera indices from 0 to 10 (usually sufficient for most systems)
        for i in range(11):
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)  # Use DirectShow backend on Windows
            
            if cap.isOpened():
                # Try to read a frame to verify the camera works
                ret, frame = cap.read()
                if ret and frame is not None:
                    # Get camera properties
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    
                    camera_info = {
                        'index': i,
                        'resolution': f"{width}x{height}",
                        'fps': fps,
                        'working': True
                    }
                    
                    self.available_cameras.append(camera_info)
                    print(f"Camera {i}: {width}x{height} @ {fps:.1f}fps - OK")
                else:
                    print(f"Camera {i}: Detected but failed to capture frame")
                
                cap.release()
            
        if not self.available_cameras:
            print("No working cameras found!")
            return False
        
        print(f"\nFound {len(self.available_cameras)} working camera(s)")
        return True
    
    def select_camera(self):
        """Let user select which camera to use"""
        if len(self.available_cameras) == 1:
            selected = self.available_cameras[0]
            print(f"Using camera {selected['index']} ({selected['resolution']})")
            return selected['index']
        
        print("\nAvailable cameras:")
        for i, cam in enumerate(self.available_cameras):
            print(f"{i + 1}. Camera {cam['index']}: {cam['resolution']} @ {cam['fps']:.1f}fps")
        
        while True:
            try:
                choice = input(f"\nSelect camera (1-{len(self.available_cameras)}): ")
                choice_idx = int(choice) - 1
                
                if 0 <= choice_idx < len(self.available_cameras):
                    selected = self.available_cameras[choice_idx]
                    print(f"Selected camera {selected['index']}")
                    return selected['index']
                else:
                    print(f"Please enter a number between 1 and {len(self.available_cameras)}")
            
            except (ValueError, KeyboardInterrupt):
                print("\nExiting...")
                return None

def test_camera(camera_index):
    """Test the selected camera with live view"""
    print(f"\nStarting camera {camera_index}...")
    print("Press 'q' to quit, 'i' for camera info")
    
    # Initialize camera with DirectShow backend for Windows
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    
    if not cap.isOpened():
        print(f"Error: Could not open camera {camera_index}")
        return False
    
    # Set camera properties for better performance on Windows
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    # Get actual camera properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    print(f"Camera initialized: {width}x{height} @ {fps:.1f}fps")
    
    window_name = f"Camera {camera_index} Test - Press 'q' to quit"
    cv2.namedWindow(window_name, cv2.WINDOW_AUTOSIZE)
    
    frame_count = 0
    
    try:
        while True:
            ret, frame = cap.read()
            
            if not ret:
                print("Failed to capture frame")
                break
            
            frame_count += 1
            
            # Add frame counter and camera info overlay
            cv2.putText(frame, f"Camera {camera_index}", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, f"Frame: {frame_count}", (10, 70), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Resolution: {width}x{height}", (10, 100), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, "Press 'q' to quit", (10, height - 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            
            cv2.imshow(window_name, frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                print("Quitting...")
                break
            elif key == ord('i'):
                print(f"Camera Info - Index: {camera_index}, Resolution: {width}x{height}, FPS: {fps:.1f}")
    
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("Camera released and windows closed")
    
    return True

def main():
    print("=== Camera Test Program ===")
    print("Windows compatible version\n")
    
    # Initialize camera detector
    detector = CameraDetector()
    
    # Detect available cameras
    if not detector.detect_cameras():
        print("No cameras available. Please check your camera connections.")
        sys.exit(1)
    
    # Let user select camera
    selected_camera = detector.select_camera()
    if selected_camera is None:
        sys.exit(1)
    
    # Test the selected camera
    success = test_camera(selected_camera)
    
    if success:
        print("Camera test completed successfully!")
    else:
        print("Camera test failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
