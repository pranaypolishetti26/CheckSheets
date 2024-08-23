// UserSelection.js
import React, { useState } from 'react';

function UserSelection({ users, onSelectUser }) {
  const [selectedUserId, setSelectedUserId] = useState("");

  const handleSelect = (event) => {
    const userId = event.target.value;
    const user = users.find(user => user.id.toString() === userId);
    setSelectedUserId(userId);
    onSelectUser(user); // Pass the whole user object
  };

  const handleProceed = () => {
    if (selectedUserId) {
      const user = users.find(user => user.id.toString() === selectedUserId);
      onSelectUser(user);
    } else {
      alert("Please select a user.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">Select Your Name</h2>
      <select value={selectedUserId} onChange={handleSelect} className="w-full max-w-xs p-2 border-2 border-blue-300 rounded mb-4">
        <option value="" disabled>Select a user</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>{user.displayName}</option>
        ))}
      </select>
      <button onClick={handleProceed} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700">
        Proceed
      </button>
    </div>
  );
}

export default UserSelection;
