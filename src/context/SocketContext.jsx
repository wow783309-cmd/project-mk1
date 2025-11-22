import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Connect to the backend (proxy handles /socket.io)
        // Since we proxy /api, we can try connecting to relative path if we proxy socket.io too, 
        // OR just connect to localhost:3000 directly for MVP to avoid proxy issues with websockets.
        // Vite proxy can handle websockets with ws: true.
        // Let's try direct connection first for simplicity, or relative if proxy is set up well.
        // Given vite config, let's use direct URL for now to be safe.
        const newSocket = io();
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
