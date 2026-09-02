import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Landing from './pages/Landing'
import Input from './pages/Input'
import Result from './pages/Result'

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/input" element={<Input />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  )
}
