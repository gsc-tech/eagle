import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import DashboardWorkspace from './pages/home'
import DashboardWorkspaceTest from './pages/home-test'


function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardWorkspaceTest />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
