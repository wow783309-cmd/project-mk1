import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const TVDisplay = () => {
    const socket = useSocket();
    const [searchParams] = useSearchParams();
    const [queue, setQueue] = useState([]);
    const [lastCalled, setLastCalled] = useState(null);

    // Filter params
    const filterRoom = searchParams.get('room');
    const filterRooms = searchParams.get('rooms') ? searchParams.get('rooms').split(',') : [];
    const filterDoctor = searchParams.get('doctor');

    useEffect(() => {
        fetchQueue();

        if (socket) {
            socket.on('queue_updated', fetchQueue);
            socket.on('patient_called', (data) => {
                // Only flash if relevant to this screen
                if (isRelevant(data)) {
                    setLastCalled(data);
                    setTimeout(() => setLastCalled(null), 10000);
                }
                fetchQueue();
            });
        }

        return () => {
            if (socket) {
                socket.off('queue_updated', fetchQueue);
                socket.off('patient_called');
            }
        };
    }, [socket, filterRoom, filterRooms.join(','), filterDoctor]);

    const isRelevant = (q) => {
        if (filterRoom && q.room_number !== filterRoom) return false;
        if (filterRooms.length > 0 && !filterRooms.includes(q.room_number)) return false;
        if (filterDoctor && q.doctor_id != filterDoctor) return false;
        return true;
    };

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/queue');
            const data = await res.json();
            setQueue(data);
        } catch (err) {
            console.error("Failed to fetch queue", err);
        }
    };

    // Filter queues based on URL params
    const filteredQueue = queue.filter(isRelevant);

    const active = filteredQueue.filter(q => q.status === 'called' || q.status === 'arrived');
    const waiting = filteredQueue.filter(q => q.status === 'waiting').slice(0, 5);

    const getTitle = () => {
        if (filterRoom) return `ROOM ${filterRoom} QUEUE`;
        if (filterRooms.length > 0) return `ROOMS ${filterRooms.join(', ')} QUEUE`;
        if (filterDoctor) return `DR. QUEUE`; // Ideally fetch doctor name, but ID is passed
        return "GENERAL QUEUE STATUS";
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col overflow-hidden">

            {/* Header */}
            <header className="flex justify-between items-center mb-12 border-b border-gray-700 pb-6">
                <h1 className="text-4xl font-bold tracking-wider text-blue-400">{getTitle()}</h1>
                <div className="text-2xl text-gray-400">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Main Display - Now Serving */}
                <div className="lg:col-span-2 space-y-8">
                    <h2 className="text-3xl font-semibold text-gray-300 mb-6 uppercase tracking-widest">Now Serving</h2>

                    {active.length === 0 && (
                        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-3xl">
                            <p className="text-2xl text-gray-500">Please wait...</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {active.map(q => (
                            <div
                                key={q.id}
                                className={`
                  relative overflow-hidden rounded-3xl p-8 border-l-8 shadow-2xl transform transition-all duration-500
                  ${q.status === 'called' ? 'bg-blue-900 border-blue-500 scale-105' : 'bg-green-900 border-green-500'}
                  ${lastCalled?.id === q.id ? 'animate-pulse' : ''}
                `}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-xl text-gray-300 mb-2 uppercase tracking-wider">
                                            {q.status === 'called' ? 'Calling...' : 'In Room'}
                                        </div>
                                        <div className="text-8xl font-black text-white tracking-tighter">
                                            {q.queue_number}
                                        </div>
                                        <div className="text-3xl text-gray-200 mt-2 font-light">
                                            {q.patient_name}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl text-gray-400 mb-1">Proceed to</div>
                                        <div className="text-6xl font-bold text-white">
                                            Room {q.room_number}
                                        </div>
                                        <div className="text-2xl text-blue-300 mt-2">
                                            {q.doctor_name}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar - Upcoming */}
                <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 shadow-xl">
                    <h2 className="text-2xl font-semibold text-yellow-400 mb-8 uppercase tracking-widest border-b border-gray-700 pb-4">
                        Next in Line
                    </h2>

                    <div className="space-y-6">
                        {waiting.length === 0 && <p className="text-gray-500 text-center">Queue is empty.</p>}
                        {waiting.map((q, index) => (
                            <div key={q.id} className="flex justify-between items-center p-4 bg-gray-700 rounded-xl border-l-4 border-yellow-500">
                                <span className="text-3xl font-bold text-white">{q.queue_number}</span>
                                <div className="text-right">
                                    <div className="text-gray-300 text-lg">{q.patient_name}</div>
                                    <div className="text-gray-500 text-sm">Wait for call</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {waiting.length > 0 && (
                        <div className="mt-8 text-center text-gray-500 text-sm">
                            Please wait for your number to be called.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default TVDisplay;
