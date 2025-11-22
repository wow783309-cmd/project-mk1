import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const NurseDashboard = () => {
    const socket = useSocket();
    const [queue, setQueue] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [showMasterView, setShowMasterView] = useState(true);
    const [showRoomManager, setShowRoomManager] = useState(false);

    useEffect(() => {
        fetchQueue();
        fetchDoctors();

        if (socket) {
            socket.on('queue_updated', fetchQueue);
        }

        return () => {
            if (socket) socket.off('queue_updated', fetchQueue);
        };
    }, [socket]);

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/queue');
            const data = await res.json();
            setQueue(data);
        } catch (err) {
            console.error("Failed to fetch queue", err);
        }
    };

    const fetchDoctors = async () => {
        try {
            const res = await fetch('/api/doctors');
            const data = await res.json();
            setDoctors(data);

            // Initialize selected rooms with all available rooms if empty
            if (selectedRooms.length === 0 && data.length > 0) {
                const rooms = [...new Set(data.map(d => d.room_number).filter(Boolean))];
                setSelectedRooms(rooms);
            }
        } catch (err) {
            console.error("Failed to fetch doctors", err);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await fetch(`/api/queue/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const updateRoom = async (doctorId, newRoom) => {
        // Optimistic update
        setDoctors(doctors.map(d => d.id === doctorId ? { ...d, room_number: newRoom } : d));

        try {
            const doctor = doctors.find(d => d.id === doctorId);
            await fetch(`/api/doctors/${doctorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: doctor.name, room_number: newRoom, schedule: doctor.schedule })
            });
        } catch (err) {
            console.error("Failed to update room", err);
            fetchDoctors(); // Revert on error
        }
    };

    const handleReorder = async (index, direction) => {
        // Note: This reorder logic needs to be careful with filtered lists.
        // Ideally, we should reorder within the global list or the doctor's specific list.
        // For simplicity in this filtered view, we will find the item in the global queue and swap it with its neighbor *in the same doctor's queue*.

        // 1. Find the item in the global queue
        // 2. Find its neighbor in the same doctor's queue
        // 3. Swap their sort_orders

        // Current implementation relies on the filtered list index passed in. 
        // We need to be careful. Let's stick to the previous logic but ensure we are operating on the correct items.

        // Actually, the previous logic was:
        // const newQueue = [...queue];
        // [newQueue[index], newQueue[targetIndex]] = ...

        // This assumes 'index' is the index in 'queue'. 
        // But the UI passes the index from the *filtered* list (waiting list).
        // We need to fix this.

        // Let's change handleReorder to accept the ITEM itself, not the index.
        console.warn("Reordering not fully adapted for multi-room view yet. Use 'Move to End' for now.");
    };

    // Improved Reorder that takes the item and direction
    const handleReorderItem = async (item, direction) => {
        // Get all waiting items for this doctor, sorted by sort_order
        const doctorItems = queue
            .filter(q => q.doctor_id === item.doctor_id && q.status === 'waiting')
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const currentIndex = doctorItems.findIndex(q => q.id === item.id);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= doctorItems.length) return;

        const targetItem = doctorItems[targetIndex];

        // Swap sort_orders
        const newOrderA = targetItem.sort_order;
        const newOrderB = item.sort_order;

        // Optimistic update
        const newQueue = queue.map(q => {
            if (q.id === item.id) return { ...q, sort_order: newOrderA };
            if (q.id === targetItem.id) return { ...q, sort_order: newOrderB };
            return q;
        });

        setQueue(newQueue);

        try {
            await fetch('/api/queue/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [
                        { id: item.id, sort_order: newOrderA },
                        { id: targetItem.id, sort_order: newOrderB }
                    ]
                })
            });
        } catch (err) {
            console.error("Failed to reorder", err);
            fetchQueue();
        }
    };

    const handleMoveToEnd = async (item) => {
        const maxOrder = Math.max(...queue.map(q => q.sort_order || 0), 0);
        const newOrder = maxOrder + 1;

        const newQueue = queue.map(q => q.id === item.id ? { ...q, sort_order: newOrder } : q);
        newQueue.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setQueue(newQueue);

        try {
            await fetch('/api/queue/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{ id: item.id, sort_order: newOrder }]
                })
            });
        } catch (err) {
            console.error("Failed to move to end", err);
            fetchQueue();
        }
    };

    const toggleRoom = (room) => {
        setSelectedRooms(prev =>
            prev.includes(room)
                ? prev.filter(r => r !== room)
                : [...prev, room]
        );
    };

    // Filter logic
    const uniqueRooms = [...new Set(doctors.map(d => d.room_number).filter(Boolean))].sort();

    // Get doctors in selected rooms
    const selectedDoctors = doctors.filter(d => selectedRooms.includes(d.room_number));
    const selectedDoctorIds = selectedDoctors.map(d => d.id);

    // Filter queue by selected doctors
    const filteredQueue = queue.filter(q => selectedDoctorIds.includes(q.doctor_id));

    const waiting = filteredQueue.filter(q => q.status === 'waiting');
    const active = filteredQueue.filter(q => ['called', 'arrived'].includes(q.status));
    const completed = filteredQueue.filter(q => ['completed', 'skipped'].includes(q.status));

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-gray-800">Nurse Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Room Filter Bar */}
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase px-2">Filter Rooms:</span>
                            {uniqueRooms.map(room => (
                                <button
                                    key={room}
                                    onClick={() => toggleRoom(room)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedRooms.includes(room)
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {room}
                                </button>
                            ))}
                        </div>

                        {/* Manage Rooms Button */}
                        <button
                            onClick={() => setShowRoomManager(!showRoomManager)}
                            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${showRoomManager ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <span>⚙️ Manage Rooms</span>
                        </button>
                    </div>
                </header>

                {/* Room Manager Panel */}
                {showRoomManager && (
                    <div className="mb-8 animate-fade-in">
                        <div className="glass-panel rounded-2xl p-6 border-2 border-blue-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Doctor Room Assignment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {doctors.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div>
                                            <p className="font-bold text-gray-700">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{doc.schedule || 'No schedule'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase">Room</label>
                                            <input
                                                type="text"
                                                className="w-16 p-2 rounded-lg border border-gray-300 bg-gray-50 text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={doc.room_number}
                                                onChange={(e) => updateRoom(doc.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Master View (Grouped by Doctor - Filtered) */}
                {showMasterView && (
                    <div className="mb-12 animate-fade-in space-y-8">
                        <h2 className="text-2xl font-bold text-gray-800">Master Queue List <span className="text-gray-400 text-lg font-normal">(Selected Rooms)</span></h2>

                        {selectedDoctors.map(doc => {
                            const docQueue = queue.filter(q => q.doctor_id === doc.id);
                            if (docQueue.length === 0) return null;

                            return (
                                <div key={doc.id} className="glass-panel rounded-2xl p-8 overflow-hidden">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                            <span className="text-blue-600">{doc.name}</span>
                                            <span className="text-sm font-normal text-gray-500">(Room {doc.room_number})</span>
                                        </h3>
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                                            {docQueue.length} Patients
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="text-gray-500 border-b border-gray-200">
                                                    <th className="p-4 font-medium">Queue #</th>
                                                    <th className="p-4 font-medium">Patient Name</th>
                                                    <th className="p-4 font-medium">Status</th>
                                                    <th className="p-4 font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {docQueue.map(q => (
                                                    <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="p-4 font-bold text-gray-800 text-lg">{q.queue_number}</td>
                                                        <td className="p-4 text-gray-700">{q.patient_name}</td>
                                                        <td className="p-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                                    ${q.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${q.status === 'called' ? 'bg-blue-100 text-blue-800' : ''}
                                    ${q.status === 'arrived' ? 'bg-green-100 text-green-800' : ''}
                                    ${q.status === 'completed' ? 'bg-gray-100 text-gray-800' : ''}
                                    ${q.status === 'skipped' ? 'bg-red-100 text-red-800' : ''}
                                  `}>
                                                                {q.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 flex gap-2">
                                                            {q.status === 'waiting' && (
                                                                <button onClick={() => updateStatus(q.id, 'called')} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Call</button>
                                                            )}
                                                            {q.status === 'called' && (
                                                                <button onClick={() => updateStatus(q.id, 'arrived')} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Arrived</button>
                                                            )}
                                                            {q.status === 'arrived' && (
                                                                <button onClick={() => updateStatus(q.id, 'completed')} className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm">Complete</button>
                                                            )}
                                                            {(q.status === 'waiting' || q.status === 'called') && (
                                                                <button onClick={() => updateStatus(q.id, 'skipped')} className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm">Skip</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Waiting List */}
                    <div className="glass-panel rounded-2xl p-6 lg:col-span-1">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                            Waiting ({waiting.length})
                        </h2>
                        <div className="space-y-3">
                            {waiting.length === 0 && <p className="text-gray-400 text-sm">No patients waiting in selected rooms.</p>}
                            {waiting.map((q) => {
                                // Find doctor for this queue item to show room info if needed
                                const doc = doctors.find(d => d.id === q.doctor_id);

                                return (
                                    <div
                                        key={q.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', q.id);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault(); // Allow drop
                                            e.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const draggedId = e.dataTransfer.getData('text/plain');
                                            if (draggedId !== q.id.toString()) {
                                                // Find the dragged item object
                                                const draggedItem = queue.find(item => item.id.toString() === draggedId);
                                                if (draggedItem) {
                                                    // Determine direction based on sort_order
                                                    // This is a bit tricky with filtered lists. 
                                                    // Simplest approach: Swap the sort_order of the dragged item and the target item (q)
                                                    // But strictly speaking, DnD usually means "insert before/after".
                                                    // For this MVP, let's try to swap their positions if they are neighbors, 
                                                    // or just use the reorder API logic we have.

                                                    // Let's use a simpler logic: 
                                                    // If we drop A onto B, we want A to take B's position.
                                                    // We can reuse handleReorderItem logic but we need to know if it's "up" or "down".

                                                    const currentOrder = draggedItem.sort_order || 0;
                                                    const targetOrder = q.sort_order || 0;

                                                    if (currentOrder < targetOrder) {
                                                        // Dragging down
                                                        handleReorderItem(draggedItem, 'down');
                                                    } else {
                                                        // Dragging up
                                                        handleReorderItem(draggedItem, 'up');
                                                    }

                                                    // Note: This only swaps neighbors effectively if they are adjacent. 
                                                    // Real DnD might need more complex re-indexing. 
                                                    // But given the "Up/Down" API we have, this is a reasonable mapping.
                                                    // Ideally, we'd calculate a new sort_order between two items, but we use integer sort_orders.
                                                }
                                            }
                                        }}
                                        className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 card-hover relative group cursor-move active:cursor-grabbing"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-2xl font-bold text-gray-800">{q.queue_number}</span>
                                                <span className="ml-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Room {doc?.room_number}</span>
                                            </div>
                                            <span className="text-xs font-medium text-gray-400">ID: {q.patient_id}</span>
                                        </div>
                                        <p className="font-medium text-gray-700">{q.patient_name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{doc?.name}</p>

                                        {/* Reorder Controls */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleReorderItem(q, 'up')}
                                                className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-xs"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                onClick={() => handleReorderItem(q, 'down')}
                                                className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-xs"
                                            >
                                                ▼
                                            </button>
                                            <button
                                                onClick={() => handleMoveToEnd(q)}
                                                className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-bold"
                                                title="Move to End (Late)"
                                            >
                                                Late ➔
                                            </button>
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => updateStatus(q.id, 'called')}
                                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                            >
                                                Call
                                            </button>
                                            <button
                                                onClick={() => updateStatus(q.id, 'skipped')}
                                                className="px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                            >
                                                Skip
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active (Called/Arrived) */}
                    <div className="glass-panel rounded-2xl p-6 lg:col-span-1">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            Active ({active.length})
                        </h2>
                        <div className="space-y-3">
                            {active.length === 0 && <p className="text-gray-400 text-sm">No active patients in selected rooms.</p>}
                            {active.map(q => {
                                const doc = doctors.find(d => d.id === q.doctor_id);
                                return (
                                    <div key={q.id} className={`p-4 rounded-xl shadow-sm border card-hover ${q.status === 'called' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-2xl font-bold text-gray-800">{q.queue_number}</span>
                                                <span className="ml-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Room {doc?.room_number}</span>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${q.status === 'called' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
                                                {q.status}
                                            </span>
                                        </div>
                                        <p className="font-medium text-gray-700">{q.patient_name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{doc?.name}</p>

                                        <div className="mt-4">
                                            {q.status === 'called' ? (
                                                <button
                                                    onClick={() => updateStatus(q.id, 'arrived')}
                                                    className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                                >
                                                    Mark Arrived
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updateStatus(q.id, 'completed')}
                                                    className="w-full bg-gray-800 text-white py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Completed/Skipped */}
                    <div className="glass-panel rounded-2xl p-6 lg:col-span-1 opacity-75">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                            History
                        </h2>
                        <div className="space-y-3">
                            {completed.slice(0, 5).map(q => (
                                <div key={q.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <span className="font-bold text-gray-600 mr-2">{q.queue_number}</span>
                                        <span className="text-gray-500 text-sm">{q.patient_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded ${q.status === 'completed' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                                            {q.status}
                                        </span>
                                        {q.status === 'skipped' && (
                                            <button
                                                onClick={() => updateStatus(q.id, 'waiting')}
                                                className="text-blue-600 text-xs hover:underline"
                                            >
                                                Recall
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default NurseDashboard;
