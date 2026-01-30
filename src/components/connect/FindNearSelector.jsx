import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Cell,
  Column,
  Flex,
  Item,
  Picker,
  TableBody,
  TableHeader,
  TableView,
  Row,
  Text,
  TextField,
  View
} from "@adobe/react-spectrum";

export default function FindNearSelector({
  results,
  onPick
}) {
  // "results" is expected to be an array of station-like objects.
  // For now this is a stub. You will tell me later how these are loaded
  // and what "near" inputs you want (GPS, grid, radius, etc.).

  const [selectedUri, setSelectedUri] = useState(null);

  const selectedKeys = selectedUri ? new Set([selectedUri]) : new Set();

  const handleSelectionChange = (keys) => {
    if (keys === "all") return;
    const first = keys && keys.size ? Array.from(keys)[0] : null;
    setSelectedUri(first || null);
  };

  const selectedStation =
    selectedUri ? (results || []).find((s) => s.uri === selectedUri) : null;

  const defaultNear = useMemo(
    () => ({
      lat: "",
      lon: "",
      gridSquare: "",
      callsign: "",
      modeFilter: "",
      bandFilter: "",
      power: "5"
    }),
    []
  );

  const [near, setNear] = useState(defaultNear);

  const [apiResults, setApiResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => {
    return (results && results.length ? results : apiResults) || [];
  }, [results, apiResults]);

  const [reliabilityByUri, setReliabilityByUri] = useState({});

  // IMPORTANT: materialize reliability onto items so TableView re-renders cells
  const itemsWithReliability = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.map((it) => {
      const uri = it && it.uri ? String(it.uri) : "";
      const reliability = uri && reliabilityByUri
        ? (reliabilityByUri[uri] || "")
        : "";
      return {
        ...it,
        reliability
      };
    });
  }, [items, reliabilityByUri]);

  const selectedStationFromItems =
    selectedUri ? (items || []).find((s) => s.uri === selectedUri) : null;

  useEffect(() => {
    let cancelled = false;

    async function loadPosition() {
      try {
        const res = await fetch("http://localhost:1981/api/geo/position");
        if (!res.ok) return;

        const data = await safeJson(res);

        if (
          data &&
          data.ready === true &&
          data.position &&
          typeof data.position.lat === "number" &&
          typeof data.position.lon === "number"
        ) {
          if (!cancelled) {
            setNear((prev) => ({
              ...prev,
              lat: String(data.position.lat),
              lon: String(data.position.lon),
              gridSquare: data.position.gridSquare
                ? String(data.position.gridSquare)
                : prev.gridSquare
            }));
          }
        }
      } catch (e) {
        // silently ignore; user can still enter manually
      }
    }

    loadPosition();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runPredictions() {
      const latStr = String(near.lat || "").trim();
      const lonStr = String(near.lon || "").trim();

      if (!latStr || !lonStr || !Array.isArray(items) || items.length === 0) {
        setReliabilityByUri({});
        return;
      }

      const txLatLon = `${latStr},${lonStr}`;

      const next = {};

      for (const item of items) {
        if (cancelled) return;

        const uri = item && item.uri ? String(item.uri) : "";
        if (!uri) continue;

        const rxLatRaw =
          item && item.lat !== undefined
            ? item.lat
            : (item && item.latitude !== undefined ? item.latitude : "");
        const rxLonRaw =
          item && item.lon !== undefined
            ? item.lon
            : (item && item.longitude !== undefined ? item.longitude : "");

        const rxLat =
          typeof rxLatRaw === "number"
            ? rxLatRaw
            : parseFloat(String(rxLatRaw).trim());
        const rxLon =
          typeof rxLonRaw === "number"
            ? rxLonRaw
            : parseFloat(String(rxLonRaw).trim());

        if (!Number.isFinite(rxLat) || !Number.isFinite(rxLon)) {
          next[uri] = "";
          setReliabilityByUri({ ...next });
          continue;
        }

        const rxLatLon = `${rxLat},${rxLon}`;

        const frequency =
          item && typeof item.frequency === "number" ? item.frequency : null;

        const rel = await getPredictionForNow({
          txLatLon,
          rxLatLon,
          power: 5,
          mode: "vara-2300",
          frequency
        });

        next[uri] = rel;
        setReliabilityByUri({ ...next });
      }
    }

    runPredictions();

    return () => {
      cancelled = true;
    };
  }, [items, near.lat, near.lon]);

  const handleSearch = async () => {
    const lat = String(near.lat || "").trim();
    const lon = String(near.lon || "").trim();

    if (!lat || !lon) {
      setError("Latitude and longitude are required.");
      return;
    }

    setIsSearching(true);
    setError("");

    try {
      const url = buildNearUrl(lat, lon, near);

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }

      const data = await safeJson(res);

      if (!Array.isArray(data)) {
        setApiResults([]);
        setError("Unexpected response from server.");
        return;
      }

      const mapped = data.map(mapNearResultToStation);
      setApiResults(mapped);

      if (mapped.length === 0) {
        setSelectedUri(null);
      }
    } catch (err) {
      setApiResults([]);
      setSelectedUri(null);
      setError(err && err.message ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchByGrid = async () => {
    const grid = String(near.gridSquare || "").trim().toLowerCase();

    if (!(grid.length === 4 || grid.length === 6)) {
      setError("Grid square must be 4 or 6 characters.");
      return;
    }

    setIsSearching(true);
    setError("");

    try {
      const url =
        `http://localhost:1981/api/geo/grid?gridSquare=${encodeURIComponent(grid)}`;

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(`Grid lookup failed: ${res.status}`);
      }

      const data = await safeJson(res);

      if (
        !data ||
        !data.position ||
        typeof data.position.lat !== "number" ||
        typeof data.position.lon !== "number"
      ) {
        setError("Unexpected response from server.");
        return;
      }

      const lat = String(data.position.lat);
      const lon = String(data.position.lon);

      setNear((prev) => ({
        ...prev,
        lat,
        lon
      }));

      const url2 = buildNearUrl(lat, lon, near);

      const res2 = await fetch(url2, { method: "GET" });
      if (!res2.ok) {
        throw new Error(`Search failed: ${res2.status}`);
      }

      const data2 = await safeJson(res2);

      if (!Array.isArray(data2)) {
        setApiResults([]);
        setError("Unexpected response from server.");
        return;
      }

      const mapped = data2.map(mapNearResultToStation);
      setApiResults(mapped);

      if (mapped.length === 0) {
        setSelectedUri(null);
      }
    } catch (err) {
      setApiResults([]);
      setSelectedUri(null);
      setError(err && err.message ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchByCallsign = async () => {
    const callsign = String(near.callsign || "").trim().toLowerCase();

    if (!callsign) {
      setError("Callsign is required.");
      return;
    }

    setIsSearching(true);
    setError("");

    try {
      const url =
        `http://localhost:1981/api/license?callsign=${encodeURIComponent(callsign)}`;

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(`Callsign lookup failed: ${res.status}`);
      }

      const data = await safeJson(res);

      if (
        !data ||
        typeof data.lat !== "number" ||
        typeof data.lon !== "number"
      ) {
        setError("Unexpected response from server.");
        return;
      }

      const lat = String(data.lat);
      const lon = String(data.lon);

      setNear((prev) => ({
        ...prev,
        lat,
        lon,
        gridSquare: data.grid ? String(data.grid) : prev.gridSquare
      }));

      const url2 = buildNearUrl(lat, lon, near);

      const res2 = await fetch(url2, { method: "GET" });
      if (!res2.ok) {
        throw new Error(`Search failed: ${res2.status}`);
      }

      const data2 = await safeJson(res2);

      if (!Array.isArray(data2)) {
        setApiResults([]);
        setError("Unexpected response from server.");
        return;
      }

      const mapped = data2.map(mapNearResultToStation);
      setApiResults(mapped);

      if (mapped.length === 0) {
        setSelectedUri(null);
      }
    } catch (err) {
      setApiResults([]);
      setSelectedUri(null);
      setError(err && err.message ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View>
        <View marginTop="size-200">
          <Flex direction="row" gap="size-200" alignItems="end">
            <Picker
              label="Mode"
              selectedKey={near.modeFilter || "all"}
              onSelectionChange={(key) =>
                setNear((prev) => ({
                  ...prev,
                  modeFilter: String(key) === "all" ? "" : String(key)
                }))
              }
              width="size-2000"
            >
              <Item key="all">All</Item>
              <Item key="ardop">ardop</Item>
              <Item key="vara">vara</Item>
              <Item key="packet">packet</Item>
            </Picker>

            <Picker
              label="Band"
              selectedKey={near.bandFilter || "all"}
              onSelectionChange={(key) =>
                setNear((prev) => ({
                  ...prev,
                  bandFilter: String(key) === "all" ? "" : String(key)
                }))
              }
              width="size-2000"
            >
              <Item key="all">All</Item>
              <Item key="70cm">70cm</Item>
              <Item key="2m">2m</Item>
              <Item key="6m">6m</Item>
              <Item key="10m">10m</Item>
              <Item key="12m">12m</Item>
              <Item key="15m">15m</Item>
              <Item key="17m">17m</Item>
              <Item key="20m">20m</Item>
              <Item key="30m">30m</Item>
              <Item key="40m">40m</Item>
              <Item key="80m">80m</Item>
              <Item key="160m">160m</Item>
            </Picker>

            <Picker
              label="Power"
              selectedKey={near.power || "5"}
              onSelectionChange={(key) =>
                setNear((prev) => ({
                  ...prev,
                  power: String(key)
                }))
              }
              width="size-2000"
            >
              <Item key="5">5</Item>
              <Item key="10">10</Item>
              <Item key="20">20</Item>
              <Item key="50">50</Item>
              <Item key="100">100</Item>
              <Item key="500">500</Item>
              <Item key="1500">1500</Item>
            </Picker>
          </Flex>
        </View>

      <View marginTop="size-200">
        <Flex direction="row" gap="size-200" alignItems="end">
          <TextField
            label="Latitude"
            value={String(near.lat)}
            onChange={(v) => setNear((prev) => ({ ...prev, lat: v }))}
            width="size-2000"
          />

          <TextField
            label="Longitude"
            value={String(near.lon)}
            onChange={(v) => setNear((prev) => ({ ...prev, lon: v }))}
            width="size-2000"
          />

          <Button
            variant="primary"
            onPress={handleSearch}
            isDisabled={isSearching}
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </Flex>

        <View marginTop="size-200">
          <Flex direction="row" gap="size-200" alignItems="end">
            <TextField
              label="Grid square"
              value={String(near.gridSquare)}
              onChange={(v) =>
                setNear((prev) => ({ ...prev, gridSquare: v }))
              }
              width="size-2000"
              placeholder="DM33 or DM33xv"
            />

            <Button
              variant="primary"
              onPress={handleSearchByGrid}
              isDisabled={isSearching}
            >
              {isSearching ? "Searching..." : "Search by grid"}
            </Button>
          </Flex>
        </View>

        <View marginTop="size-200">
          <Flex direction="row" gap="size-200" alignItems="end">
            <TextField
              label="Callsign"
              value={String(near.callsign)}
              onChange={(v) => setNear((prev) => ({ ...prev, callsign: v }))}
              width="size-2000"
              placeholder="KT7RUN"
            />

            <Button
              variant="primary"
              onPress={handleSearchByCallsign}
              isDisabled={isSearching}
            >
              {isSearching ? "Searching..." : "Search by callsign"}
            </Button>
          </Flex>
        </View>


        {error && (
          <View marginTop="size-150">
            <Text>{error}</Text>
          </View>
        )}
      </View>

      <View marginTop="size-200">
        <TableView
          aria-label="Nearby stations"
          selectionMode="single"
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange}
          isQuiet
          width="100%"
        >
          <TableHeader>
            <Column key="name">Name</Column>
            <Column key="transport">Transport</Column>
            <Column key="bandwidth">Bandwidth</Column>
            <Column key="target">Target</Column>
            <Column key="frequency">Frequency</Column>
            <Column key="reliability">Reliability</Column>
          </TableHeader>

          <TableBody items={itemsWithReliability || []}>
            {(item) => (
              <Row key={item.uri}>
                <Cell>{item.name || ""}</Cell>
                <Cell>{item.transport || ""}</Cell>
                <Cell>{item.bandwidth || ""}</Cell>
                <Cell>{item.target || ""}</Cell>
                <Cell>{formatFrequencyMHz(item.frequency)}</Cell>
                <Cell>{item.reliability || ""}</Cell>
              </Row>
            )}
          </TableBody>
        </TableView>
      </View>

      <View marginTop="size-200">
        <Flex direction="row" gap="size-200" alignItems="center">
          <Button
            variant="cta"
            onPress={() =>
              selectedStationFromItems && onPick(selectedStationFromItems)
            }
            isDisabled={!selectedStationFromItems}
          >
            Use selected
          </Button>

          {selectedStationFromItems && (
            <Text>Current selection: {selectedStationFromItems.uri}</Text>
          )}
        </Flex>
      </View>
    </View>
  );
}

function buildNearUrl(lat, lon, near) {
  let url =
    `http://localhost:1981/api/winlink/near?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}`;

  const mode = near && near.modeFilter ? String(near.modeFilter).trim() : "";
  const band = near && near.bandFilter ? String(near.bandFilter).trim() : "";

  if (mode) {
    url += `&mode=${encodeURIComponent(mode)}`;
  }

  if (band) {
    url += `&band=${encodeURIComponent(band)}`;
  }

  return url;
}

function mapNearResultToStation(r) {
  const callsign = r && r.callsign ? String(r.callsign) : "";
  const mode = r && r.mode ? String(r.mode) : "";
  const modeCode = r && typeof r.modeCode === "number" ? r.modeCode : 0;
  const freq = r && typeof r.freq === "number" ? r.freq : 0;
  const band = r && r.band ? String(r.band) : "";

  const transport = mapModeToTransport(mode);
  const bandwidth = mapModeToBandwidth(mode);

  const uri = buildStationUri({
    transport,
    callsign,
    bandwidth,
    modeCode,
    freq
  });

  return {
    name: [callsign, mode, band].filter(Boolean).join(" - "),
    transport,
    bandwidth,
    target: callsign,
    frequency: freq,
    uri,
    address: "",
    lat: r && typeof r.lat === "number" ? r.lat : (r && typeof r.latitude === "number" ? r.latitude : undefined),
    lon: r && typeof r.lon === "number" ? r.lon : (r && typeof r.longitude === "number" ? r.longitude : undefined)
  };
}

function mapModeToTransport(mode) {
  const m = (mode || "").toLowerCase();

  if (m.includes("vara fm")) return "varafm";
  if (m.includes("packet")) return "ax25";
  if (m.includes("ardop")) return "ardop";
  if (m.includes("vara")) return "varahf";

  return "";
}

function mapModeToBandwidth(mode) {
  const m = (mode || "").toUpperCase();

  // Examples: "ARDOP 2000", "ARDOP 500", "VARA 2750", "VARA 500", "VARA FM WIDE"
  if (m.startsWith("ARDOP ")) {
    return m.replace("ARDOP ", "").trim();
  }

  if (m.startsWith("VARA FM")) {
    return "";
  }

  if (m.startsWith("VARA ")) {
    return m.replace("VARA ", "").trim();
  }

  return "";
}

function buildStationUri({
  transport,
  callsign,
  bandwidth,
  modeCode,
  freq
}) {
  const t = transport || "";
  const c = callsign || "";
  const bw = bandwidth || "";
  const mc = typeof modeCode === "number" ? modeCode : 0;
  const f = typeof freq === "number" ? freq : 0;

  if (!t || !c) return "";

  if (bw) {
    return `${t}:///${c}?bw=${encodeURIComponent(bw)}&f=${f}`;
  }

  return `${t}:///${c}?f=${f}`;
}

function formatFrequencyMHz(freqHz) {
  if (!freqHz || typeof freqHz !== "number") {
    return "";
  }
  return `${(freqHz / 1000000).toFixed(5)} MHz`;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return {};
  }
}

function parsePredictionForNow(voacapResponse, frequency) {
  try {
    if (!Array.isArray(voacapResponse) || voacapResponse.length < 24) {
      return "";
    }

    const fNum =
      typeof frequency === "number"
        ? frequency
        : parseFloat(String(frequency || "").trim());

    if (!Number.isFinite(fNum) || fNum <= 0) return "";

    // Accept either Hz (eg 10144000) or MHz (eg 10.144).
    const freqMHz = fNum > 1000 ? (fNum / 1000000.0) : fNum;

    const utcHour = new Date().getUTCHours(); // 0..23
    const hourObj = voacapResponse[utcHour];
    if (!hourObj || typeof hourObj !== "object") return "";

    const freqRel = hourObj.freqRel;
    if (!freqRel || typeof freqRel !== "object") return "";

    const keys = Object.keys(freqRel);
    if (!keys.length) return "";

    let bestKey = "";
    let bestDelta = Infinity;

    for (const k of keys) {
      const kMHz = parseFloat(k);
      if (!Number.isFinite(kMHz)) continue;

      const delta = Math.abs(kMHz - freqMHz);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestKey = k;
      }
    }

    if (!bestKey) return "";

    const rel = freqRel[bestKey];
    if (typeof rel !== "number" || !Number.isFinite(rel)) return "";

    let pct;

    if (rel >= 0 && rel <= 1) {
      pct = Math.round(rel * 100);
    } else if (rel >= 0 && rel <= 100) {
      pct = Math.round(rel);
    } else {
      return "";
    }

    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;

    return `${pct}%`;
  } catch (e) {
    return "";
  }
}

async function getPredictionForNow({
  txLatLon,
  rxLatLon,
  power,
  mode,
  frequency
}) {
  try {
    const res = await fetch("http://localhost:1981/api/voacap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        txLatLon,
        rxLatLon,
        power,
        mode
      })
    });

    if (!res.ok) {
      return "";
    }

    const data = await safeJson(res);
    return parsePredictionForNow(data, frequency);
  } catch (e) {
    return "";
  }
}
