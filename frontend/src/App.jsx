import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Upload from './pages/Upload'
import ForgotPassword from './pages/ForgotPassword'
import ProfileView from './pages/ProfileView'
import ModelDetail from './pages/ModelDetail'

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile/:username" element={<ProfileView />} />
            <Route path="/models/:modelId" element={<ModelDetail />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
