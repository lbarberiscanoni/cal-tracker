import React from 'react';
import Cal from '../components/Cal';
import ProjectTracker from '../components/ProjectTracker';

const Home = () => {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Cal />
          </div>
          <div style={{ width: '100%', flex: '0 0 33.3333%', minWidth: '300px' }}>
            <ProjectTracker />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;