import axios from 'axios';

export interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface MatrixResult {
  distances: number[][]; // meters
  durations: number[][]; // seconds
  sources: Coordinate[];
  destinations: Coordinate[];
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAX_COORDS = 25; // Mapbox limit

export class MapboxMatrixService {
  private cache = new Map<string, MatrixResult>();

  async getMatrix(coordinates: Coordinate[]): Promise<MatrixResult> {
    if (!MAPBOX_TOKEN) {
      console.error('❌ Mapbox Error: Token missing');
      throw new Error('Mapbox access token not configured');
    }

    if (coordinates.length > MAX_COORDS) {
      throw new Error(`Maximum ${MAX_COORDS} coordinates allowed`);
    }

    // Validate coordinates
    coordinates.forEach((coord, index) => {
      if (
        !coord ||
        typeof coord.latitude !== 'number' ||
        typeof coord.longitude !== 'number'
      ) {
        console.error(`❌ Invalid coordinate at index ${index}:`, coord);
        throw new Error(`Invalid coordinate at index ${index}`);
      }
      
      if (coord.latitude === 0 && coord.longitude === 0) {
        console.error(`❌ Invalid 0,0 coordinate at index ${index}`);
        throw new Error(`Invalid coordinate (0,0) at index ${index}. Please select a valid location.`);
      }

      if (Math.abs(coord.latitude) > 90 || Math.abs(coord.longitude) > 180) {
        console.error(`❌ Out of range coordinate at index ${index}:`, coord);
        throw new Error(`Coordinate out of range at index ${index}`);
      }
    });

    const cacheKey = this.getCacheKey(coordinates);
    if (this.cache.has(cacheKey)) {

      return this.cache.get(cacheKey)!;
    }

    const coordsString = coordinates
      .map(c => `${c.longitude},${c.latitude}`)
      .join(';');

    const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordsString}`;
    


    try {
      const response = await axios.get(url, {
        params: {
          access_token: MAPBOX_TOKEN,
          annotations: 'distance,duration',
        },
        timeout: 10000,
      });

      if (!response.data || !response.data.distances || !response.data.durations) {
        console.error('❌ Invalid Mapbox response format:', response.data);
        throw new Error('Invalid response from Mapbox');
      }

      const result: MatrixResult = {
        distances: response.data.distances,
        durations: response.data.durations,
        sources: coordinates,
        destinations: coordinates,
      };


      this.cache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Mapbox API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      } else {
        console.error('❌ Mapbox Unexpected Error:', error);
      }
      
      if (error.response?.status === 429) {
        throw new Error('تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة بعد قليل.');
      }
      
      throw new Error('فشل حساب المسافات. يرجى المحاولة مرة أخرى.');
    }
  }

  private getCacheKey(coords: Coordinate[]): string {
    return coords
      .map(c => `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`)
      .join('|');
  }

  clearCache() {
    this.cache.clear();
  }
}

export const mapboxMatrix = new MapboxMatrixService();
