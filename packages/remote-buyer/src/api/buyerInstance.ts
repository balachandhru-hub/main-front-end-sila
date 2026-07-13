import axios from 'axios';

const baseURL = import.meta.env.VITE_AUTH_API_BASE;
const apiKey = 'N8qX2LmP7vRa5HdK9sWy4JcTf1AzNgEuXm6BpLr3YvCi0FoMsZaDhUk8QtGeXwPnV';

const buyerInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  },
  withCredentials: true,
});

export default buyerInstance;