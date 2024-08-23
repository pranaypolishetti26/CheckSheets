import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSizesBySizeRun, getShoeDetailsByUPC } from './apiService'; // Import the new function

function PackingOrderModal({
  isOpen,
  onClose,
  data,
  allChecked,
  setAllChecked,
  checkedStates,
  setCheckedStates,
}) {
  const itemCodeType = data.itemCode.split('-').pop();

  const [packingData, setPackingData] = useState([]);
  const [scannedUPC, setScannedUPC] = useState('');
  const [, setShoeDetails] = useState(null); // New state to store shoe details
  const [scannedUPCs, setScannedUPCs] = useState([]); // State to track scanned UPCs
  const [, setScannedUPCCounts] = useState({}); // State to track UPC scan counts
  const [errorMessage, setErrorMessage] = useState('');
  const refreshButtonRef = useRef(null);


  useEffect(() => {
    const fetchPackingData = async () => {
      try {
        const response = await getSizesBySizeRun(itemCodeType);
        setPackingData(response.sizes); // Access the sizes array
        if (checkedStates.length === 0) {
          const initialStates = response.sizes.flatMap((item) =>
            Array(parseInt(item.quantity, 10)).fill(false)
          );
          setCheckedStates(initialStates);
        }
        setScannedUPCCounts({}); // Reset scannedUPCCounts when new data is fetched
      } catch (error) {
        console.error('Failed to fetch packing data:', error);
      }
    };

    fetchPackingData();
  }, [itemCodeType, checkedStates, setCheckedStates]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 3000); // 3 seconds delay, adjust as needed

      return () => clearTimeout(timer); // Cleanup timer on component unmount or if errorMessage changes
    }
  }, [errorMessage]);

  const handleUPCScan = useCallback(
    async (upc) => {
      setErrorMessage('');
      const countMap = scannedUPCs.reduce((acc, scannedUPC) => {
        acc[scannedUPC] = (acc[scannedUPC] || 0) + 1;
        return acc;
      }, {});
      const currentCount = countMap[upc] || 0;

      // Fetch shoe details to get the size
      let details;
      try {
        details = await getShoeDetailsByUPC(upc);
        setShoeDetails(details);
      } catch (error) {
        console.error('Failed to fetch shoe details:', error);
        return;
      }

      // Get the allowed number of scans for this size
      const item = packingData.find(item => Number(item.size) === Number(details.size));
      if (!item) {
        setErrorMessage('Invalid UPC scanned.');
        return;
      }
      const maxCount = parseInt(item.quantity, 10);

      if (currentCount >= maxCount) {
        setErrorMessage(`You have already scanned this UPC(Size-${details.size}) ${maxCount} times.`);
        return;
      }

      const newStates = [...checkedStates];
      let found = false;

      // Check off the corresponding checkbox based on the shoe size
      packingData.forEach((item, itemIndex) => {
        const startIndex = packingData
          .slice(0, itemIndex)
          .reduce((acc, item) => acc + parseInt(item.quantity, 10), 0);

        if (Number(item.size) === Number(details.size) && !found) {
          // Ensure size comparison is accurate
          for (let i = 0; i < parseInt(item.quantity, 10); i++) {
            const currentIndex = startIndex + i;

            if (!newStates[currentIndex]) {
              newStates[currentIndex] = true;
              found = true;
              break; // Ensure only one checkbox is checked per scan
            }
          }
        }
      });

      setCheckedStates(newStates);
      setScannedUPCCounts((prevCounts) => ({
        ...prevCounts,
        [upc]: currentCount + 1,
      }));
      setScannedUPCs((prevUPCs) => [...prevUPCs, upc]); // Add UPC to scanned list
      setScannedUPC(''); // Clear the input after processing
    },
    [checkedStates, packingData, setCheckedStates,scannedUPCs]
  );

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key !== 'Enter') {
        setScannedUPC((prev) => prev + event.key);
      }
    };

    const handleEnterPress = (event) => {
      if (event.key === 'Enter') {
        handleUPCScan(scannedUPC);
        setScannedUPC(''); // Clear the input after processing
      }
    };

    // Add event listeners
    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('keydown', handleEnterPress);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('keydown', handleEnterPress);
    };
  }, [scannedUPC, handleUPCScan]);

  // Function to refresh the checkboxes without closing the modal
  const handleRefresh = () => {
    setCheckedStates(packingData.flatMap((item) =>
      Array(parseInt(item.quantity, 10)).fill(false)
    ));
    setScannedUPCCounts({});
    setErrorMessage('');
    setScannedUPCs([]);
    if (refreshButtonRef.current) {
      refreshButtonRef.current.blur(); // Remove focus from the button
    }
  };

  // Check if all checkboxes are checked
  const handleSaveandClose = () => {
    setAllChecked(checkedStates.every((state) => state));
    onClose();
  };

  if (!isOpen) return null;
  let counter = 0; // Initialize a counter

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center px-4">
      <div className="bg-white px-6 py-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Packing Order</h2>
          <button
            onClick={handleSaveandClose}
            className={`mt-4 py-2 px-4 rounded ${
              allChecked
                ? 'bg-green-500 hover:bg-green-700'
                : 'bg-blue-500 hover:bg-blue-700'
            } text-white`}
          >
            Save & Close
          </button>
        </div>
        <div className="space-y-2">
          {packingData.map((item) =>
            Array.from({ length: parseInt(item.quantity, 10) }).map(
              () => {
                const index = counter++; // Use the counter as the index
                return (
                  <div
                    key={index} // Use the counter as the key
                    className="flex items-center space-x-2"
                  >
                    <p className="font-bold">{item.size.toString()}</p>
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600"
                      checked={checkedStates[index] || false}
                      // onChange={() => handleCheckboxChange(index)}
                    />
                  </div>
                );
              }
            )
          )}
        </div>
        {errorMessage && (
          <div className="text-red-500 mt-2">{errorMessage}</div>
        )}
        {/* {shoeDetails && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Shoe Details</h3>
            <p>{shoeDetails.size}</p>
          </div>
        )} */}
        <div className="flex justify-between">
          <button
            onClick={handleRefresh}
            ref={refreshButtonRef}
            className="bg-yellow-500 text-white mt-4 py-2 px-4 rounded"
          >
            Refresh
          </button>
          <button
            onClick={handleSaveandClose}
            className={`mt-4 py-2 px-4 rounded ${
              allChecked
                ? 'bg-green-500 hover:bg-green-700'
                : 'bg-blue-500 hover:bg-blue-700'
            } text-white`}
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PackingOrderModal;
