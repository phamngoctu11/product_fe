import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductCreDTO, ProductResDTO } from '../model/product.model';
import { PageResponse } from '../model/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = 'http://localhost:8080/api/products';
  constructor(private http: HttpClient) {}
  create(product: ProductCreDTO): Observable<ProductCreDTO> {
    return this.http.post<ProductCreDTO>(this.apiUrl, product);
  }
getAll(page: number = 0, size: number = 10): Observable<PageResponse<ProductResDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    // Đổi kiểu trả về thành PageResponse
    return this.http.get<PageResponse<ProductResDTO>>(this.apiUrl, { params });
  }
  update(id: number, user: ProductResDTO): Observable<ProductResDTO> {
    return this.http.put<ProductResDTO>(`${this.apiUrl}/${id}`, user);
  }
  getById(id:number):Observable<ProductResDTO>{
    return this.http.get<ProductResDTO>(`${this.apiUrl}/${id}`)
  }
  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}
