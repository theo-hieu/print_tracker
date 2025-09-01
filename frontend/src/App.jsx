import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Materials from './components/Materials';
import Models from './components/Models';
import Printers from './components/Printers';
import Jobs from './components/Jobs';
import Analytics from './components/Analytics';

export default function App(){
  const [active, setActive] = useState('Home');
  const render = () => {
    switch(active){
      case 'Materials': return <Materials />;
      case 'Models': return <Models />;
      case 'Printers': return <Printers />;
      case 'Jobs': return <Jobs />;
      case 'Analytics': return <Analytics />;
      default: return <Home />;
    }
  };
  return (
    <div className="flex h-screen">
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-6 overflow-y-auto">{render()}</main>
    </div>
  );
}
