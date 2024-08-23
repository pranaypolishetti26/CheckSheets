import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const MissingItemsModal = ({ isOpen, onClose, missingItems }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center px-4 z-50">
      <div className="bg-white px-6 py-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-500">Missing Item Property Checks</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700">
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto"> {/* Make content scrollable */}
          <ul>
            {missingItems.map((item, index) => (
              <li key={index} className="py-2">
                <p className="font-bold">Item Code: {item.itemCode}</p>
                <p>PO Number: {item.poNumber}</p>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={onClose}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default MissingItemsModal;
