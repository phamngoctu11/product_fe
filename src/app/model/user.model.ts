import { CartRes } from './cart.model';
export interface UserResListDTO {
  id: number;
  firstname: string;
  lastname: string;
  role: string;
  reputation: number;
}
export interface UserCreDTO {
  id?: number;
  firstname: string;
  lastname: string;
  username: string;
  password?: string;
  gender: string;
  address: string;
  phone: string;
  birth: Date;
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
export interface UserInforDTO {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  gender: string;
  address: string;
  birth: Date;
  phone: string;
  cart: CartRes;
  reputation: number;
}
