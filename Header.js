import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPowerOff, faTimes, faList } from '@fortawesome/free-solid-svg-icons';
import Modal from './Modal';
import StatusModal from './StatusModal'; // Import the new StatusModal component
import MissingItemsModal from './MissingItemsModal'; // Import the new modal component
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  faCheckCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import {
  getItemsByTrackingNumber,
  getItemDimensions,
  getItemProperties,
  saveItemPropertyCheck,
  getContainersByPONumber,
  updateItemPropertyCheck,
  getItemPropertyChecksByUserContainerItem,
  saveStatus,
  getContainerStatus,
} from './apiService';

function Header({ selectedUser }) {
  const [upcCode, setUpcCode] = useState('');
  const [factory, setFactory] = useState('');
  const [, setTrackingNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [, setItems] = useState([]);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [itemCodes, setItemCodes] = useState([]); // State to store item codes
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDimensions, setItemDimensions] = useState(null);
  const [itemProperties, setItemProperties] = useState([]);
  const [propertiesLength, setPropertiesLength] = useState([]);
  const [itemPropertyChecks, setItemPropertyChecks] = useState([]);
  const [propertyCheckCounts, setPropertyCheckCounts] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [missingItems, setMissingItems] = useState([]);
  const [isMissingItemsModalOpen, setIsMissingItemsModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const upcRef = useRef(null);
  const containerDropdownRef = useRef(null);

  const editableKeys = [
    'caseLength',
    'caseWidth',
    'caseHeight',
    'caseWeight',
    'boxLength',
    'boxWidth',
    'boxHeight',
    'boxWeight',
  ];

  const fetchItemPropertyChecks = useCallback(
    async (userId, selectedContainer, po, itemCode) => {
      try {
        const checks = await getItemPropertyChecksByUserContainerItem(
          userId,
          selectedContainer,
          po,
          itemCode
        );
        const latestChecks = getLatestChecks(checks);
        setItemPropertyChecks(latestChecks);
      } catch (error) {
        console.error('Failed to fetch item property checks', error);
        setItemPropertyChecks([]);
        setErrorMessage('Error fetching item property checks');
      }
    },
    []
  );

  const fetchItemDimensions = useCallback(async (itemCode) => {
    try {
      const dimensions = await getItemDimensions(itemCode);
      setItemDimensions(dimensions[0]);
    } catch (error) {
      setErrorMessage('Error fetching item dimensions');
      setItemDimensions(null);
    }
  }, []);

  useEffect(() => {
    if (selectedItem) {
      fetchItemDimensions(selectedItem.itemCode);
      fetchItemProperties();
      fetchItemPropertyChecks(
        selectedUser.id,
        selectedContainer,
        selectedItem.purchaseOrderNumber,
        selectedItem.itemCode
      );
    }
  }, [
    selectedItem,
    fetchItemPropertyChecks,
    selectedUser.id,
    selectedContainer,
    fetchItemDimensions,
  ]);

  useEffect(() => {
    if (upcRef.current) {
      upcRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (showSummary && selectedItem) {
      fetchItemPropertyChecks(
        selectedUser.id,
        selectedContainer,
        selectedItem.purchaseOrderNumber,
        selectedItem.itemCode
      );
    }
  }, [
    showSummary,
    selectedItem,
    selectedUser.id,
    fetchItemPropertyChecks,
    selectedContainer,
  ]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 3000); // 3 seconds delay, adjust as needed

      return () => clearTimeout(timer); // Cleanup timer on component unmount or if errorMessage changes
    }
  }, [errorMessage]);

  const fetchItemProperties = async () => {
    try {
      const properties = await getItemProperties();
      setItemProperties(properties);
      setPropertiesLength(properties.length);
    } catch (error) {
      setErrorMessage('Error fetching item properties');
      setItemProperties([]);
    }
  };

  const getLatestChecks = (checks) => {
    const sortedChecks = checks.sort(
      (a, b) => new Date(b.dateChecked) - new Date(a.dateChecked)
    );
    const latestChecksMap = new Map();
    sortedChecks.forEach((check) => {
      if (!latestChecksMap.has(check.propertyId)) {
        latestChecksMap.set(check.propertyId, check);
      }
    });
    return Array.from(latestChecksMap.values());
  };

  const processQRData = useCallback((qrdata) => {
    const qrraw = qrdata.split(' ');
    let msg = '';
    qrraw.forEach((hex) => {
      const dec = parseInt(hex, 16);
      const e = Math.abs(dec - 256);
      msg += String.fromCharCode(e);
    });
    return msg;
  }, []);

  const handleUPCChange = (event) => {
    const value = event.target.value;
    setUpcCode(value);

    if (value.includes('::')) {
      handleQRScan(value);
    } else {
      setErrorMessage('Please scan a valid QR Code!');
    }
  };

  const handleQRScan = useCallback(
    async (qrData) => {
      const [upc, hexData] = qrData.split('::');
      if (!upc || !hexData) {
        setErrorMessage('Please scan a valid QR Code!');
        return;
      }
      const processedMessage = processQRData(hexData.trim());
      const parts = processedMessage.split(':');
      if (parts.length < 4) {
        setErrorMessage('Please scan a valid QR Code!');
        return;
      }
      const [ponumber, factory, itemCode] = parts;

      // Clear previous data
      setUpcCode(''); // Clear this to make the input non-editable
      setTrackingNumber('');
      setPoNumber('');
      setContainers([]);
      setItems([]);
      setSelectedItem(null);
      setItemDimensions(null);
      setItemProperties([]);
      setItemPropertyChecks([]);

      // Set new data
      setUpcCode(upc.trim());
      setFactory(factory);
      setPoNumber(ponumber);
      setErrorMessage('');
      setScanSuccess(true); // Indicate a successful scan

      try {
        const response = await getContainersByPONumber(ponumber);
        setContainers(response);

        let filteredContainers = [];
        let selectedContainer = null;
        let selectedItem = null;

        for (const container of response) {
          const items = await getItemsByTrackingNumber(
            container.trackingNumber
          );
          for (const item of items) {
            if (
              item &&
              item.itemCode === itemCode &&
              item.purchaseOrderNumber.toString() === ponumber.toString()
            ) {
              filteredContainers.push(container);
              if (!selectedItem) {
                selectedContainer = container.trackingNumber;
                selectedItem = item;
                break;
              }
            }
          }
        }
        setContainers(filteredContainers);

        if (filteredContainers.length === 1) {
          setSelectedContainer(filteredContainers[0].trackingNumber);
        }
        if (selectedContainer && selectedItem) {
          setTrackingNumber(selectedContainer);
          setSelectedItem(selectedItem);
          if (dropdownRef.current) {
            dropdownRef.current.value = selectedItem.itemCode; // Ensure dropdown is updated
          }
        } else if (response.length > 0) {
          setTrackingNumber(response[0].trackingNumber);
          setSelectedItem(null);
        }

        if (containerDropdownRef.current) {
          containerDropdownRef.current.focus();
        }
      } catch (error) {
        setErrorMessage('Error fetching containers by PO number');
      }
    },
    [processQRData]
  );

  const clearUPCCode = () => {
    setUpcCode('');
    setScanSuccess(false);
    if (upcRef.current) {
      upcRef.current.focus();
    }
  };

  const openModal = () => {
    if (!selectedContainer) {
      setErrorMessage('Please select a container.');
      return;
    }
    setIsModalOpen(true);
    setModalStep(0);
  };

  const closeAll = () => {
    setIsModalOpen(false);
    setModalStep(0);
  };

  const checkDuplicateItemCode = async (container, itemCode) => {
    try {
      const items = await getItemsByTrackingNumber(container);
      const duplicateItems = items.filter(
        (item) =>
          item.itemCode.split('-').slice(0, 2).join('-').toString() ===
          itemCode.split('-').slice(0, 2).join('-').toString()
      );
      return duplicateItems.length > 1;
    } catch (error) {
      console.error('Error checking for duplicate itemCode:', error);
      return false;
    }
  };

  const handleSave = async (itemPropertyCheck) => {
    try {
      const property = itemProperties.find(
        (prop) => prop.id === itemPropertyCheck.propertyId
      );

      if (
        property &&
        (property.category === 'case dimensions' ||
          property.category === 'box dimensions')
      ) {
        const hasDuplicateItemCode = await checkDuplicateItemCode(
          selectedContainer,
          itemPropertyCheck.itemCode
        );
        if (hasDuplicateItemCode) {
          const duplicateItems =
            await getItemsByTrackingNumber(selectedContainer);
          const similarItems = duplicateItems.filter((item) => {
            const baseItemCode = item.itemCode.split('-').slice(0, 2).join('-');
            const baseItemPropertyCheck = itemPropertyCheck.itemCode
              .split('-')
              .slice(0, 2)
              .join('-');

            const lastPartItemCode = item.itemCode.split('-').pop();
            const lastPartItemPropertyCheck = itemPropertyCheck.itemCode
              .split('-')
              .pop();

            const isBaseCodeEqual = baseItemCode === baseItemPropertyCheck;

            const isLastPartEqual =
              ((lastPartItemCode === 'Q' || lastPartItemCode === 'R') &&
                (lastPartItemPropertyCheck === 'Q' ||
                  lastPartItemPropertyCheck === 'R')) ||
              ((lastPartItemCode === 'AW' || lastPartItemCode === 'BW') &&
                (lastPartItemPropertyCheck === 'BW' ||
                  lastPartItemPropertyCheck === 'AW')) ||
              ((lastPartItemCode === 'A' || lastPartItemCode === 'B') &&
                (lastPartItemPropertyCheck === 'B' ||
                  lastPartItemPropertyCheck === 'A')) ||
              ((lastPartItemCode === 'N' ||
                lastPartItemCode === 'T' ||
                lastPartItemCode === 'U') &&
                (lastPartItemPropertyCheck === 'N' ||
                  lastPartItemPropertyCheck === 'T' ||
                  lastPartItemPropertyCheck === 'U'));
            return isBaseCodeEqual && isLastPartEqual;
          });

          const existingChecksMap = new Map();
          for (const similarItem of similarItems) {
            const checks = await getItemPropertyChecksByUserContainerItem(
              selectedUser.id,
              selectedContainer,
              itemPropertyCheck.purchaseOrderNumber,
              similarItem.itemCode
            );

            const existingCheck = checks.find(
              (check) => check.propertyId === itemPropertyCheck.propertyId
            );

            existingChecksMap.set(similarItem.itemCode, existingCheck);
          }
          for (const similarItem of similarItems) {
            const existingCheck = existingChecksMap.get(similarItem.itemCode);
            if (!existingCheck) {
              await duplicateItemPropertyChecks(
                [similarItem],
                itemPropertyCheck
              );
            } else {
              await updateItemPropertyChecks([similarItem], itemPropertyCheck);
            }
          }
          return; // Exit to avoid duplicate save
        }
      }

      // Fetch existing checks for the specific item and property
      const existingChecks = await getItemPropertyChecksByUserContainerItem(
        selectedUser.id,
        selectedContainer,
        itemPropertyCheck.purchaseOrderNumber,
        itemPropertyCheck.itemCode
      );

      // Check if an entry already exists for the given propertyId
      const existingCheck = existingChecks.find(
        (check) => check.propertyId === itemPropertyCheck.propertyId
      );

      if (existingCheck) {
        // If exists, update it
        itemPropertyCheck.id = existingCheck.id;
        await updateItemPropertyCheck(itemPropertyCheck);
      } else {
        // If not exists, create a new entry
        await saveItemPropertyCheck(itemPropertyCheck);
      }


      // Refresh the item property checks to reflect the changes
      await fetchItemPropertyChecks(
        selectedUser.id,
        selectedContainer,
        selectedItem.purchaseOrderNumber,
        selectedItem.itemCode
      );
    } catch (error) {
      setErrorMessage('Error saving item property check');
    }
  };

  const duplicateItemPropertyChecks = async (similarItems, originalCheck) => {
    for (const item of similarItems) {
      const newCheck = {
        ...originalCheck,
        itemCode: item.itemCode,
        purchaseOrderNumber: item.purchaseOrderNumber.toString(),
      };

      // Save the new itemPropertyCheck
      try {
        if (newCheck.id) {
          await updateItemPropertyCheck(newCheck);
        } else {
          await saveItemPropertyCheck(newCheck);
        }
      } catch (error) {}
    }
  };

  const updateItemPropertyChecks = async (similarItems, originalCheck) => {
    for (const item of similarItems) {
      const updatedCheck = {
        ...originalCheck,
        itemCode: item.itemCode,
        purchaseOrderNumber: item.purchaseOrderNumber.toString(),
      };

      try {
        // Fetch existing check ID to ensure it's updated, not duplicated
        const existingChecks = await getItemPropertyChecksByUserContainerItem(
          selectedUser.id,
          selectedContainer,
          item.purchaseOrderNumber,
          item.itemCode
        );

        const existingCheck = existingChecks.find(
          (check) => check.propertyId === originalCheck.propertyId
        );

        if (existingCheck) {
          updatedCheck.id = existingCheck.id;
        }

        await updateItemPropertyCheck(updatedCheck);
      } catch (error) {
        setErrorMessage('Error updating item property check');
      }
    }
  };

  const handleComplete = () => {
    setIsModalOpen(false);
    setShowSummary(true);
  };

  const closeSummary = () => {
    setShowSummary(false);
  };

  const handleNext = () => {
    if (modalStep < modalDetails.length - 1) {
      setModalStep(modalStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleJumpToStep = (step) => {
    setModalStep(step);
  };

  const modalDetails = [];

  itemProperties.forEach((property) => {
    modalDetails.push({
      label: property.name,
      key: property.name,
      category: property.category,
      propertyId: property.id,
    });
    editableKeys.push(property.name);
  });

  const groupByCategory = (details) => {
    const categories = {};
    details.forEach((detail) => {
      if (!categories[detail.category]) {
        categories[detail.category] = [];
      }
      categories[detail.category].push(detail);
    });
    return categories;
  };

  const groupedDetails = groupByCategory(modalDetails);

  const exportToPDF = () => {
    if (!selectedItem || !selectedItem.itemCode) {
      alert('No item selected or item code not available.');
      return;
    }

    const doc = new jsPDF();

    // Adding the title
    doc.text('Summary of Recent Entries for ', 14, 22);
    doc.setTextColor(0, 0, 255); // Blue color for item code
    doc.text(`${selectedItem.itemCode}`, 93, 22);
    doc.setTextColor(255, 0, 0); // Red color for container number
    doc.text(`${selectedContainer}`, 160, 22);
    doc.setFontSize(12);

    const summaryData = [];

    Object.entries(groupedDetails).forEach(([category, details]) => {
      summaryData.push([
        {
          content: category.toUpperCase(),
          colSpan: 3,
          styles: {
            halign: 'center',
            fillColor: [102, 153, 204],
            textColor: [255, 255, 255],
          },
        },
      ]);

      details.forEach((detail) => {
        const check = itemPropertyChecks.find(
          (check) => check.propertyId === detail.propertyId
        );
        const note = check?.notes || '';
        const status = check?.status || '';

        // Determine text color based on status
        const statusColor =
          status.toLowerCase() === 'pass' ? [0, 128, 0] : [255, 0, 0];

        summaryData.push([
          { content: detail.label, styles: { halign: 'left' } },
          { content: note, styles: { halign: 'left' } },
          {
            content: status,
            styles: { halign: 'left', textColor: statusColor },
          },
        ]);
      });
    });

    doc.autoTable({
      startY: 30,
      head: [['Property', 'Note', 'Status']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [119, 221, 119] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 70 },
        2: { cellWidth: 40 },
      },
      styles: { overflow: 'linebreak' },
    });

    doc.save(`${selectedItem.itemCode}.pdf`);
  };

  const resetScan = () => {
    setUpcCode('');
    setSelectedContainer(null);
    setTrackingNumber('');
    setPoNumber('');
    setContainers([]);
    setItems([]);
    setSelectedItem(null);
    setItemDimensions(null);
    setItemProperties([]);
    setItemPropertyChecks([]);
    setErrorMessage('');
    setScanSuccess(false);
    setMissingItems([]);
    setTimeout(() => {
      if (upcRef.current) {
        upcRef.current.focus();
      }
    }, 0);
  };

  const showStatus = async () => {
    if (!selectedContainer) {
      setErrorMessage('Please select a container.');
      return;
    }
    let container = selectedContainer;
    try {
      const items = await getItemsByTrackingNumber(container);
      if (items && items.length > 0) {
        const validSuffixes = new Set([
          'Q',
          'R',
          'A',
          'B',
          'AW',
          'BW',
          'T',
          'U',
          'N',
        ]);
        const filteredItems = items.filter((item) => {
          const suffix = item.itemCode.split('-').slice(-1)[0];
          return validSuffixes.has(suffix);
        });

        const itemCodes = filteredItems.map(
          (item) => `${item.itemCode}-${item.purchaseOrderNumber}`
        );
        setItemCodes(itemCodes); // Store filtered item codes in the state

        // Fetch property checks and calculate counts for filtered items
        const counts = {};
        for (const item of filteredItems) {
          const checks = await getItemPropertyChecksByUserContainerItem(
            selectedUser.id,
            selectedContainer,
            item.purchaseOrderNumber,
            item.itemCode
          );
          const key = `${item.itemCode}-${item.purchaseOrderNumber}`;
          counts[key] = checks.filter((check) => check.status !== '').length;
        }
        setPropertyCheckCounts(counts);

        setIsStatusModalOpen(true); // Open the modal
      } else {
        console.log('No items found for this container.');
      }
    } catch (error) {
      console.error('Failed to fetch items', error);
    }
  };

  const finalize = async () => {
    try {
      if ((await getContainerStatus(selectedContainer)).completed === true) {
        setErrorMessage('Container has already been Checked!!!');
      } else {
        const items = await getItemsByTrackingNumber(selectedContainer);
        const totalProperties = itemProperties.length;
        const validSuffixes = new Set([
          'Q',
          'R',
          'A',
          'B',
          'AW',
          'BW',
          'T',
          'U',
          'N',
        ]);

        const filteredItems = items.filter((item) => {
          const suffix = item.itemCode.split('-').slice(-1)[0];
          return validSuffixes.has(suffix);
        });

        const expectedCheckCount = filteredItems.length * totalProperties;

        let totalCheckCount = 0;
        const missingItemsList = [];

        for (const item of filteredItems) {
          const checks = await getItemPropertyChecksByUserContainerItem(
            selectedUser.id,
            selectedContainer,
            item.purchaseOrderNumber,
            item.itemCode
          );

          totalCheckCount += checks.length;

          // Check for missing checks
          if (checks.length < totalProperties) {
            missingItemsList.push({
              itemCode: item.itemCode,
              poNumber: item.purchaseOrderNumber,
            });
          }
        }
        if (totalCheckCount === expectedCheckCount) {
          await saveStatus(selectedContainer.toString());
          setErrorMessage('Checksheet finalized successfully!');
        } else {
          setMissingItems(missingItemsList);
          setIsMissingItemsModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Error during finalization:', error);
      if (error.response) {
        console.error('Server Response:', error.response.data);
      }
      setErrorMessage('Failed to finalize checksheet. Please try again.');
    }
  };

  const closeStatusModal = () => {
    setIsStatusModalOpen(false);
  };

  const handleLogout = () => {
    try {
      if (window.confirm('Are you sure you want to logout?')) {
        // Redirect to the user selection page
        window.location.href = '/';
      } else {
        console.log('User canceled logout');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Dummy data
  // const handleManualQRDataInput = () => {
  //   const upcCode =
  //     '802616277384 :: CF D0 CB CD CF CB C6 BA CE C8 C7 E0 BF C6 CC CF D3 D0 CD CB CA D3 BE B4 BD B5 D3 AE C6 CE D0 CE CC D3 D0 C9 D3 D0 CF'; // Your QR code data
  //   setUpcCode(upcCode);
  //   handleQRScan(upcCode);
  // };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white text-xl font-serif flex items-center justify-between px-4 py-2 hover:bg-blue-900 transition duration-300 cursor-pointer">
        Check Sheets
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowSummary(true)}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            <FontAwesomeIcon icon={faList} />
          </button>
          <FontAwesomeIcon icon={faPowerOff} onClick={handleLogout} />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-4 space-y-4">
        {!scanSuccess && (
          <div className="relative h-12 w-full max-w-xs">
            <input
              ref={upcRef}
              type="text"
              className="h-12 w-full max-w-xs bg-white border-2 border-blue-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200 mb-4 p-2 text-lg"
              placeholder="Scan QR Code"
              value={upcCode}
              onChange={handleUPCChange}
            />
            {upcCode && (
              <button
                onClick={clearUPCCode}
                className="absolute inset-y-0 right-0 px-3 py-2 text-red-500 hover:text-red-700 focus:outline-none"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
        )}
        {scanSuccess && selectedItem && (
          <div className="bg-white p-4 rounded-lg shadow-lg mt-4 w-full max-w-xs">
            <div className="mb-2">
              <span className="font-bold">Description:</span>{' '}
              {selectedItem.description || 'N/A'}
            </div>
            <div className="mb-2">
              <span className="font-bold">Document Date:</span>{' '}
              {selectedItem.docDate.split(' ')[0] || 'N/A'}
            </div>
            <div className="mb-2">
              <span className="font-bold">Purchase Order Number:</span>{' '}
              {selectedItem.purchaseOrderNumber || 'N/A'}
            </div>
            <div className="mb-2 flex items-center">
              <span className="font-bold mr-2">Container:</span>{' '}
              {containers.length > 1 ? (
                <div>
                  <select
                    value={selectedContainer}
                    onChange={(e) => setSelectedContainer(e.target.value)}
                    className="border-2 border-blue-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200 mb-3 p-2 text-lg w-full"
                  >
                    <option value="">Select Container</option>
                    {containers.map((container) => (
                      <option
                        key={container.trackingNumber}
                        value={container.trackingNumber}
                      >
                        {container.trackingNumber}
                      </option>
                    ))}
                  </select>
                  {errorMessage && (
                    <div className="text-red-500 mt-2">{errorMessage}</div>
                  )}
                </div>
              ) : (
                <span>{selectedItem.container || 'N/A'}</span>
              )}
            </div>
            <button
              onClick={openModal}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 mt-4 w-full"
            >
              Start Checking Me!
            </button>
          </div>
        )}
        {scanSuccess && (
          <div>
            <button
              onClick={resetScan}
              className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-700 mt-4 w-full"
            >
              Scan Another QR Code
            </button>
            <button
              onClick={showStatus}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-yellow-700 mt-4 w-full"
            >
              Check the Status
            </button>
            <button
              onClick={finalize}
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-yellow-700 mt-4 w-full"
            >
              Finalize Checksheet!
            </button>
            {isMissingItemsModalOpen && (
              <MissingItemsModal
                isOpen={isMissingItemsModalOpen}
                onClose={() => setIsMissingItemsModalOpen(false)}
                missingItems={missingItems}
              />
            )}
          </div>
        )}
        {errorMessage && (
          <div className="text-red-500 mt-4">{errorMessage}</div>
        )}
        {/* <button
          onClick={handleManualQRDataInput}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 mt-4 w-full"
        >
          Test QR Code Data
        </button> */}
      </div>
      {showSummary && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full space-y-4 overflow-y-auto max-h-screen">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold mb-4 text-blue-700">
                Summary of Recent Entries
              </h2>
              <button
                onClick={closeSummary}
                className="text-red-500 hover:text-red-700"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>
            <div id="summary-content">
              {selectedItem ? (
                Object.entries(groupedDetails)
                  .sort(([categoryA], [categoryB]) => {
                    if (categoryA === 'case dimensions') return -1;
                    if (categoryB === 'case dimensions') return 1;
                    if (categoryA === 'box dimensions') return -1;
                    if (categoryB === 'box dimensions') return 1;
                    return 0;
                  })
                  .map(([category, details], index) => (
                    <div key={index} className="mb-4">
                      <h3 className="text-xl font-semibold mb-2 text-blue-700 capitalize">
                        {category}
                      </h3>
                      {details.map((detail, idx) => (
                        <div key={idx} className="mb-2">
                          <p>
                            <span className="font-bold capitalize">
                              {detail.label}:
                            </span>{' '}
                            {(() => {
                              const check = itemPropertyChecks.find(
                                (check) =>
                                  check.propertyId === detail.propertyId &&
                                  check.itemCode === selectedItem.itemCode &&
                                  check.containerCode === selectedContainer &&
                                  check.userId === selectedUser.id
                              );
                              if (check) {
                                const icon =
                                  check.status === 'Pass' ? (
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="text-green-500"
                                    />
                                  ) : (
                                    <FontAwesomeIcon
                                      icon={faTimesCircle}
                                      className="text-red-500"
                                    />
                                  );
                                return (
                                  <>
                                    {check.notes || 'Empty'} {icon}
                                  </>
                                );
                              }
                              return '';
                            })()}
                          </p>
                        </div>
                      ))}
                      <hr className="my-2 border-t border-gray-300" />
                    </div>
                  ))
              ) : (
                <div className="text-center text-red-500">
                  Please select an item code to display the summary.
                </div>
              )}
            </div>
            <button
              onClick={exportToPDF}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 w-full"
            >
              Export to PDF
            </button>
            <button
              onClick={closeSummary}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {!showSummary && (
        <Modal
          key={isModalOpen ? 'open' : 'closed'}
          isOpen={isModalOpen}
          step={modalStep}
          data={{
            ...selectedItem,
            ...itemDimensions,
            properties: itemProperties,
            itemPropertyChecks,
            upcCode,
            factory,
            selectedContainer,
          }}
          onClose={closeAll}
          onNext={handleNext}
          onPrev={() => setModalStep(modalStep - 1)}
          onSave={handleSave}
          modalDetails={modalDetails}
          onJumpToStep={handleJumpToStep}
          showSummary={() => setShowSummary(true)} // Pass showSummary function
          selectedUser={selectedUser}
        />
      )}

      {isStatusModalOpen && (
        <StatusModal
          itemCodes={itemCodes}
          propertiesLength={propertiesLength}
          propertyCheckCounts={propertyCheckCounts}
          onClose={closeStatusModal}
          currentItem={selectedItem.itemCode}
          currentPO={poNumber}
        />
      )}
    </div>
  );
}

export default Header;
