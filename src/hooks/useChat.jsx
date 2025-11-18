import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const chat = async (message) => {
    setLoading(true);
    const data = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const resp = (await data.json()).messages;
    setMessages((messages) => [...messages, ...resp]);
    setLoading(false);
  };
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [avatarPosition, setAvatarPosition] = useState("center"); // "center" or "right"
  const [audioElement, setAudioElement] = useState(null); // Audio element reference
  const [audioId, setAudioId] = useState(null); // Current audio ID for libsync
  const [avatarScreenPosition, setAvatarScreenPosition] = useState({ x: 0.5, y: 0.2 }); // Avatar's screen position (0-1 normalized)
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        avatarPosition,
        setAvatarPosition,
        audioElement,
        setAudioElement,
        audioId,
        setAudioId,
        avatarScreenPosition,
        setAvatarScreenPosition,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
