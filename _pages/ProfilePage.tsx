import React from 'react';
import DashboardLayout from '../components/DashboardLayout';

const ProfilePage: React.FC = () => {
  // Dummy user info for demonstration. You can replace this with real user data or fetch from an API.
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatarUrl: 'https://via.placeholder.com/150',
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '20px' }}>
        <h1>Profile</h1>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
          <img 
            src={user.avatarUrl} 
            alt="Avatar" 
            style={{ width: '150px', height: '150px', borderRadius: '50%', marginRight: '20px' }}
          />
          <div>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
