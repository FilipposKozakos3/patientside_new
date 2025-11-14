// Local storage utilities for health records

import { StoredHealthRecord } from '../types/fhir';

const STORAGE_KEY = 'patient_health_records';
const PATIENT_INFO_KEY = 'patient_info';

export const storageUtils = {
  // Get all records
  getAllRecords: (): StoredHealthRecord[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading records:', error);
      return [];
    }
  },

  // Get record by ID
  getRecordById: (id: string): StoredHealthRecord | null => {
    const records = storageUtils.getAllRecords();
    return records.find(r => r.id === id) || null;
  },

  // Add or update record
  saveRecord: (record: StoredHealthRecord): void => {
    const records = storageUtils.getAllRecords();
    const existingIndex = records.findIndex(r => r.id === record.id);
    
    if (existingIndex >= 0) {
      records[existingIndex] = {
        ...record,
        lastModified: new Date().toISOString()
      };
    } else {
      records.push(record);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  },

  // Delete record
  deleteRecord: (id: string): void => {
    const records = storageUtils.getAllRecords();
    const filtered = records.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Get records by category
  getRecordsByCategory: (category: StoredHealthRecord['category']): StoredHealthRecord[] => {
    const records = storageUtils.getAllRecords();
    return records.filter(r => r.category === category);
  },

  // Export all records to JSON
  exportToJSON: (): string => {
    const records = storageUtils.getAllRecords();
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      recordCount: records.length,
      records: records
    }, null, 2);
  },

  // Import records from JSON
  importFromJSON: (jsonString: string): { success: boolean; count: number; error?: string } => {
    try {
      const data = JSON.parse(jsonString);
      const records = data.records || data;
      
      if (!Array.isArray(records)) {
        return { success: false, count: 0, error: 'Invalid format' };
      }

      const existingRecords = storageUtils.getAllRecords();
      const newRecords = [...existingRecords];
      
      let importedCount = 0;
      records.forEach((record: StoredHealthRecord) => {
        const existingIndex = newRecords.findIndex(r => r.id === record.id);
        if (existingIndex >= 0) {
          newRecords[existingIndex] = record;
        } else {
          newRecords.push(record);
        }
        importedCount++;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
      return { success: true, count: importedCount };
    } catch (error) {
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  // Get storage stats
  getStorageStats: () => {
    const records = storageUtils.getAllRecords();
    const dataString = localStorage.getItem(STORAGE_KEY) || '';
    const sizeInBytes = new Blob([dataString]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    
    return {
      totalRecords: records.length,
      byCategory: {
        patient: records.filter(r => r.category === 'patient').length,
        medication: records.filter(r => r.category === 'medication').length,
        allergy: records.filter(r => r.category === 'allergy').length,
        immunization: records.filter(r => r.category === 'immunization').length,
        observation: records.filter(r => r.category === 'observation').length,
        document: records.filter(r => r.category === 'document').length,
      },
      storageSize: `${sizeInKB} KB`,
      sizeInBytes
    };
  },

  // Clear all records
  clearAllRecords: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Patient info
  getPatientInfo: () => {
    const data = localStorage.getItem(PATIENT_INFO_KEY);
    return data ? JSON.parse(data) : null;
  },

  savePatientInfo: (info: any) => {
    localStorage.setItem(PATIENT_INFO_KEY, JSON.stringify(info));
  }
};
