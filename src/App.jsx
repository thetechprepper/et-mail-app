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

import { ConnectionView, EmailListTable } from "./components/mail";
import { NavButton } from "./components/navigation";
import { NWSForecastZonesListTable } from "./components/weather";

import { ToastContainer } from "@adobe/react-spectrum";

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
    WEATHER: "weather",
    COMPOSE: "compose",
    CONNECT: "connect"
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
	  <View backgroundColor="gray-100" padding="size-100" width="size-2000">
            <Flex direction="column" gap="size-200">

              <NavButton
                icon={<EmailOutline />}
                label="Mailboxes"
                view={VIEW.MAIL}
                activeView={activeView}
                setActiveView={setActiveView}
              />

              <NavButton
                icon={<AnnotatePen/>}
                label="Compose"
                view={VIEW.COMPOSE}
                activeView={activeView}
                setActiveView={setActiveView}
              />

              <NavButton
                icon={<CloudOutline/>}
                label="Weather"
                view={VIEW.WEATHER}
                activeView={activeView}
                setActiveView={setActiveView}
              />

              <NavButton
                icon={<EmailRefresh/>}
                label="Connect"
                view={VIEW.CONNECT}
                activeView={activeView}
                setActiveView={setActiveView}
              />
            </Flex>
          </View>
          {/* Sidebar End */}


          {/* Content Container overflow="hidden" */}
	  <View flexGrow={1}>

            {/* Mail Inboxes */}
	    {activeView === VIEW.MAIL && (
              <View padding="size-50">
                <EmailListTable />
              </View>
            )}
            {/* Mail Inboxes End */}

            {/* Weather Request */}
	    {activeView === VIEW.WEATHER && (
              <View padding="size-200">
                <Text>Request weather from the U.S. National Weather Service (NWS)</Text>
		<NWSForecastZonesListTable/>
              </View>
            )}
            {/* Weather Request End */}

            {/* Compose Mail */}
            {activeView === VIEW.COMPOSE && (
              <View padding="size-200">
                <Heading level={3}>Compose</Heading>
                <Text>Compose email view stub</Text>
              </View>
            )}
            {/* Compose Mail End */}

            {/* Connect */}
            {activeView === VIEW.CONNECT && (
              <View padding="size-200">
	        <ConnectionView />
              </View>
            )}
            {/* Connect End */}

          </View>

          {/* Content Container End */}

        </Flex>

      </Flex>
      <ToastContainer />
    </Provider>
  );
}

export default App;
