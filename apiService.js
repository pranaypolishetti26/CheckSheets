import axios from 'axios';

const API_BASE_URL = 'https://api.corkysfootwear.com';

export const getContainerIDs = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/CheckSheets/container`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch container IDs:', error);
    throw error;
  }
};

export const getItemsByTrackingNumber = async (trackingNumber) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/CheckSheets/item/${trackingNumber}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch items by tracking number:', error);
    throw error;
  }
};

export const getItemDimensions = async (itemCode) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/CheckSheets/item/${itemCode}/dimensions`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch dimensions for item:', error);
    throw error;
  }
};

export const getItemProperties = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/CheckSheets/property`);
    return response.data;
  } catch (error) {
    console.error('Error fetching item properties:', error);
    throw error;
  }
};

export const saveItemPropertyCheck = async (itemPropertyCheck) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/CheckSheets/item-property-check`,
      itemPropertyCheck
    );
    return response.data;
  } catch (error) {
    console.error('Failed to save item property check:', error);
    throw error;
  }
};

export const getItemPropertyChecksByItemCode = async (itemCode) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/CheckSheets/item-property-check/item/${itemCode}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch item property checks:', error);
    throw error;
  }
};

export const getItemByUPCAndContainer = async (upcCode, container) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/CheckSheets/item/container/${container}/upc/${upcCode}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch item by UPC and container:', error);
    throw error;
  }
};

export const getContainersByPONumber = async (poNum) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/CheckSheets/container/po/${poNum}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch containers by PO number:', error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/CheckSheets/user`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};

export const getUserById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/CheckSheets/user/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch user by ID (${id}):`, error);
    throw error;
  }
};

// Function to update item property check
export const updateItemPropertyCheck = async (itemPropertyCheck) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/CheckSheets/item-property-check/${itemPropertyCheck.id}`,
      itemPropertyCheck
    );
    return response.data;
  } catch (error) {
    console.error('Failed to update item property check', error);
    throw error;
  }
};

export const getItemPropertyChecksByUserContainerItem = async (
  userId,
  containerCode,
  po,
  itemCode
) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/CheckSheets/item-property-check/user/${userId}/container/${containerCode}/po/${po}/item/${itemCode}`
    );
    return response.data;
  } catch (error) {
    console.error(
      'Failed to fetch item property checks by user, container, and item:',
      error
    );
    throw error;
  }
};

export const getSizesBySizeRun = async (sizeCode) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/CheckSheets/size-run/${sizeCode}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch packing data by UPC:', error);
    throw error;
  }
};

export const getShoeDetailsByUPC = async (upc) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/CheckSheets/shoe/${upc}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch shoe details by UPC:', error);
    throw error;
  }
};

export const getContainerStatus = async (container) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/CheckSheets/container-processing/complete/${container}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch status of the Container:', error);
    throw error;
  }
};

export const saveStatus = async (container) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/CheckSheets/container-processing/complete/${container}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};