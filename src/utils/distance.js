// utils/distance.js

export const haversineDistance = (coord1, coord2, unit = 'km') => {
  const toRad = (deg) => deg * (Math.PI / 180);

  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = unit === 'mi' ? 3958.8 : 6371; // Radius in miles or km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const bearing = (from, to) => {
    const toRadians = (deg) => deg * (Math.PI / 180);
    const toDegrees = (rad) => rad * (180 / Math.PI);

    const lat1 = parseFloat(from[0]);
    const lon1 = parseFloat(from[1]);
    const lat2 = parseFloat(to[0]);
    const lon2 = parseFloat(to[1]);

    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    const deltaLonRad = toRadians(lon2 - lon1);

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    let theta = Math.atan2(y, x);
    theta = toDegrees(theta);
    return (theta + 360) % 360; // normalize to 0–360 degrees
};

export const maidenhead = ([lat, lon]) => {
  const UPPER_A = 65; // ASCII 'A'
  const LOWER_A = 97; // ASCII 'a'

  const adjLat = lat + 90;
  const adjLon = lon + 180;

  // Field (first two letters)
  const fieldLon = Math.floor(adjLon / 20);
  const fieldLat = Math.floor(adjLat / 10);

  // Square (digits)
  const squareLon = Math.floor((adjLon % 20) / 2);
  const squareLat = Math.floor(adjLat % 10);

  // Subsquare (letters a-x)
  const subsquareLon = Math.floor(((adjLon % 2) * 12));
  const subsquareLat = Math.floor(((adjLat % 1) * 24));

  const grid =
    String.fromCharCode(UPPER_A + fieldLon) +
    String.fromCharCode(UPPER_A + fieldLat) +
    squareLon +
    squareLat +
    String.fromCharCode(LOWER_A + subsquareLon) +
    String.fromCharCode(LOWER_A + subsquareLat);

  return grid;
};
