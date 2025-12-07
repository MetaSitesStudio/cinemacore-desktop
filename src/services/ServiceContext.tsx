import React, { createContext, useContext, useMemo } from 'react';
import { IMovieService, ISeriesService, IFileScannerService, ILibraryService } from './interfaces';
import { MockMovieService } from './mock/MockMovieService';
import { MockSeriesService } from './mock/MockSeriesService';
import { MockFileScannerService } from './mock/MockFileScannerService';
import { MockLibraryService } from './mock/MockLibraryService';
import { SQLiteLibraryService } from './electron/SQLiteLibraryService';
import { ElectronFileScannerService } from './electron/ElectronFileScannerService';
import { LibraryMovieService } from './electron/LibraryMovieService';
import { OmdbClient } from './omdb/OmdbClient';
import { MetadataService } from './metadata/MetadataService';
import { MetadataQueueService } from './metadata/MetadataQueueService';

interface ServiceContextType {
  movieService: IMovieService;
  seriesService: ISeriesService;
  fileScannerService: IFileScannerService;
  libraryService: ILibraryService;
  metadataService: MetadataService | null;
  metadataQueueService: MetadataQueueService | null;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const services = useMemo(() => {
    // Use Electron service if available, otherwise fallback to mock
    const fileScannerService = window.cinemacore 
      ? new ElectronFileScannerService() 
      : new MockFileScannerService();
      
    const libraryService = window.cinemacore?.db
      ? new SQLiteLibraryService()
      : new MockLibraryService();

    // In the future, we can switch this based on config
    const movieService = window.cinemacore?.db
      ? new LibraryMovieService(libraryService)
      : new MockMovieService();
      
    const seriesService = new MockSeriesService();
    
    // Initialize Metadata Service if API key exists
    const omdbKey = localStorage.getItem('cinemacore-omdb-api-key');
    let metadataService: MetadataService | null = null;
    let metadataQueueService: MetadataQueueService | null = null;
    
    if (omdbKey) {
      const omdbClient = new OmdbClient(omdbKey);
      metadataService = new MetadataService(omdbClient);
      metadataQueueService = new MetadataQueueService(metadataService, libraryService, {
        delayMs: 200,
        concurrency: 2
      });
    }

    return { 
      movieService, 
      seriesService,
      fileScannerService,
      libraryService,
      metadataService,
      metadataQueueService
    };
  }, []);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};
