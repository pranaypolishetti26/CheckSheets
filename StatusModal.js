import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function StatusModal({
  itemCodes,
  propertyCheckCounts,
  onClose,
  propertiesLength,
  currentItem,
  currentPO,
}) {
  const totalChecks = propertiesLength; // Set this to the total number of checks expected for each item.
  const currentCombinedCode = `${currentItem}-${currentPO}`;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center px-1 pt-12 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white px-4 py-8 mb-16 rounded-lg shadow-lg max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto transform transition-transform duration-300 ease-in-out scale-95">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Item Codes</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700">
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        <ul className="list-disc pl-3 max-h-[70vh] overflow-y-auto space-y-3">
          {itemCodes.map((combinedCode, index) => {
            const checksDone = propertyCheckCounts[combinedCode] || 0;
            const progressPercent = (checksDone / totalChecks) * 100;
            const isSelected = combinedCode === currentCombinedCode;

            // Determine the progress bar color
            const progressBarColor =
              progressPercent === 100 ? 'bg-green-500' : 'bg-red-500';

            return (
              <li
                key={index}
                className={`text-gray-700 flex items-center justify-between py-2 ${isSelected ? 'bg-yellow-300' : ''}`}
              >
                <span className="font-medium">{combinedCode}</span>
                <div className="flex items-center">
                  <div className="w-32 h-4 bg-gray-200 rounded-full overflow-hidden mr-2 shadow-inner">
                    <div
                      className={`h-full ${progressBarColor} rounded-full transition-all duration-500 ease-in-out`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 font-semibold">
                    {checksDone}/{totalChecks}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default StatusModal;
