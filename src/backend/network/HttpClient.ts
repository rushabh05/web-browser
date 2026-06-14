import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export class HttpClient {
  private cache: Map<string, HttpResponse> = new Map();

  async fetchUrl(urlString: string): Promise<string> {
    try {
      const url = new URL(urlString);
      const cachedResponse = this.cache.get(urlString);

      if (cachedResponse) {
        return cachedResponse.body;
      }

      const response = await this.makeRequest(url);

      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        return this.fetchUrl(response.headers.location);
      }

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.cache.set(urlString, response);
      return response.body;
    } catch (error) {
      throw new Error(`Failed to fetch ${urlString}: ${(error as Error).message}`);
    }
  }

  private makeRequest(url: URL): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const options = {
        method: 'GET',
        timeout: 10000,
      };

      const req = client.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            headers[key] = Array.isArray(value) ? value.join('; ') : value || '';
          }

          resolve({
            status: res.statusCode || 200,
            headers,
            body: data,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}
