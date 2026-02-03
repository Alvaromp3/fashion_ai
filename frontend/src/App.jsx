import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { TubelightNavbar } from './components/ui/tubelight-navbar'
import Dashboard from './pages/Dashboard'
import MisPrendas from './pages/MisPrendas'
import MisOutfits from './pages/MisOutfits'
import ConfusionMatrix from './pages/ConfusionMatrix'
import ModelExamples from './pages/ModelExamples'

function App() {
  return (
    <Router>
      <div
        className="min-h-screen app-shell"
        style={{ background: 'var(--content-bg)' }}
      >
        <TubelightNavbar />
        <div className="pb-24 sm:pb-0 sm:pt-20">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prendas" element={<MisPrendas />} />
            <Route path="/outfits" element={<MisOutfits />} />
            <Route path="/modelo/confusion-matrix" element={<ConfusionMatrix />} />
            <Route path="/modelo/ejemplos" element={<ModelExamples />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App

