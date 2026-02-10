import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductCreDTO, ProductResDTO } from '../model/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = 'http://localhost:8080/api/products';
  constructor(private http: HttpClient) {}
  create(product: ProductCreDTO): Observable<ProductCreDTO> {
    return this.http.post<ProductCreDTO>(this.apiUrl, product);
  }

  getAll(): Observable<ProductResDTO[]> {
    return this.http.get<ProductResDTO[]>(this.apiUrl);
  }
  update(id: number, user: ProductResDTO): Observable<ProductResDTO> {
    return this.http.put<ProductResDTO>(`${this.apiUrl}/${id}`, user);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}
