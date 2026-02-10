import { CartRes } from './cart.model';

export interface UserResDTO {
  id: number;
  username: string;
  role: string;
  cart: CartRes;
}

export interface UserCreDTO {
  id?: number;
  username: string;
  password?: string;
  role?: string;
}
export interface LoginResponse {
  accessToken: string;
  user_id: number;
  username: string;
}

export interface LoginRequest {
  username: string;
  password?: string;
}
