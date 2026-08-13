import axios from "axios";

const API_URL = "http://192.168.16.108:5000";

export const createOrder = async (payload) => {
  const res = await axios.post(
    `${API_URL}/api/payment/create-order`,
    payload
  );

  return res.data;
};