export interface MockResponse<T = any> {
  statusCode: number;
  body: T | undefined;
  status(code: number): this;
  json(payload: T): this;
}

export function createMockResponse<T = any>(): MockResponse<T> {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: T) {
      this.body = payload;
      return this;
    },
  } as MockResponse<T>;
}
