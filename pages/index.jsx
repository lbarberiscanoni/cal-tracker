// pages/index.jsx
import React from 'react';
import Cal from '../components/Cal';
import ProjectTracker from '../components/ProjectTracker';

const Home = () => {
  return (
    <main className="w-full min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Cal />
        <ProjectTracker />
      </div>
    </main>
  );
};

export default Home;