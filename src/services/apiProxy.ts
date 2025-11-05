import fetch from 'node-fetch';
import { IncomingHttpHeaders } from 'http';

export interface ProxyRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body?: any;
}

export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export class ApiProxy {
  private targetApiUrl: string;

  constructor(targetApiUrl: string) {
    this.targetApiUrl = targetApiUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Proxy a request to the target API
   */
  async proxyRequest(req: ProxyRequest): Promise<ProxyResponse> {
    const targetUrl = `${this.targetApiUrl}${req.url}`;

    // Filter out headers that shouldn't be forwarded
    const headersToForward: Record<string, string> = {};
    const headersToSkip = [
      'host',
      'connection',
      'content-length',
      'transfer-encoding',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host',
    ];

    for (const [key, value] of Object.entries(req.headers)) {
      if (value && !headersToSkip.includes(key.toLowerCase())) {
        headersToForward[key] = Array.isArray(value) ? value[0] : value;
      }
    }

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: headersToForward,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });

      const responseBody = await response.text();
      let parsedBody: any;
      
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }

      // Convert Headers object to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        headers: responseHeaders,
        body: parsedBody,
      };
    } catch (error) {
      throw new Error(`Proxy request failed: ${error}`);
    }
  }
}

