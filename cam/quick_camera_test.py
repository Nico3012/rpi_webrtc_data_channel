import cv2

def quick_camera_test():
    """Quick camera test that automatically uses the first available camera"""
    
    print("=== Quick Camera Test ===")
    print("Testing cameras...")
    
    # Try cameras 0, 1, 2
    for camera_idx in [0, 1, 2]:
        cap = cv2.VideoCapture(camera_idx, cv2.CAP_DSHOW)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                print(f"Using camera {camera_idx}")
                break
        cap.release()
    else:
        print("No cameras found!")
        return
    
    # Set camera properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    print(f"Camera: {width}x{height} @ {fps:.1f}fps")
    print("Press 'q' to quit, 's' to save frame")
    
    window_name = f"Camera {camera_idx} - Quick Test"
    cv2.namedWindow(window_name, cv2.WINDOW_AUTOSIZE)
    
    frame_count = 0
    
    try:
        while True:
            ret, frame = cap.read()
            
            if not ret:
                print("Failed to capture frame")
                break
            
            frame_count += 1
            
            # Add simple overlay
            cv2.putText(frame, f"Camera {camera_idx} - Frame {frame_count}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, "Press 'q' to quit, 's' to save", 
                       (10, height - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            
            cv2.imshow(window_name, frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                filename = f"camera_{camera_idx}_frame_{frame_count}.jpg"
                cv2.imwrite(filename, frame)
                print(f"Saved frame to {filename}")
    
    except KeyboardInterrupt:
        print("\nStopped by user")
    
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("Camera test finished!")

if __name__ == "__main__":
    quick_camera_test()
