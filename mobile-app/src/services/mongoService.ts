import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  MONGODB_DATA_API_URL, 
  MONGODB_API_KEY, 
  MONGODB_DATA_SOURCE, 
  MONGODB_DATABASE 
} from '../constants/config';

export interface MongoQueryOptions {
  filter?: Record<string, any>;
  sort?: Record<string, any>;
  limit?: number;
  projection?: Record<string, any>;
}

class MongoService {
  private isConfigured(): boolean {
    return Boolean(MONGODB_DATA_API_URL && MONGODB_API_KEY);
  }

  private getStorageKey(collection: string): string {
    return `@church_app_db_${collection}`;
  }

  // Get all local collection items
  async getLocalCollection(collection: string): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(this.getStorageKey(collection));
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn(`Error reading local collection ${collection}:`, err);
      return [];
    }
  }

  // Set all local collection items
  async setLocalCollection(collection: string, items: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getStorageKey(collection), JSON.stringify(items));
    } catch (err) {
      console.warn(`Error writing local collection ${collection}:`, err);
    }
  }

  // Generate unique ID like Mongo ObjectId
  generateId(): string {
    const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
    const randomHex = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => 
      Math.floor(Math.random() * 16).toString(16)
    );
    return `${timestamp}${randomHex}`.substring(0, 24);
  }

  // Direct MongoDB Atlas Data API Request
  private async executeAtlasAction(action: string, payload: Record<string, any>): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('MongoDB Atlas Data API not configured');
    }

    const url = `${MONGODB_DATA_API_URL}/action/${action}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': MONGODB_API_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        dataSource: MONGODB_DATA_SOURCE,
        database: MONGODB_DATABASE,
        ...payload,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MongoDB Data API error [${response.status}]: ${errorText}`);
    }

    return await response.json();
  }

  // FIND: Find documents matching query
  async find(collection: string, options: MongoQueryOptions = {}): Promise<any[]> {
    // Attempt remote MongoDB Atlas Data API query if configured
    if (this.isConfigured()) {
      try {
        const payload: Record<string, any> = { collection };
        if (options.filter) payload.filter = options.filter;
        if (options.sort) payload.sort = options.sort;
        if (options.limit) payload.limit = options.limit;
        if (options.projection) payload.projection = options.projection;

        const result = await this.executeAtlasAction('find', payload);
        if (result && Array.isArray(result.documents)) {
          // Update local cache
          await this.setLocalCollection(collection, result.documents);
          return result.documents;
        }
      } catch (err) {
        console.warn(`MongoDB Atlas remote find failed, falling back to local DB:`, err);
      }
    }

    // Local DB query fallback
    let items = await this.getLocalCollection(collection);

    if (options.filter && Object.keys(options.filter).length > 0) {
      items = items.filter(item => {
        return Object.entries(options.filter!).every(([key, val]) => {
          if (key === '_id' || key === 'id') {
            return (item._id === val || item.id === val);
          }
          if (typeof val === 'object' && val !== null) {
            if ('$in' in val && Array.isArray(val.$in)) {
              return val.$in.includes(item[key]);
            }
            if ('$ne' in val) {
              return item[key] !== val.$ne;
            }
          }
          return item[key] === val;
        });
      });
    }

    if (options.sort) {
      const [sortKey, sortDir] = Object.entries(options.sort)[0] || [];
      if (sortKey) {
        items.sort((a, b) => {
          const valA = a[sortKey] ?? '';
          const valB = b[sortKey] ?? '';
          if (valA < valB) return sortDir === -1 ? 1 : -1;
          if (valA > valB) return sortDir === -1 ? -1 : 1;
          return 0;
        });
      }
    }

    if (options.limit && options.limit > 0) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  // FIND ONE: Find single document
  async findOne(collection: string, filter: Record<string, any>): Promise<any | null> {
    if (this.isConfigured()) {
      try {
        const result = await this.executeAtlasAction('findOne', {
          collection,
          filter,
        });
        if (result && result.document) {
          return result.document;
        }
      } catch (err) {
        console.warn(`MongoDB Atlas remote findOne failed, falling back to local DB:`, err);
      }
    }

    const items = await this.find(collection, { filter, limit: 1 });
    return items.length > 0 ? items[0] : null;
  }

  // INSERT ONE: Insert a new document
  async insertOne(collection: string, document: Record<string, any>): Promise<any> {
    const docWithId = {
      _id: document._id || this.generateId(),
      createdAt: document.createdAt || new Date().toISOString(),
      updatedAt: document.updatedAt || new Date().toISOString(),
      ...document,
    };

    // Save locally first for instant reactivity
    const items = await this.getLocalCollection(collection);
    items.unshift(docWithId);
    await this.setLocalCollection(collection, items);

    // Sync to MongoDB Atlas
    if (this.isConfigured()) {
      try {
        await this.executeAtlasAction('insertOne', {
          collection,
          document: docWithId,
        });
      } catch (err) {
        console.warn(`MongoDB Atlas insertOne remote sync failed:`, err);
      }
    }

    return docWithId;
  }

  // UPDATE ONE: Update document matching filter
  async updateOne(
    collection: string, 
    filter: Record<string, any>, 
    update: Record<string, any>
  ): Promise<boolean> {
    const setFields = update.$set || update;
    setFields.updatedAt = new Date().toISOString();

    const items = await this.getLocalCollection(collection);
    let matched = false;

    const updatedItems = items.map(item => {
      const isMatch = Object.entries(filter).every(([k, v]) => {
        if (k === '_id' || k === 'id') return item._id === v || item.id === v;
        return item[k] === v;
      });

      if (isMatch) {
        matched = true;
        return { ...item, ...setFields };
      }
      return item;
    });

    if (matched) {
      await this.setLocalCollection(collection, updatedItems);
    }

    if (this.isConfigured()) {
      try {
        await this.executeAtlasAction('updateOne', {
          collection,
          filter,
          update: { $set: setFields },
        });
      } catch (err) {
        console.warn(`MongoDB Atlas updateOne remote sync failed:`, err);
      }
    }

    return matched;
  }

  // DELETE ONE: Delete document matching filter
  async deleteOne(collection: string, filter: Record<string, any>): Promise<boolean> {
    const items = await this.getLocalCollection(collection);
    const filteredItems = items.filter(item => {
      return !Object.entries(filter).every(([k, v]) => {
        if (k === '_id' || k === 'id') return item._id === v || item.id === v;
        return item[k] === v;
      });
    });

    const deleted = filteredItems.length < items.length;
    if (deleted) {
      await this.setLocalCollection(collection, filteredItems);
    }

    if (this.isConfigured()) {
      try {
        await this.executeAtlasAction('deleteOne', {
          collection,
          filter,
        });
      } catch (err) {
        console.warn(`MongoDB Atlas deleteOne remote sync failed:`, err);
      }
    }

    return deleted;
  }

  // COUNT
  async count(collection: string, filter: Record<string, any> = {}): Promise<number> {
    const items = await this.find(collection, { filter });
    return items.length;
  }
}

export const mongoService = new MongoService();
