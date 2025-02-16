// pages/index.jsx
import React from 'react';
import Cal from '../components/Cal';

const Home = () => {
  return (
    <main className="w-full min-h-screen bg-background">
      <div className="container mx-auto px-4">
        <Cal />
      </div>
    </main>
  );
};

export default Home;