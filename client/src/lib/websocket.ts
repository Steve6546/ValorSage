import { useState, useEffect } from "react";

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log("Attempting to connect to WebSocket at:", wsUrl);
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      ws.addEventListener("open", () => {
        console.log("WebSocket connection established successfully");
        setSocket(ws);
      });
      
      ws.addEventListener("close", () => {
        console.log("WebSocket connection closed");
        setSocket(null);
      });
      
      ws.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
        setSocket(null);
      });
      
      // Clean up on component unmount
      return () => {
        console.log("Cleaning up WebSocket connection");
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          ws.close();
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      return () => {}; // Return empty cleanup function if setup fails
    }
  }, []);

  return socket;
}
