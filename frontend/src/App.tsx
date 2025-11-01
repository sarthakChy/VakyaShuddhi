import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Paraphrase from './pages/Paraphrase';
import Grammar from './pages/Grammar';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage/>}/>
        <Route path='/paraphrase' element={<Paraphrase/>}/>
        <Route path='/grammar' element={<Grammar/>}/>
      </Routes>
    </Router>
  )
}

export default App