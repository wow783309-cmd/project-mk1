import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import AdminPanel from './pages/AdminPanel';
import NurseDashboard from './pages/NurseDashboard';
import TVDisplay from './pages/TVDisplay';

// Placeholder components until implemented
const Home = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
    <h1 className="text-4xl font-bold mb-8 text-gray-800">Queue System</h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <a href="/admin" className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 text-center">
        <h2 className="text-2xl font-semibold text-blue-600">Admin Panel</h2>
        <p className="text-gray-500 mt-2">Register patients & create queues</p>
      </a>
      <a href="/nurse" className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 text-center">
        <h2 className="text-2xl font-semibold text-green-600">Nurse Dashboard</h2>
        <p className="text-gray-500 mt-2">Manage queue flow</p>
      </a>
      <a href="/tv" className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 text-center">
        <h2 className="text-2xl font-semibold text-purple-600">TV Display</h2>
        <p className="text-gray-500 mt-2">Public queue view</p>
      </a>
    </div>
  </div>
);

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/nurse" element={<NurseDashboard />} />
          <Route path="/tv" element={<TVDisplay />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
