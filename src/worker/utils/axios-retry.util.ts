import axios, { AxiosRequestConfig } from 'axios';
import * as https from 'https';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 3000,
});

export const axiosPostWithRetry = async (url: string, data: any, config: AxiosRequestConfig = {}, retries = 3) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, {
        ...config,
        httpsAgent,
        timeout: 30000, // 30s timeout
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errorCode = error.code || error.response?.status;
      console.warn(`[Axios Retry] Attempt ${i + 1} failed for ${url} with error: ${errorCode}`);
      
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || (error.response && error.response.status >= 500)) {
        // Wait longer on each retry (Exponential backoff: 2s, 4s, 6s)
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      } else {
        throw error;
      }
    }
  }
  throw lastError;
};
