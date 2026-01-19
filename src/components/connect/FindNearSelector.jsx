import React, { useMemo, useState } from "react";
import {
  Button,
  Cell,
  Column,
  Flex,
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
      lon: ""
    }),
    []
  );

  const [near, setNear] = useState(defaultNear);

  const [apiResults, setApiResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const items = (results && results.length ? results : apiResults) || [];

  const selectedStationFromItems =
    selectedUri ? (items || []).find((s) => s.uri === selectedUri) : null;

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
      const url =
        `http://localhost:1981/api/winlink/near?lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lon)}`;

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

  return (
    <View>
      <Text>Select a station near a latitude and longitude.</Text>

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

          <Button variant="primary" onPress={handleSearch} isDisabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </Flex>

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
          </TableHeader>

          <TableBody items={items || []}>
            {(item) => (
              <Row key={item.uri}>
                <Cell>{item.name || ""}</Cell>
                <Cell>{item.transport || ""}</Cell>
                <Cell>{item.bandwidth || ""}</Cell>
                <Cell>{item.target || ""}</Cell>
                <Cell>{formatFrequencyMHz(item.frequency)}</Cell>
              </Row>
            )}
          </TableBody>
        </TableView>
      </View>

      <View marginTop="size-200">
        <Flex direction="row" gap="size-200" alignItems="center">
          <Button
            variant="cta"
            onPress={() => selectedStationFromItems && onPick(selectedStationFromItems)}
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
    address: ""
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
