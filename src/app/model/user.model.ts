import { CartRes } from './cart.model';
export interface UserResListDTO {
  id: string;
  firstname: string;
  lastname: string;
  role: string;
  reputation: number;
  avatar_url?: string;
}
export interface UserCreDTO {
  id?: string;
  firstname: string;
  lastname: string;
  username: string;
  password?: string;
  gender: string;
  address: string;
  phone: string;
  birth: Date;
  role?: string;
  avatar_url?: string;
  email:string;
}
export interface LoginResponse {
  accessToken: string;
  user_id: string;
  username: string;
}
export interface LoginRequest {
  username: string;
  password?: string;
}
export interface UserInforDTO {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  gender: string;
  address: string;
  birth: Date;
  phone: string;
  cart: CartRes;
  reputation: number;
  avatar_url?: string;
  email:string;
}
