export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  pagination: PaginationInfo;
  [key: string]: T[] | PaginationInfo; // Allow for books: Book[] or librarians: Librarian[]
}

import { Book, Librarian } from '@usufruit/models';

export interface PaginatedBooksResponse {
  books: Book[];
  pagination: PaginationInfo;
}

export interface PaginatedLibrariansResponse {
  librarians: Librarian[];
  pagination: PaginationInfo;
}
