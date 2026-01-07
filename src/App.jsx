import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Divider,
  Dialog,
  DialogTrigger,
  Flex,
  Heading,
  Item,
  Picker,
  Provider,
  Tabs,
  TabList,
  TabPanels,
  TableView,
  TableHeader,
  Column,
  TableBody,
  Row,
  Cell,
  SearchField,
  Text,
  TextField,
  View,
  defaultTheme,
} from '@adobe/react-spectrum';
import AnnotatePen from '@spectrum-icons/workflow/AnnotatePen';
import CloudOutline from '@spectrum-icons/workflow/CloudOutline';
import EmailOutline from '@spectrum-icons/workflow/EmailOutline';
import EmailRefresh from '@spectrum-icons/workflow/EmailRefresh';
import Magnify from '@spectrum-icons/workflow/Magnify';
import Minimize from '@spectrum-icons/workflow/Minimize';
import Refresh from '@spectrum-icons/workflow/Refresh';
import ShowMenu from '@spectrum-icons/workflow/ShowMenu';
import { Map, Marker, ZoomControl } from 'pigeon-maps';
import { isValidLatLon } from './utils';
import { ADSB_SERVICE, AIRCRAFT_SERVICE, CALLSIGN_SERVICE, GEO_SERVICE, GRID_SERVICE, MAP_SERVICE, VOACAP_SERVICE } from './config';
import MyPosition from './MyPosition.jsx';
import { bearing, haversineDistance, maidenhead } from './utils/distance';

import { EmailListTable } from "./components/mail";

import './App.css';

function App() {
  const MIN_RELIABILITY = 90; // Minimum reliability threshold
  const FUTURE_HOURS = 24;    // Number of hours for "Later"

  const DEFAULT_ZOOM_REGION = 10; // Default zoom level for country-specific maps (i.e. US and CA).
  const DEFAULT_ZOOM_WORLD = 6;   // Default zoom level for world map.

  const [myPosition, setMyPosition] = useState([33.0, -112.0]);
  const [center, setCenter] = useState([33.0, -112.0]);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM_WORLD);

  const [useFallback, setUseFallback] = useState(false);
  const [tileBaseUrl, setTileBaseUrl] = useState(null);

  const VIEW = {
    MAIL: "mail",
    MAP_SEARCH: "map-search",
    WEATHER: "weather",
    NOTES: "notes"
  };

  const [activeView, setActiveView] = useState(VIEW.MAIL);


  // Callsign search state
  const [searchCallsign, setSearchCallsign] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Lat/Lon search state
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [latLonError, setLatLonError] = useState(null);
  const [latLonMarker, setLatLonMarker] = useState(null);

  // Maidenhead Grid Search
  const [gridInput, setGridInput] = useState('');
  const [gridError, setGridError] = useState(null);
  const [gridMarker, setGridMarker] = useState(null);
  const [isGridSearching, setIsGridSearching] = useState(false);

  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [voacapResults, setVoacapResults] = useState(null);
  const [voacapError, setVoacapError] = useState(null);

  // VOACAP input
  const [power, setPower] = useState("5"); // in watts
  const [mode, setMode] = useState("js8"); // radio mode

  const [MailBoxesOpen, setMailBoxesOpen] = useState(true);

  // Handle zoom level based on availability of offline regional vs world map
  const getDefaultZoom = () => 
    (tileBaseUrl?.includes('osm-world')) ? DEFAULT_ZOOM_WORLD : DEFAULT_ZOOM_REGION;

  const handleReset = () => {
    setSearchCallsign('');
    setSearchResult(null);
    setSearchError(null);

    setLatInput('');
    setLonInput('');
    setLatLonMarker(null);
    setLatLonError(null);

    setGridInput('');
    setGridMarker(null);
    setGridError(null);

    setVoacapResults(null);
    setVoacapError(null);
    setCenter([myPosition[0], myPosition[1]]);
    setZoom(getDefaultZoom());
  };

  // Load default location
  useEffect(() => {
    const fetchDefaultGrid = async () => {
      try {
        const response = await fetch(GEO_SERVICE);
        if (!response.ok) throw new Error('Failed to fetch default location');
        const data = await response.json();
        if (isValidLatLon(data)) {
          const { lat, lon } = data.position;
          setMyPosition([lat, lon]);
          setCenter([lat, lon]);
        }
      } catch (err) {
        console.warn('Could not load default location:', err);
      }
    };
    fetchDefaultGrid();
  }, []);

  // Load map tile service info
  useEffect(() => {
    async function fetchMapServices() {
      try {
        const response = await fetch(MAP_SERVICE);
        const services = await response.json();
        if (services.length > 0) {
          const url = services[0].url;
          setTileBaseUrl(url);
          setZoom(
            url?.includes('osm-world') ? DEFAULT_ZOOM_WORLD : DEFAULT_ZOOM_REGION
          );

        } else {
          setUseFallback(true);
          setZoom(DEFAULT_ZOOM_REGION);
        }
      } catch (err) {
        console.error('Failed to fetch map services:', err);
        setUseFallback(true);
      }
    }
    fetchMapServices();
  }, []);

  const mapTiler = useCallback(
    (x, y, z, dpr) => {
      if (useFallback) {
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      }
      if (!tileBaseUrl) return '';
      return `${tileBaseUrl}/tiles/${z}/${x}/${y}.png`;
    },
    [tileBaseUrl, useFallback]
  );

  // Handle callsign search
  const handleSearch = async () => {
    if (!searchCallsign) return;
    setSearchError(null);
    setIsSearching(true);
    setSearchResult(null);
    setLatLonError(null);
    setLatLonMarker(null);
    setGridMarker(null);
    setGridError(null);

    try {
      const response = await fetch(
        `${CALLSIGN_SERVICE}?callsign=${encodeURIComponent(searchCallsign)}`
      );
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const data = await response.json();

      if (data.lat && data.lon) {
        setSearchResult(data);
        setCenter([data.lat, data.lon]);
        setZoom(getDefaultZoom());
      } else {
        setSearchError('Callsign not found.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Callsign not found.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle lat/lon search
  const handleLatLonSearch = () => {
    setLatLonError(null);
    setSearchError(null);
    setSearchResult(null);
    setGridMarker(null);
    setGridError(null);

    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);

    if (isNaN(lat) || isNaN(lon)) {
      setLatLonError('Both latitude and longitude must be numbers.');
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setLatLonError('Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }

    const coords = [lat, lon];
    setLatLonMarker(coords);
    setCenter(coords);
    setZoom(getDefaultZoom());
  };

  // Determine target coordinates
  const getTargetCoords = () => {
    if (searchResult) return [searchResult.lat, searchResult.lon];
    if (latLonMarker) return latLonMarker;
    if (gridMarker) return gridMarker;
    return null;
  };

  // Helper: map frequency (MHz) to amateur radio band
  const freqToBand = (freq) => {
    const f = parseFloat(freq);
    if (f >= 3.5 && f < 4.0) return '80m';
    if (f >= 5.3 && f < 5.5) return '60m';
    if (f >= 7 && f < 7.3) return '40m';
    if (f >= 10.1 && f < 10.15) return '30m';
    if (f >= 14 && f < 14.35) return '20m';
    if (f >= 18.068 && f < 18.168) return '17m';
    if (f >= 21 && f < 21.45) return '15m';
    if (f >= 24.89 && f < 24.99) return '12m';
    if (f >= 28 && f < 29.7) return '10m';
    return `${f} MHz`;
  };

  const handlePredict = async () => {
    const target = getTargetCoords();
    if (!target) return;

    setIsPredicting(true);
    setVoacapError(null);
    setVoacapResults(null);

    try {

      const payload = {
        txLatLon: `${myPosition[0]},${myPosition[1]}`,
        rxLatLon: `${target[0]},${target[1]}`,
        power: parseInt(power),
        mode: mode,
      };

      const response = await fetch(VOACAP_SERVICE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Prediction failed: ${response.status}`);
      const data = await response.json(); // Expecting 24 entries

      const now = new Date();
      const nowHour = now.getUTCHours();
      const nowMinutes = now.getUTCMinutes();

      // "Now" predictions (filtered ≥ MIN_RELIABILITY)
      const currentHour = data[nowHour];
      const nowBands = Object.entries(currentHour.freqRel)
        .map(([freq, rel]) => ({
          freq: `${freq} MHz`,
          band: freqToBand(freq),
          reliability: Math.round(rel * 100),
        }))
        .filter(b => b.reliability >= MIN_RELIABILITY)
        .sort((a, b) => parseFloat(a.freq) - parseFloat(b.freq));

      // "Later" predictions (filtered ≥ MIN_RELIABILITY)
      const futureBands = [];
      const startHour = (nowMinutes === 0) ? (nowHour + 1) % 24 : (nowHour + 1) % 24;
      for (let i = 0; i < FUTURE_HOURS; i++) {
        const hourIndex = (startHour + i) % 24;
        const entry = data[hourIndex];
        Object.entries(entry.freqRel).forEach(([freq, rel]) => {
          const reliability = Math.round(rel * 100);
          if (reliability >= MIN_RELIABILITY) {
            futureBands.push({
              time: `${String(hourIndex).padStart(2, '0')}:00 UTC`,
              freq: `${freq} MHz`,
              band: freqToBand(freq),
              reliability,
            });
          }
        });
      }

      // Save filtered + raw
      setVoacapResults({
        now: nowBands,
        future: futureBands,
        raw: data // store raw 24-hour array for full table
      });

    } catch (err) {
      console.error(err);
      setVoacapError('Failed to get prediction.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleGridSearch = async () => {
    setGridError(null);
    setSearchError(null);
    setSearchResult(null);
    setLatLonMarker(null);

    const grid = gridInput.trim().toLowerCase();

    if (!grid || (grid.length !== 4 && grid.length !== 6)) {
      setGridError('Grid must be 4 or 6 characters.');
      return;
    }

    try {
      setIsGridSearching(true);

      const response = await fetch(
        `${GRID_SERVICE}?gridSquare=${encodeURIComponent(grid)}`
      );

      if (!response.ok) throw new Error(`Grid lookup failed: ${response.status}`);

      const data = await response.json();

      if (data?.position?.lat && data?.position?.lon) {
        const { lat, lon } = data.position;

        setGridMarker([lat, lon]);
        setCenter([lat, lon]);
        setZoom(getDefaultZoom());
      } else {
        setGridError('Grid not found.');
      }
    } catch (err) {
      console.error(err);
      setGridError('Grid not found.');
    } finally {
    setIsGridSearching(false);
    }
  };

  return (
    <Provider theme={defaultTheme}>
      <Flex direction="column" height="100vh">
        <Flex direction="row" flexGrow={1}>

          {/* Sidebar */}
          {activeView === VIEW.MAP_SEARCH && (
            <View backgroundColor="gray-100" padding="size-200" width="size-4600">
              <Flex direction="column" gap="size-200">
                <Flex direction="row" gap="size-200" alignItems="center">
                  <MyPosition setMyPosition={setMyPosition} setCenter={setCenter} showText={true} />
	          <ActionButton onPress={handleReset}>
		    <Refresh />
		    <Text>Reset</Text>
		  </ActionButton>
                </Flex>

                {/* Callsign Search */}
                <Flex direction="row" gap="size-200" alignItems="end">
                  <SearchField
                    label="Callsign Lookup"
                    placeholder="callsign"
                    value={searchCallsign}
                    onChange={setSearchCallsign}
                    onSubmit={handleSearch}
                    width="100%"
                  />
                  <Button variant="cta" onPress={handleSearch} isDisabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </Flex>

                {/* Lat/Lon Search */}
                <Flex direction="row" gap="size-200" alignItems="end">
                  <TextField label="Latitude" placeholder="33.45" value={latInput} onChange={setLatInput} width="50%" />
                  <TextField label="Longitude" placeholder="-111.93" value={lonInput} onChange={setLonInput} width="50%" />
                  <Button variant="cta" onPress={handleLatLonSearch}>Go</Button>
                </Flex>

                {/* Maidenhead Grid Search */}
                <Flex direction="row" gap="size-200" alignItems="end">
                  <TextField
                    label="Grid Square"
                    placeholder="DM32 or DM32UV"
                    value={gridInput}
                    onChange={setGridInput}
                    width="100%"
                  />
                  <Button variant="cta" onPress={handleGridSearch} isDisabled={isGridSearching} >
                   {isGridSearching ? 'Searching...' : 'Go'}
                  </Button>
                </Flex>

                {gridError && ( <Text UNSAFE_style={{ color: 'red' }}>{gridError}</Text>)}
                {latLonError && <Text UNSAFE_style={{ color: 'red' }}>{latLonError}</Text>}
                {searchError && <Text UNSAFE_style={{ color: 'red' }}>{searchError}</Text>}

                {/* Callsign Result */}
                {searchResult && (
                  <View backgroundColor="gray-200" padding="size-100" borderRadius="regular" marginTop="size-200">
                    <Text><b>{searchResult.firstName}</b> {searchResult.callsign}</Text>
                    <br />
                    <Text>Lat/Lon: {searchResult.lat.toFixed(4)}, {searchResult.lon.toFixed(4)}</Text>
                    <br />
                    <Text>{searchResult.city}, {searchResult.state} {searchResult.zip}</Text>
                    <br />
                    <Text>Grid: {searchResult.grid}</Text>
                    <br />
                    <Text>Distance: {searchResult.distance.toFixed(2)} mi</Text>
                    <br />
                    <Text>Bearing: {searchResult.bearing}°</Text>
                  </View>
                )}

                {/* Lat/Lon marker info */}
                {latLonMarker && (
                  <View backgroundColor="gray-200" padding="size-100" borderRadius="regular" marginTop="size-200">
                    <Text><b>Coordinates</b></Text>
                    <br />
                    <Text>Lat/Lon: {latInput}, {lonInput}</Text>
                    <br />
		    <Text>Grid: {maidenhead([parseFloat(latInput), parseFloat(lonInput)])}</Text>
                    <br />
                    <Text>Distance: {haversineDistance(myPosition, latLonMarker, 'mi').toFixed(2)} mi</Text>
                    <br />
                    <Text>Bearing: {bearing(myPosition, [parseFloat(latInput), parseFloat(lonInput)]).toFixed(1)}°</Text>
                  </View>
                )}

                {gridMarker && (
                  <View backgroundColor="gray-200" padding="size-100" borderRadius="regular" marginTop="size-200">
                    <Text><b>Grid Square</b></Text>
                    <br />
                    <Text>Lat/Lon: {gridMarker[0].toFixed(5)}, {gridMarker[1].toFixed(5)}</Text>
                    <br />
                    <Text>Grid: {gridInput.toUpperCase()}</Text>
                    <br />
                    <Text>Distance: {haversineDistance(myPosition, gridMarker, 'mi').toFixed(2)} mi</Text>
                    <br />
                    <Text>Bearing: {bearing(myPosition, gridMarker).toFixed(1)}°</Text>
                  </View>
                )}

                {/* Prediction parameters: power and mode */}
                {(searchResult || latLonMarker || gridMarker) && (
                  <Flex direction="row" gap="size-200" alignItems="end">
                    <Picker
                      label="Power (Watts)"
                      selectedKey={power}
                      onSelectionChange={setPower}
                      width="50%"
                    >
                      {["5","10","20","50","100","500","1500"].map((p) => (
                        <Item key={p}>{p}</Item>
                      ))}
                    </Picker>

                    <Picker
                      label="Mode"
                      selectedKey={mode}
                      onSelectionChange={setMode}
                      width="50%"
                    >
                      {["am","ardop","cw","js8","ssb", "vara-500", "vara-2300", "vara-2750"].map((m) => (
                        <Item key={m}>{m.toUpperCase()}</Item>
                      ))}
                    </Picker>
                  </Flex>
		)}

                {/* Predict Button + Modal */}
                {(searchResult || latLonMarker || gridMarker) && (
	
                  <DialogTrigger onOpenChange={handlePredict}>
                    <Button variant="cta" isDisabled={isPredicting}>
                      {isPredicting ? 'Predicting...' : 'Predict'}
                    </Button>
                    {(close) => (
                      <Dialog>
                        <Heading>HF Prediction</Heading>
                        <Divider />
                        <Content>
                          {voacapError && <Text color="negative">{voacapError}</Text>}
                          {!voacapResults && !voacapError && <Text>Running prediction...</Text>}
                          {voacapResults && (
                            <Tabs aria-label="VOACAP Results" defaultSelectedKey="now">
                              <TabList>
                                <Item key="now">Now</Item>
                                <Item key="later">Later</Item>
                                <Item key="plan24">24-hour Plan</Item>
                              </TabList>
                              <TabPanels>
                                <Item key="now">
                                  <TableView aria-label="Now Bands" width="100%">
                                    <TableHeader>
                                      <Column>Band</Column>
                                      <Column>Frequency</Column>
                                      <Column>Reliability</Column>
                                    </TableHeader>
                                    <TableBody>
                                      {voacapResults.now.map((band) => (
                                        <Row key={band.freq}>
                                          <Cell>{band.band}</Cell>
                                          <Cell>{band.freq}</Cell>
                                          <Cell>{band.reliability}%</Cell>
                                        </Row>
                                      ))}
                                    </TableBody>
                                  </TableView>
                                </Item>

                                <Item key="later">
                                  <Flex direction="column" gap="size-100">
                                    {(() => {
                                      const hourGroups = {};
                                      voacapResults.future.forEach((entry) => {
                                        const hour = parseInt(entry.time.split(':')[0], 10);
                                        if (!hourGroups[hour]) hourGroups[hour] = [];
                                        hourGroups[hour].push(entry);
                                      });

                                      // Determine the starting hour (next UTC hour)
                                      const nowUTC = new Date();
                                      const nextHour = (nowUTC.getUTCHours() + 1) % 24;

                                      // Rotate hours starting from nextHour
                                      const sortedHours = [];
                                      for (let i = 0; i < 24; i++) {
                                        const hour = (nextHour + i) % 24;
                                        if (hourGroups[hour]) {
                                          sortedHours.push(hour);
                                        }
                                      }

                                      return sortedHours.map((hour, idx) => {
                                        const entries = hourGroups[hour];
                                        return (
                                          <View
                                            key={hour}
                                            padding="size-200"
                                            marginBottom="size-100"
                                            borderRadius="regular"
                                            borderWidth="thin"
                                            borderColor="default"
                                            shadow="regular"
                                            UNSAFE_style={{
                                              background: idx % 2 === 0
                                                ? 'linear-gradient(145deg, #fafafa, #e5e5e5)'
                                                : 'linear-gradient(145deg, #ebf5ff, #d0e5ff)',
                                            }}
                                          >
                                            <Text><b>{String(hour).padStart(2, '0')}:00 UTC</b></Text>

                                            <Flex direction="column" gap="size-100" marginTop="size-100">
                                              {entries.map((e, i) => (
                                                <Flex
                                                  key={i}
                                                  direction="row"
                                                  justifyContent="space-between"
                                                  paddingY="size-50"
                                                  paddingX="size-100"
                                                  backgroundColor="#ffffff"
                                                  borderRadius="regular"
                                                  shadow="small"
                                                >
                                                  <Text>{e.band}</Text>
                                                  <Text>{e.freq}</Text>
                                                  <Text>{e.reliability}%</Text>
                                                </Flex>
                                              ))}
                                            </Flex>
                                          </View>
                                        );
                                      });
                                    })()}
                                  </Flex>
                                </Item>

                                <Item key="plan24">
                                  {voacapResults?.raw && (
                                    (() => {
                                      const allBands = ['80m','60m','40m','30m','20m','17m','15m','12m','10m'];

                                      const hourRows = [];
                                      for (let hour = 0; hour < 24; hour++) {
                                        const row = { time: `${String(hour).padStart(2, '0')}:00 UTC` };
                                        allBands.forEach(b => { row[b] = ''; });

                                        const hourData = voacapResults.raw[hour];
                                        if (hourData) {
                                          Object.entries(hourData.freqRel).forEach(([freq, rel]) => {
                                            const band = freqToBand(freq);
                                            if (band && allBands.includes(band)) {
                                              row[band] = Math.round(rel * 100); // store as number
                                            }
                                          });
                                        }

                                        hourRows.push(row);
                                      }

                                      const getColor = (pct) => {
                                        if (pct === '' || pct == null) return '#ffffff';
                                        if (pct >= 90) return '#4caf50'; // green
                                        if (pct >= 70) return '#ffeb3b'; // yellow
                                        if (pct >= 50) return '#ff9800'; // orange
                                        return '#f44336'; // red
                                      };

                                      const currentHourUTC = new Date().getUTCHours();

                                      return (
                                        <div style={{ overflowX: 'auto', marginTop: 10 }}>
                                          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                            <thead>
                                              <tr>
                                                <th style={{ border: '1px solid #ccc', padding: '4px', background: '#f0f0f0' }}>Time (UTC)</th>
                                                {allBands.map(b => (
                                                  <th key={b} style={{ border: '1px solid #ccc', padding: '4px', background: '#f0f0f0' }}>{b}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {hourRows.map((r, idx) => {
                                                const isCurrentHour = parseInt(r.time.split(':')[0], 10) === currentHourUTC;

                                                // Repeat header every 6 rows
                                                const showRepeatHeader = idx > 0 && idx % 6 === 0;

                                                return (
                                                  <>
                                                    {showRepeatHeader && (
                                                      <tr key={`repeat-${idx}`}>
                                                        <th style={{ border: '1px solid #ccc', padding: '4px', background: '#f0f0f0' }}>Time (UTC)</th>
                                                        {allBands.map(b => (
                                                          <th key={`repeat-${idx}-${b}`} style={{ border: '1px solid #ccc', padding: '4px', background: '#f0f0f0' }}>{b}</th>
                                                        ))}
                                                      </tr>
                                                    )}

                                                    <tr key={idx}>
                                                      <td
                                                        style={{
                                                          border: '1px solid #ccc',
                                                          padding: '4px',
                                                          backgroundColor: isCurrentHour ? '#2196f3' : '#ffffff',
                                                          color: isCurrentHour ? '#ffffff' : '#000000',
                                                          fontWeight: isCurrentHour ? 'bold' : 'normal'
                                                        }}
                                                      >
                                                        {r.time}
                                                      </td>
                                                      {allBands.map(b => {
                                                        const pct = r[b];
                                                        return (
                                                          <td
                                                            key={b}
                                                            style={{
                                                              border: '1px solid #ccc',
                                                              padding: '4px',
                                                              textAlign: 'center',
                                                              backgroundColor: getColor(pct)
                                                            }}
                                                          >
                                                            {pct !== '' ? `${pct}%` : ''}
                                                          </td>
                                                        );
                                                      })}
                                                    </tr>
                                                  </>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      );
                                    })()
                                  )}
                                </Item>

                              </TabPanels>
                            </Tabs>
                          )}
                        </Content>
                        <ButtonGroup>
                          <Button variant="secondary" onPress={close}>Close</Button>
                        </ButtonGroup>
                      </Dialog>
                    )}
                  </DialogTrigger>
                )}
              </Flex>
            </View>
          )}

          {/* Sidebar */}
	  <View backgroundColor="gray-100" padding="size-100" width="size-800">
            <Flex direction="column" gap="size-200">
              <ActionButton
                isQuiet
                onPress={() => setActiveView(VIEW.MAIL)}
                aria-label="Mail"
              >
                <EmailOutline />
              </ActionButton>

              <ActionButton
                isQuiet
                onPress={() => setActiveView(VIEW.NOTES)}
                aria-label="Notes"
              >
                <AnnotatePen />
              </ActionButton>

              <ActionButton
                isQuiet
                onPress={() => setActiveView(VIEW.MAP_SEARCH)}
                aria-label="Search / Map"
              >
                <Magnify />
              </ActionButton>

              <ActionButton
                isQuiet
                onPress={() => setActiveView(VIEW.WEATHER)}
                aria-label="Weather"
              >
                <CloudOutline />
              </ActionButton>

              <ActionButton isQuiet aria-label="Refresh">
                <EmailRefresh />
              </ActionButton>
            </Flex>
          </View>
          {/* Sidebar End */}


          {/* Content Container */}
	  <View flexGrow={1} overflow="hidden">

            {/* Mail Inboxes */}
	    {activeView === VIEW.MAIL && (
              <View padding="size-200">
                <Heading level={3}>Inbox</Heading>
                <EmailListTable />
              </View>
            )}
            {/* Mail Inboxes End */}


            {/* Map End */}
	    {activeView === VIEW.MAP_SEARCH && (
              <>
                <View backgroundColor="gray-200" borderWidth="thin" borderColor="dark" padding="size-50">
                  <Text>Your Position: 33.5123,-112.7865</Text>
                </View>

                <Map
                  attributionPrefix="The Tech Prepper | Pigeon Maps"
                  provider={mapTiler}
                  height="100%"
                  center={center}
                  zoom={zoom}
                  minZoom={2}
                  maxZoom={11}
                  onBoundsChanged={({ center, zoom }) => {
                    setCenter(center);
                    setZoom(zoom);
                  }}
                >
                  <ZoomControl />
                  <Marker anchor={myPosition} />
                  {searchResult && (
                    <Marker
                      anchor={[searchResult.lat, searchResult.lon]}
                      payload={searchResult.callsign}
                      color="#e03e3e"
                    />
                  )}
                  {latLonMarker && <Marker anchor={latLonMarker} color="#007aff" />}
  
                  {gridMarker && <Marker anchor={gridMarker} color="#007aff" />}
                </Map>
              </>
            )}
            {/* Map End */}

	    {activeView === VIEW.WEATHER && (
              <View padding="size-200">
                <Heading level={3}>Weather</Heading>
                <Text>Weather view stub</Text>
              </View>
            )}

            {activeView === VIEW.NOTES && (
              <View padding="size-200">
                <Heading level={3}>Notes</Heading>
                <Text>Notes view stub</Text>
              </View>
            )}

          </View>

          {/* Content Container End */}

        </Flex>

      </Flex>
    </Provider>
  );
}

export default App;
