import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CreateItem from './pages/CreateItem';
import Home from './pages/Home';
import DeleteItem from './pages/DeleteItem';
import GetItemId from './pages/GetItemId';
import UpdateItem from './pages/UpdateItem';
import Login from './pages';
import ProtectedRoute from './pages/ProtectedRoute';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Home" element={<ProtectedRoute><Home/></ProtectedRoute>} />
        <Route path="/CreateItem" element={<ProtectedRoute><CreateItem/></ProtectedRoute>} />
        <Route path="/DeleteItem" element={<ProtectedRoute><DeleteItem/></ProtectedRoute>} />
        <Route path="/GetItemId" element={<ProtectedRoute><GetItemId/></ProtectedRoute>} />
        <Route path="/UpdateItem" element={<ProtectedRoute><UpdateItem/></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
