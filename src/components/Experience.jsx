import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";
import * as THREE from "three";

// Component to track avatar's screen position
const AvatarScreenPositionTracker = ({ avatarGroup, setScreenPosition, camera }) => {
  useFrame(() => {
    if (!avatarGroup.current || !camera) return;
    
    // Update the group's world matrix
    avatarGroup.current.updateWorldMatrix(true, false);
    
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const avatarGroupRef = useRef(null);

  // Monitor audio playback state to detect when avatar is speaking
  useEffect(() => {
    if (!audioElement) {
      setIsSpeaking(false);
      return;
    }

    const checkAudioState = () => {
      const playing = !audioElement.paused && !audioElement.ended && audioElement.currentTime > 0;
      setIsSpeaking(playing);
    };

    // Check initial state
    checkAudioState();

    // Listen to audio events
    const events = ['play', 'pause', 'ended', 'timeupdate'];
    events.forEach(event => {
      audioElement.addEventListener(event, checkAudioState);
    });

    return () => {
      events.forEach(event => {
        audioElement.removeEventListener(event, checkAudioState);
      });
    };
  }, [audioElement]);

  useEffect(() => {
    cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
  }, []);

  useEffect(() => {
    // Calculate camera position based on zoom and avatar position
    // When avatar is on right, move camera to the LEFT (negative) so avatar appears on the RIGHT side of screen
    const xOffset = avatarPosition === "right" ? -4.5 : 0; // Negative offset moves camera left, showing avatar on right
    const baseX = 0;
    const baseY = cameraZoomed ? 1.5 : 2.2;
    const baseZ = cameraZoomed ? 1.5 : 5;
    const targetX = avatarPosition === "right" ? -2.5 : baseX; // Adjust target to keep avatar in view on right
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
  
  // Calculate avatar X position - move slightly left when speaking
  const avatarXPosition = isSpeaking ? 0.3 : 0;

  return (
    <>
      <CameraControls ref={cameraControls} />
      <Environment preset="sunset" />
      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>
      <group 
        ref={avatarGroupRef}
        rotation-y={avatarPosition === "right" ? Math.PI : 0}
        position={[avatarXPosition, 0, 0]}
      >
        <Avatar />
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
