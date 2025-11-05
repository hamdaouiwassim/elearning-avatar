import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

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
  const { cameraZoomed, avatarPosition } = useChat();

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
  return (
    <>
      <CameraControls ref={cameraControls} />
      <Environment preset="sunset" />
      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>
      <group rotation-y={avatarPosition === "right" ? Math.PI : 0}>
        <Avatar />
      </group>
      <ContactShadows opacity={0.7} />
    </>
  );
};
