import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState, lazy } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useChat } from "../hooks/useChat";
import * as THREE from "three";

// Lazy load Avatar component for better initial load performance on TV
const Avatar = lazy(() => import("./Avatar").then(module => ({ default: module.Avatar })));

// Component to track avatar's screen position
const AvatarScreenPositionTracker = ({ avatarGroup, setScreenPosition, camera }) => {
  const lastPositionRef = useRef({ x: null, y: null, z: null, rotationY: null });
  const frameCountRef = useRef(0);
  
  useFrame(() => {
    if (!avatarGroup.current || !camera) return;

    // Update the group's world matrix
    avatarGroup.current.updateWorldMatrix(true, false);

    // Get avatar's world position
    const worldPosition = new THREE.Vector3();
    avatarGroup.current.getWorldPosition(worldPosition);

    // Get avatar's rotation (in radians)
    const rotation = new THREE.Euler();
    rotation.setFromRotationMatrix(avatarGroup.current.matrixWorld);
    const rotationY = rotation.y;

    // Log position and rotation - throttle to every 3 frames for more responsive logging
    frameCountRef.current++;
    if (frameCountRef.current % 3 === 0) {
      const currentPos = { 
        x: worldPosition.x, 
        y: worldPosition.y, 
        z: worldPosition.z,
        rotationY: rotationY
      };
      const lastPos = lastPositionRef.current;
      
      // Log if position or rotation changed, or if it's the first time
      // Use very small thresholds to catch any movement
      const threshold = 0.00001; // Very sensitive threshold
      const rotationThreshold = 0.0001; // Very sensitive for rotation
      
      // Always log on first frame, then only on changes
      const hasChanged = lastPos.x === null || 
        Math.abs(currentPos.x - lastPos.x) > threshold ||
        Math.abs(currentPos.y - lastPos.y) > threshold ||
        Math.abs(currentPos.z - lastPos.z) > threshold ||
        (lastPos.rotationY !== null && Math.abs(currentPos.rotationY - lastPos.rotationY) > rotationThreshold);
      
      if (hasChanged) {
        console.log('Avatar Position & Rotation:', {
          position: {
            x: currentPos.x.toFixed(4),
            y: currentPos.y.toFixed(4),
            z: currentPos.z.toFixed(4)
          },
          rotation: {
            y: currentPos.rotationY.toFixed(4),
            yDegrees: (currentPos.rotationY * 180 / Math.PI).toFixed(2) + '°'
          },
          localPosition: {
            x: avatarGroup.current.position.x.toFixed(4),
            y: avatarGroup.current.position.y.toFixed(4),
            z: avatarGroup.current.position.z.toFixed(4)
          }
        });
        lastPositionRef.current = currentPos;
      }
    }

    // Get avatar's head position in local space (approximately at y=1.8, above the body)
    const headPositionLocal = new THREE.Vector3(0, 1.8, 0);

    // Convert to world space using the group's world matrix
    const headPositionWorld = headPositionLocal.clone();
    headPositionWorld.applyMatrix4(avatarGroup.current.matrixWorld);

    // Project 3D world position to screen coordinates
    const vector = headPositionWorld.clone().project(camera);

    // Convert to normalized screen coordinates (0-1)
    // Three.js project() returns coordinates in range [-1, 1], we need [0, 1]
    const x = (vector.x * 0.5 + 0.5);
    const y = (-vector.y * 0.5 + 0.5);

    // Update screen position
    setScreenPosition({ x, y });
  });

  return null;
};

// Component to track camera position when moved with mouse
const CameraPositionTracker = ({ camera }) => {
  const lastPosRef = useRef({ x: null, y: null, z: null });
  const frameCountRef = useRef(0);
  
  useFrame(() => {
    if (!camera) return;
    
    frameCountRef.current++;
    // Check every 5 frames
    if (frameCountRef.current % 5 === 0) {
      const currentPos = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      };
      const lastPos = lastPosRef.current;
      const threshold = 0.001;
      
      if (
        lastPos.x === null ||
        Math.abs(currentPos.x - lastPos.x) > threshold ||
        Math.abs(currentPos.y - lastPos.y) > threshold ||
        Math.abs(currentPos.z - lastPos.z) > threshold
      ) {
        console.log('Camera Position:', {
          x: currentPos.x.toFixed(3),
          y: currentPos.y.toFixed(3),
          z: currentPos.z.toFixed(3)
        });
        lastPosRef.current = currentPos;
      }
    }
  });
  
  return null;
};

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed, avatarPosition, audioElement, setAvatarScreenPosition } = useChat();
  const { camera, size } = useThree();
  const avatarGroupRef = useRef(null);
  const lastCameraPositionRef = useRef({ x: null, y: null, z: null });
  const cameraFrameCountRef = useRef(0);

  useEffect(() => {
    cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
  }, []);

  useEffect(() => {
    const xOffset = avatarPosition === "right" ? -4.5 : avatarPosition === "left" ? 4.5 : 0.6; // Décalage caméra pour suivre l'avatar
    const baseX = 0;
    const baseY = cameraZoomed ? 1.5 : 2.2;
    const baseZ = cameraZoomed ? 1.5 : 5;
    const targetX =
      avatarPosition === "right" ? -2.5 : avatarPosition === "left" ? 2.5 : 1.5; // Cible vers la nouvelle position de l'avatar
    const targetY = cameraZoomed ? 1.5 : 1.0;
    const targetZ = 0;

    cameraControls.current.setLookAt(
      baseX + xOffset,
      baseY,
      baseZ,
      targetX,
      targetY,
      targetZ,
      true
    );
  }, [cameraZoomed, avatarPosition]);

  const avatarXPosition =
    avatarPosition === "right" ? -2.5 : avatarPosition === "left" ? 2.5 : 1.5; // Décalé plus à droite sur l'écran

  return (
    <>
      <CameraControls
        ref={cameraControls}
        enabled={true}
        mouseButtons={{ left: 0, middle: 0, right: 0, wheel: 0 }}
        touches={{ one: 0, two: 0, three: 0 }}
      />
      <Environment preset="sunset" />
      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>
      <group
        ref={avatarGroupRef}
        rotation-y={avatarPosition === "right" ? Math.PI : avatarPosition === "left" ? 0 : -0.5} // Regarde un peu plus à droite quand au centre (-28.65°)
        position={[avatarXPosition, 0, 0]} // Position: x: 1.5000, y: 0.0000, z: 0.0000
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[0.5, 2, 0.5]} />
            <meshStandardMaterial color="gray" />
          </mesh>
        }>
          <Avatar />
        </Suspense>
      </group>

      {/* Calculate avatar screen position for UI button positioning */}
      <AvatarScreenPositionTracker
        avatarGroup={avatarGroupRef}
        setScreenPosition={setAvatarScreenPosition}
        camera={camera}
      />
      <ContactShadows opacity={0.7} />
    </>
  );
};
