import axios, { AxiosRequestConfig } from 'axios';
export declare const axiosPostWithRetry: (url: string, data: any, config?: AxiosRequestConfig, retries?: number) => Promise<axios.AxiosResponse<any, any, {}>>;
