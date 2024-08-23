import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getItemPropertyChecksByUserContainerItem } from './apiService';
import PackingOrderModal from './PackingOrderModal';

function Modal({
  isOpen,
  step,
  data,
  onClose,
  onNext,
  onPrev,
  onSave,
  onJumpToStep,
  showSummary,
  selectedUser,
}) {
  const [inputValue, setInputValue] = useState('');
  const [category, setCategory] = useState('');
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isPackingOrderModalOpen, setIsPackingOrderModalOpen] = useState(false);
  const [allChecked, setAllChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [checkedStates, setCheckedStates] = useState([]);

  const combinedDimensions = [
    'Case Length',
    'Case Width',
    'Case Height',
    'Case Weight',
    'Box Length',
    'Box Width',
    'Box Height',
    'Box Weight',
  ];

  const details = data.properties.map((property) => {
    let parsedOptions = [];
    if (property.type === 'select') {
      try {
        parsedOptions = JSON.parse(property.options);
      } catch (error) {
        console.error(
          `Failed to parse options for property ${property.name}:`,
          error
        );
      }
    }

    return {
      label: property.name,
      key: property.name,
      category: property.category,
      propertyId: property.id,
      type: property.type,
      options: parsedOptions,
    };
  });

  // Sort the details array
  details.sort((a, b) => {
    if (a.category === 'case dimensions' && b.category !== 'case dimensions') {
      return -1;
    }
    if (a.category !== 'case dimensions' && b.category === 'case dimensions') {
      return 1;
    }
    return 0;
  });

  useEffect(() => {
    const fetchData = async () => {
      if (details[step]) {
        const detail = details[step];
        let existingValue = '';

        switch (details[step].type) {
          case 'colorName':
            existingValue = data.colorName || '';
            break;
          case 'description':
            existingValue = data.description.split(' - ')[0] || '';
            break;
          case 'factory':
            existingValue = data.factoryCode || '';
            break;
          case 'itemCode':
            existingValue = data.itemCode[data.itemCode.length - 1] || '';
            break;
          case 'upcCode':
            existingValue = data.upcCode || '';
            break;
          default:
            existingValue = '';
        }

        try {
          const checks = await getItemPropertyChecksByUserContainerItem(
            selectedUser.id,
            data.selectedContainer,
            data.purchaseOrderNumber,
            data.itemCode
          );
          const check = checks.find(
            (check) => check.propertyId === detail.propertyId
          );

          if (check) {
            setInputValue(check.notes);
          } else {
            setInputValue(existingValue);
          }
          setCategory(details[step].category || '');
          setIsValid(true); // Set initial state to valid
        } catch (error) {
          console.error('Failed to fetch item property checks', error);
          setInputValue(existingValue);
          setCategory('');
          setIsValid(true);
        }
      } else {
        setInputValue('');
        setCategory('');
        setIsValid(true);
      }
    };

    if (isOpen) {
      fetchData();
    } else {
      setInputValue(''); // Reset input value when modal is closed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, data, isOpen, selectedUser.id]);

  useEffect(() => {
    if (!inputValue && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue, step]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000); // 3 seconds delay, adjust as needed

      return () => clearTimeout(timer); // Cleanup timer on component unmount or if errorMessage changes
    }
  }, [errorMessage]);

  if (!isOpen || !data) return null;

  const handleChange = (event) => {
    let { value } = event.target;

    // Convert lowercase letters to uppercase
    value = value.toUpperCase();
    setInputValue(value);
    setIsValid(true); // Resetting validation state when user types
    setErrorMessage('');

    setInputValue(value);
  };

  function debounce(func, delay) {
    let debounceTimer;
    return function (...args) {
      const context = this;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
  }

  const debouncedHandleSave = debounce(async (status) => {
    if (loading) return;
    setLoading(true);
    if (details[step].type === 'packingOrder') {
      if (status === 'Pass' && !allChecked) {
        setErrorMessage('All items must be checked before passing.');
        setLoading(false);
        return;
      }
    }
    if (details[step].type === 'select' && inputValue === '') {
      setErrorMessage('Please select Textile or No Textile.');
      setLoading(false);
      return;
    }

    if (status === 'Pass') {
      if (details[step].type === 'dateCode') {
        const isValidFormat = /^[A-Z][0-3][0-9][A-Z]$/.test(inputValue);
        const day = parseInt(inputValue.slice(1, 3), 10);

        if (!(isValidFormat && day >= 1 && day <= 31)) {
          setErrorMessage(
            'Invalid date code format. Must be in format A01B where A and B are letters, and 01 is between 01 and 31.'
          );
          setLoading(false);
          return;
        }
      }
    } else if (status === 'Fail') {
      setErrorMessage('');
    }

    if (isValid) {
      setErrorMessage('');
      const currentDetail = details[step];
      const property = data.properties.find(
        (prop) =>
          prop.name === currentDetail.key &&
          prop.category === currentDetail.category &&
          prop.id === currentDetail.propertyId
      );

      let itemPropertyCheck = {
        id: 0,
        userId: selectedUser.id,
        propertyId: property ? property.id : 0,
        itemCode: data.itemCode,
        containerCode: data.selectedContainer,
        status: status,
        notes: inputValue,
        dateChecked: new Date().toISOString(),
        purchaseOrderNumber: data.purchaseOrderNumber.toString(),
      };

      try {
        const checks = await getItemPropertyChecksByUserContainerItem(
          selectedUser.id,
          data.selectedContainer,
          data.purchaseOrderNumber,
          data.itemCode
        );
        const existingCheck = checks.find(
          (check) => check.propertyId === currentDetail.propertyId
        );

        if (existingCheck) {
          itemPropertyCheck.id = existingCheck.id;
        }
      } catch (error) {
        console.error('Failed to save item property check', error);
      }

      onSave(itemPropertyCheck);

      if (step < details.length - 1) {
        onNext();
      } else {
        showSummary();
        onClose();
      }
    } else {
      console.log('Save skipped: invalid or already saving');
    }
    setLoading(false);
  }, 300);

  const handleJumpToStep = (event) => {
    const selectedStep = parseInt(event.target.value, 10);
    onJumpToStep(selectedStep);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      debouncedHandleSave('Pass');
    }
  };

  const openPackingOrderModal = () => {
    setAllChecked(false);
    setIsPackingOrderModalOpen(true);
  };

  const closePackingOrderModal = () => {
    setIsPackingOrderModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center px-4 pb-16">
      <div className="bg-white px-6 py-6 mb-16 rounded-lg shadow-lg max-w-md w-full space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={onPrev}
              disabled={step === 0}
              className="text-blue-500 hover:text-blue-700 disabled:opacity-50 pr-12"
            >
              <FontAwesomeIcon icon={faArrowLeft} size="2x" />
            </button>
            <p className="text-lg font-bold capitalize">{category}</p>
          </div>
          <button onClick={onClose} className="text-red-500 hover:text-red-700">
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        <h4 className="text-lg font-bold capitalize ml-1">
          {details[step].label}
        </h4>
        <select
          onChange={handleJumpToStep}
          value={step}
          className="w-full p-2 border-2 border-gray-300 rounded capitalize"
        >
          {details.map((detail, index) => (
            <option key={index} value={index}>
              {detail.label}
            </option>
          ))}
        </select>
        {details[step].type === 'dateCode' ? (
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            required
            className={`w-full p-2 border-2 rounded ${
              isValid ? 'border-gray-300' : 'border-red-500'
            }`}
            placeholder="Enter Date Code (e.g., A01B)"
          />
        ) : combinedDimensions.includes(details[step].key) ? (
          <input
            type="number"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`w-full p-2 border-2 rounded ${
              isValid ? 'border-gray-300' : 'border-red-500'
            }`}
            placeholder="Enter Value"
          />
        ) : details[step].type === 'select' ? (
          <select
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full p-2 border-2 rounded"
          >
            <option value="">Select an Option</option>
            {details[step].options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        ) : details[step].type === 'packingOrder' ? (
          <>
            <button
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 w-full"
              onClick={openPackingOrderModal}
            >
              Check Packing Order
            </button>
          </>
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            className={`w-full p-2 border-2 rounded ${
              isValid ? 'border-gray-300' : 'border-red-500'
            }`}
            placeholder="Notes"
          />
        )}
        {!isValid && (
          <p className="text-red-500">
            Invalid input. Please enter a valid number.
          </p>
        )}
        {isPackingOrderModalOpen && (
          <PackingOrderModal
            isOpen={isPackingOrderModalOpen}
            onClose={closePackingOrderModal}
            data={data}
            allChecked={allChecked}
            setAllChecked={setAllChecked}
            checkedStates={checkedStates}
            setCheckedStates={setCheckedStates}
          />
        )}
        {errorMessage && (
          <div className="text-red-500 mt-2">{errorMessage}</div>
        )}
        <div className="flex justify-between mt-4">
          {combinedDimensions.includes(details[step].key) ? (
            <button
              onClick={() => {
                if (inputValue === '') {
                  setIsValid(false);
                } else {
                  setIsValid(true);
                  debouncedHandleSave('Pass');
                }
              }}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 w-full"
            >
              Submit
            </button>
          ) : (
            <>
              <button
                onClick={() => debouncedHandleSave('Fail')}
                className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-700 w-full mr-2"
              >
                FAIL
              </button>
              <button
                onClick={() => debouncedHandleSave('Pass')}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 w-full ml-2"
                disabled={loading}
              >
                PASS
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
