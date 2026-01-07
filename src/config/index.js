// Hosts
export const API_HOST  = import.meta.env.VITE_API_HOST  || 'http://localhost:1981';
export const DATA_HOST = import.meta.env.VITE_DATA_HOST || 'http://localhost:1090';
export const MAP_HOST  = import.meta.env.VITE_MAP_HOST  || 'http://localhost:1982';

// Endpoints
export const ADSB_SERVICE = `${DATA_HOST}/data.json`;
export const AIRCRAFT_SERVICE = `${API_HOST}/api/aircraft`;
export const CALLSIGN_SERVICE = `${API_HOST}/api/license`;
export const GEO_SERVICE = `${API_HOST}/api/geo/position`;
export const GRID_SERVICE = `${API_HOST}/api/geo/grid`;
export const VOACAP_SERVICE = `${API_HOST}/api/voacap`;
export const MAP_SERVICE = `${MAP_HOST}/services`;
