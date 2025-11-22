import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const AdminPanel = () => {
    const socket = useSocket();
    const [activeTab, setActiveTab] = useState('quick-checkin'); // Default to Quick Check-in
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [queue, setQueue] = useState([]);

    // Quick Check-in State
    const [quickName, setQuickName] = useState('');
    const [quickDoctor, setQuickDoctor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Modal State
    const [editingEntry, setEditingEntry] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDoctor, setEditDoctor] = useState('');

    // Doctor Management State
    const [newDoctorName, setNewDoctorName] = useState('');
    const [newDoctorRoom, setNewDoctorRoom] = useState('');
    const [newDoctorSchedule, setNewDoctorSchedule] = useState('');

    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchDoctors();
        fetchPatients();
        fetchQueue();

        if (socket) {
            socket.on('queue_updated', fetchQueue);
        }

        return () => {
            if (socket) socket.off('queue_updated', fetchQueue);
        };
    }, [socket]);

    const fetchDoctors = async () => {
        try {
            const res = await fetch('/api/doctors');
            const data = await res.json();
            setDoctors(data);
        } catch (err) {
            console.error("Failed to fetch doctors", err);
        }
    };

    const fetchPatients = async () => {
        try {
            const res = await fetch('/api/patients');
            const data = await res.json();
            setPatients(data);
        } catch (err) {
            console.error("Failed to fetch patients", err);
        }
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

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleQuickCheckIn = async (e) => {
        e.preventDefault();
        if (!quickName || !quickDoctor) return;
        setIsSubmitting(true);

        try {
            // 1. Register Patient
            const patientRes = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: quickName })
            });
            const patientData = await patientRes.json();

            // 2. Create Queue Entry
            await fetch('/api/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientData.id,
                    doctor_id: quickDoctor
                })
            });

            // Reset Form
            setQuickName('');
            setQuickDoctor('');
            fetchQueue(); // Refresh immediately
            showNotification(`Patient ${patientData.name} checked in!`);
        } catch (err) {
            console.error("Quick check-in failed", err);
            alert("Failed to check in. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddDoctor = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/doctors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newDoctorName,
                    room_number: newDoctorRoom,
                    schedule: newDoctorSchedule
                })
            });
            setNewDoctorName('');
            setNewDoctorRoom('');
            setNewDoctorSchedule('');
            fetchDoctors();
            showNotification('Doctor added!');
        } catch (err) {
            console.error("Failed to add doctor", err);
        }
    };

    const handleDeleteQueue = async (id) => {
        if (!window.confirm("Are you sure you want to delete this entry?")) return;
        try {
            await fetch(`/api/queue/${id}`, { method: 'DELETE' });
            fetchQueue();
            showNotification('Queue entry deleted!');
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const openEditModal = (entry) => {
        setEditingEntry(entry);
        setEditName(entry.patient_name);
        setEditDoctor(entry.doctor_id);
    };

    const handleSaveEdit = async () => {
        if (!editingEntry) return;
        try {
            // Update Patient Name
            await fetch(`/api/patients/${editingEntry.patient_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName })
            });

            // Update Doctor Assignment
            if (editDoctor !== editingEntry.doctor_id) {
                await fetch(`/api/queue/${editingEntry.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ doctor_id: editDoctor })
                });
            }

            setEditingEntry(null);
            fetchQueue();
            showNotification('Changes saved!');
        } catch (err) {
            console.error("Failed to save edits", err);
            alert("Failed to save changes.");
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Panel</h1>

                {/* Navigation Tabs */}
                <div className="flex space-x-4 mb-8 bg-white p-1 rounded-xl shadow-sm w-fit">
                    <button
                        onClick={() => setActiveTab('quick-checkin')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'quick-checkin' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Quick Check-in
                    </button>
                    <button
                        onClick={() => setActiveTab('doctors')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'doctors' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Manage Doctors
                    </button>
                    <button
                        onClick={() => setActiveTab('live-queue')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'live-queue' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Live Queue View
                    </button>
                </div>

                {/* Quick Check-in Tab */}
                {activeTab === 'quick-checkin' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Registration Form */}
                        <div className="lg:col-span-1">
                            <div className="glass-panel rounded-2xl p-8 animate-fade-in sticky top-8">
                                <h2 className="text-2xl font-bold mb-6 text-gray-800">New Patient</h2>
                                <form onSubmit={handleQuickCheckIn} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                                        <input
                                            type="text"
                                            value={quickName}
                                            onChange={(e) => setQuickName(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="e.g. John Doe"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Assign Doctor</label>
                                        <select
                                            value={quickDoctor}
                                            onChange={(e) => setQuickDoctor(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                            required
                                        >
                                            <option value="">Select a Doctor</option>
                                            {doctors.map(doc => (
                                                <option key={doc.id} value={doc.id}>
                                                    {doc.name} {doc.room_number ? `(Room ${doc.room_number})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Checking In...' : 'Check In & Print Ticket'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Today's Registrations Table */}
                        <div className="lg:col-span-2">
                            <div className="glass-panel rounded-2xl p-8 animate-fade-in">
                                <h2 className="text-2xl font-bold mb-6 text-gray-800">Today's Registrations</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-gray-500 border-b border-gray-200">
                                                <th className="p-4 font-medium">Queue #</th>
                                                <th className="p-4 font-medium">Patient</th>
                                                <th className="p-4 font-medium">Doctor</th>
                                                <th className="p-4 font-medium">Status</th>
                                                <th className="p-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queue.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-gray-400">No registrations yet today.</td>
                                                </tr>
                                            )}
                                            {queue.map(q => (
                                                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                                                    <td className="p-4 font-bold text-gray-800">{q.queue_number}</td>
                                                    <td className="p-4 text-gray-700 font-medium">{q.patient_name}</td>
                                                    <td className="p-4 text-gray-600">{q.doctor_name}</td>
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
                                                    <td className="p-4 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(q)}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQueue(q.id)}
                                                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manage Doctors Tab */}
                {activeTab === 'doctors' && (
                    <div className="glass-panel rounded-2xl p-8 animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Manage Doctors</h2>
                        <form onSubmit={handleAddDoctor} className="flex flex-col md:flex-row gap-4 mb-8">
                            <input
                                type="text"
                                placeholder="Doctor Name"
                                value={newDoctorName}
                                onChange={(e) => setNewDoctorName(e.target.value)}
                                className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Schedule (e.g. Mon-Fri 9-5)"
                                value={newDoctorSchedule}
                                onChange={(e) => setNewDoctorSchedule(e.target.value)}
                                className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button type="submit" className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                                Add Doctor
                            </button>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {doctors.map(doc => (
                                <div key={doc.id} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{doc.name}</h3>
                                        <p className="text-sm text-gray-500">{doc.schedule || 'No schedule'}</p>
                                        <p className="text-xs text-gray-400 mt-1">ID: {doc.id}</p>
                                    </div>
                                    {doc.room_number && (
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold">
                                            Room {doc.room_number}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Live Queue Tab */}
                {activeTab === 'live-queue' && (
                    <div className="glass-panel rounded-2xl p-8 animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Live Queue Status</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-500 border-b border-gray-200">
                                        <th className="p-4 font-medium">Queue #</th>
                                        <th className="p-4 font-medium">Patient Name</th>
                                        <th className="p-4 font-medium">Doctor</th>
                                        <th className="p-4 font-medium">Room</th>
                                        <th className="p-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queue.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-gray-400">No active queue entries.</td>
                                        </tr>
                                    )}
                                    {queue.map(q => (
                                        <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-4 font-bold text-gray-800">{q.queue_number}</td>
                                            <td className="p-4 text-gray-700">{q.patient_name}</td>
                                            <td className="p-4 text-gray-600">{q.doctor_name}</td>
                                            <td className="p-4 text-blue-600 font-semibold">{q.room_number}</td>
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingEntry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-6 text-gray-800">Edit Registration</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Doctor</label>
                                <select
                                    value={editDoctor}
                                    onChange={(e) => setEditDoctor(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} {doc.room_number ? `(Room ${doc.room_number})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setEditingEntry(null)}
                                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce">
                    {notification}
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
